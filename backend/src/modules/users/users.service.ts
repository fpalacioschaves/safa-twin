import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';
import { hashPassword } from '../../security/password.js';

import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from './users.schemas.js';

const userDetailSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,

  userRoles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type UserDetailRecord =
  Prisma.UserGetPayload<{
    select: typeof userDetailSelect;
  }>;

export class UserEmailAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un usuario con ese correo electrónico.',
    );

    this.name =
      'UserEmailAlreadyExistsError';
  }
}

export class UserRolesNotFoundError
  extends Error {
  public readonly missingRoleIds: number[];

  public constructor(
    missingRoleIds: number[],
  ) {
    super(
      'Uno o varios de los roles seleccionados no existen.',
    );

    this.name =
      'UserRolesNotFoundError';

    this.missingRoleIds =
      missingRoleIds;
  }
}

export class UserNotFoundError
  extends Error {
  public constructor() {
    super(
      'El usuario solicitado no existe.',
    );

    this.name =
      'UserNotFoundError';
  }
}

export class UserArchivedError
  extends Error {
  public constructor() {
    super(
      'El usuario está archivado y no puede modificarse.',
    );

    this.name =
      'UserArchivedError';
  }
}

export class UserAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'El usuario ya está archivado.',
    );

    this.name =
      'UserAlreadyArchivedError';
  }
}

export class UserNotArchivedError
  extends Error {
  public constructor() {
    super(
      'El usuario no está archivado.',
    );

    this.name =
      'UserNotArchivedError';
  }
}

export class CannotModifyOwnRolesError
  extends Error {
  public constructor() {
    super(
      'No puedes modificar tus propios roles desde la administración de usuarios.',
    );

    this.name =
      'CannotModifyOwnRolesError';
  }
}

export class CannotResetOwnPasswordError
  extends Error {
  public constructor() {
    super(
      'No puedes restablecer tu propia contraseña desde la administración de usuarios.',
    );

    this.name =
      'CannotResetOwnPasswordError';
  }
}

export class CannotDeactivateOwnUserError
  extends Error {
  public constructor() {
    super(
      'No puedes desactivar tu propio usuario.',
    );

    this.name =
      'CannotDeactivateOwnUserError';
  }
}

export class CannotArchiveOwnUserError
  extends Error {
  public constructor() {
    super(
      'No puedes archivar tu propio usuario.',
    );

    this.name =
      'CannotArchiveOwnUserError';
  }
}

export class CannotRemoveLastAdministratorError
  extends Error {
  public constructor() {
    super(
      'La operación dejaría el sistema sin ningún administrador activo.',
    );

    this.name =
      'CannotRemoveLastAdministratorError';
  }
}

function isPrismaUniqueConstraintError(
  error: unknown,
): boolean {
  if (
    typeof error !== 'object'
    || error === null
    || !('code' in error)
  ) {
    return false;
  }

  return error.code === 'P2002';
}

function mapUserDetail(
  user: UserDetailRecord,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,

    roles: user.userRoles
      .map((userRole) => ({
        id: userRole.role.id,
        name: userRole.role.name,
        slug: userRole.role.slug,
        description:
          userRole.role.description,
      }))
      .sort((firstRole, secondRole) =>
        firstRole.name.localeCompare(
          secondRole.name,
          'es',
        ),
      ),
  };
}

function setsContainSameNumbers(
  firstValues: number[],
  secondValues: number[],
): boolean {
  if (
    firstValues.length
    !== secondValues.length
  ) {
    return false;
  }

  const firstSet =
    new Set(firstValues);

  return secondValues.every(
    (value) => firstSet.has(value),
  );
}

async function findRoles(
  roleIds: number[],
) {
  return prisma.role.findMany({
    where: {
      id: {
        in: roleIds,
      },
    },

    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });
}

function getMissingRoleIds(
  requestedRoleIds: number[],
  existingRoleIds: number[],
): number[] {
  const existingRoleIdSet =
    new Set(existingRoleIds);

  return requestedRoleIds.filter(
    (roleId) => (
      !existingRoleIdSet.has(roleId)
    ),
  );
}

async function ensureAnotherActiveAdministrator(
  transaction: Prisma.TransactionClient,
  excludedUserId: number,
): Promise<void> {
  const remainingAdministrators =
    await transaction.user.count({
      where: {
        id: {
          not: excludedUserId,
        },

        isActive: true,
        deletedAt: null,

        userRoles: {
          some: {
            role: {
              slug: 'administrador',
            },
          },
        },
      },
    });

  if (remainingAdministrators === 0) {
    throw new CannotRemoveLastAdministratorError();
  }
}

async function getUserDetailWithinTransaction(
  transaction: Prisma.TransactionClient,
  userId: number,
): Promise<UserDetailRecord> {
  const user =
    await transaction.user.findUnique({
      where: {
        id: userId,
      },

      select: userDetailSelect,
    });

  if (!user) {
    throw new UserNotFoundError();
  }

  return user;
}

export async function listUsers(
  query: ListUsersQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
  } = query;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
        },
      },
      {
        email: {
          contains: search,
        },
      },
    ];
  }

  if (status === 'active') {
    where.isActive = true;
    where.deletedAt = null;
  }

  if (status === 'archived') {
    where.deletedAt = {
      not: null,
    };
  }

  const skip = (page - 1) * pageSize;

  const [
    total,
    users,
  ] = await prisma.$transaction([
    prisma.user.count({
      where,
    }),

    prisma.user.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        deletedAt: true,

        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    items: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,

      roles: user.userRoles
        .map((userRole) => ({
          name: userRole.role.name,
          slug: userRole.role.slug,
        }))
        .sort((firstRole, secondRole) =>
          firstRole.name.localeCompare(
            secondRole.name,
            'es',
          ),
        ),
    })),

    pagination: {
      page,
      pageSize,
      total,

      totalPages: Math.ceil(
        total / pageSize,
      ),
    },
  };
}

export async function listAssignableRoles() {
  const roles = await prisma.role.findMany({
    orderBy: [
      {
        name: 'asc',
      },
      {
        id: 'asc',
      },
    ],

    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });

  return {
    items: roles,
  };
}

export async function getUserById(
  userId: number,
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: userDetailSelect,
    });

  if (!user) {
    throw new UserNotFoundError();
  }

  return mapUserDetail(user);
}

export async function createUser(
  input: CreateUserInput,
) {
  const email =
    input.email.trim().toLowerCase();

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },

      select: {
        id: true,
      },
    });

  if (existingUser) {
    throw new UserEmailAlreadyExistsError();
  }

  const roles = await findRoles(
    input.roleIds,
  );

  const missingRoleIds =
    getMissingRoleIds(
      input.roleIds,
      roles.map((role) => role.id),
    );

  if (missingRoleIds.length > 0) {
    throw new UserRolesNotFoundError(
      missingRoleIds,
    );
  }

  const passwordHash =
    await hashPassword(input.password);

  try {
    const createdUser =
      await prisma.$transaction(
        async (transaction) => {
          const user =
            await transaction.user.create({
              data: {
                name: input.name.trim(),
                email,
                passwordHash,
                isActive: true,
              },
            });

          await transaction.userRole.createMany({
            data: input.roleIds.map(
              (roleId) => ({
                userId: user.id,
                roleId,
              }),
            ),
          });

          return getUserDetailWithinTransaction(
            transaction,
            user.id,
          );
        },
      );

    return mapUserDetail(createdUser);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new UserEmailAlreadyExistsError();
    }

    throw error;
  }
}

export async function updateUser(
  authenticatedUserId: number,
  userId: number,
  input: UpdateUserInput,
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        email: true,
        isActive: true,
        deletedAt: true,

        userRoles: {
          select: {
            roleId: true,

            role: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

  if (!existingUser) {
    throw new UserNotFoundError();
  }

  if (existingUser.deletedAt !== null) {
    throw new UserArchivedError();
  }

  const normalizedEmail =
    input.email.trim().toLowerCase();

  const userWithSameEmail =
    await prisma.user.findFirst({
      where: {
        email: normalizedEmail,

        id: {
          not: userId,
        },
      },

      select: {
        id: true,
      },
    });

  if (userWithSameEmail) {
    throw new UserEmailAlreadyExistsError();
  }

  const roles = await findRoles(
    input.roleIds,
  );

  const missingRoleIds =
    getMissingRoleIds(
      input.roleIds,
      roles.map((role) => role.id),
    );

  if (missingRoleIds.length > 0) {
    throw new UserRolesNotFoundError(
      missingRoleIds,
    );
  }

  const currentRoleIds =
    existingUser.userRoles.map(
      (userRole) => userRole.roleId,
    );

  const rolesAreChanging =
    !setsContainSameNumbers(
      currentRoleIds,
      input.roleIds,
    );

  const isEditingOwnUser =
    authenticatedUserId === userId;

  if (
    isEditingOwnUser
    && rolesAreChanging
  ) {
    throw new CannotModifyOwnRolesError();
  }

  if (
    isEditingOwnUser
    && input.password !== undefined
  ) {
    throw new CannotResetOwnPasswordError();
  }

  const currentlyHasAdministratorRole =
    existingUser.userRoles.some(
      (userRole) => (
        userRole.role.slug
        === 'administrador'
      ),
    );

  const willHaveAdministratorRole =
    roles.some(
      (role) => (
        role.slug === 'administrador'
      ),
    );

  const administratorRoleIsBeingRemoved =
    currentlyHasAdministratorRole
    && !willHaveAdministratorRole
    && existingUser.isActive;

  const passwordHash =
    input.password === undefined
      ? undefined
      : await hashPassword(input.password);

  try {
    const updatedUser =
      await prisma.$transaction(
        async (transaction) => {
          if (
            administratorRoleIsBeingRemoved
          ) {
            await ensureAnotherActiveAdministrator(
              transaction,
              userId,
            );
          }

          await transaction.user.update({
            where: {
              id: userId,
            },

            data: {
              name: input.name.trim(),
              email: normalizedEmail,

              ...(passwordHash === undefined
                ? {}
                : {
                  passwordHash,
                }),
            },
          });

          if (rolesAreChanging) {
            await transaction.userRole.deleteMany({
              where: {
                userId,
              },
            });

            await transaction.userRole.createMany({
              data: input.roleIds.map(
                (roleId) => ({
                  userId,
                  roleId,
                }),
              ),
            });
          }

          if (passwordHash !== undefined) {
            await transaction.session.deleteMany({
              where: {
                userId,
              },
            });
          }

          return getUserDetailWithinTransaction(
            transaction,
            userId,
          );
        },
      );

    return mapUserDetail(updatedUser);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new UserEmailAlreadyExistsError();
    }

    throw error;
  }
}

export async function setUserActiveStatus(
  authenticatedUserId: number,
  userId: number,
  isActive: boolean,
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,

        userRoles: {
          select: {
            role: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

  if (!existingUser) {
    throw new UserNotFoundError();
  }

  if (existingUser.deletedAt !== null) {
    throw new UserArchivedError();
  }

  if (
    authenticatedUserId === userId
    && !isActive
  ) {
    throw new CannotDeactivateOwnUserError();
  }

  if (existingUser.isActive === isActive) {
    return getUserById(userId);
  }

  const hasAdministratorRole =
    existingUser.userRoles.some(
      (userRole) => (
        userRole.role.slug
        === 'administrador'
      ),
    );

  const updatedUser =
    await prisma.$transaction(
      async (transaction) => {
        if (
          !isActive
          && hasAdministratorRole
        ) {
          await ensureAnotherActiveAdministrator(
            transaction,
            userId,
          );
        }

        await transaction.user.update({
          where: {
            id: userId,
          },

          data: {
            isActive,
          },
        });

        if (!isActive) {
          await transaction.session.deleteMany({
            where: {
              userId,
            },
          });
        }

        return getUserDetailWithinTransaction(
          transaction,
          userId,
        );
      },
    );

  return mapUserDetail(updatedUser);
}

export async function archiveUser(
  authenticatedUserId: number,
  userId: number,
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        deletedAt: true,

        userRoles: {
          select: {
            role: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

  if (!existingUser) {
    throw new UserNotFoundError();
  }

  if (existingUser.deletedAt !== null) {
    throw new UserAlreadyArchivedError();
  }

  if (authenticatedUserId === userId) {
    throw new CannotArchiveOwnUserError();
  }

  const hasAdministratorRole =
    existingUser.userRoles.some(
      (userRole) => (
        userRole.role.slug
        === 'administrador'
      ),
    );

  const archivedUser =
    await prisma.$transaction(
      async (transaction) => {
        if (hasAdministratorRole) {
          await ensureAnotherActiveAdministrator(
            transaction,
            userId,
          );
        }

        await transaction.user.update({
          where: {
            id: userId,
          },

          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });

        await transaction.session.deleteMany({
          where: {
            userId,
          },
        });

        return getUserDetailWithinTransaction(
          transaction,
          userId,
        );
      },
    );

  return mapUserDetail(archivedUser);
}

export async function restoreUser(
  userId: number,
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingUser) {
    throw new UserNotFoundError();
  }

  if (existingUser.deletedAt === null) {
    throw new UserNotArchivedError();
  }

  const restoredUser =
    await prisma.$transaction(
      async (transaction) => {
        await transaction.user.update({
          where: {
            id: userId,
          },

          data: {
            isActive: true,
            deletedAt: null,
          },
        });

        return getUserDetailWithinTransaction(
          transaction,
          userId,
        );
      },
    );

  return mapUserDetail(restoredUser);
}
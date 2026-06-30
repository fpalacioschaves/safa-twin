import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  ListUsersQuery,
} from './users.schemas.js';

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
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
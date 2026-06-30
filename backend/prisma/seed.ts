import 'dotenv/config';

import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/security/password.js';

const roles = [
  {
    name: 'Administrador',
    slug: 'administrador',
    description: 'Acceso completo a la administración de SAFA Twin.',
  },
  {
    name: 'Jefatura o Coordinación',
    slug: 'jefatura-coordinacion',
    description: 'Gestión académica y coordinación general.',
  },
  {
    name: 'Profesor',
    slug: 'profesor',
    description: 'Acceso docente a los grupos y módulos asignados.',
  },
  {
    name: 'Tutor de grupo',
    slug: 'tutor-grupo',
    description: 'Gestión tutorial del alumnado de un grupo.',
  },
  {
    name: 'Tutor de formación en empresa',
    slug: 'tutor-formacion-empresa',
    description: 'Gestión y seguimiento de la formación en empresa.',
  },
] as const;

const permissions = [
  {
    name: 'Listar usuarios',
    slug: 'users.list',
    description: 'Consultar el listado de usuarios.',
  },
  {
    name: 'Consultar usuarios',
    slug: 'users.view',
    description: 'Consultar los datos de un usuario.',
  },
  {
    name: 'Crear usuarios',
    slug: 'users.create',
    description: 'Crear nuevos usuarios.',
  },
  {
    name: 'Modificar usuarios',
    slug: 'users.update',
    description: 'Modificar los datos de los usuarios.',
  },
  {
    name: 'Archivar usuarios',
    slug: 'users.archive',
    description: 'Archivar usuarios sin eliminarlos físicamente.',
  },
  {
    name: 'Listar roles',
    slug: 'roles.list',
    description: 'Consultar el listado de roles.',
  },
  {
    name: 'Consultar roles',
    slug: 'roles.view',
    description: 'Consultar los datos y permisos de un rol.',
  },
  {
    name: 'Asignar roles',
    slug: 'roles.assign',
    description: 'Asignar y retirar roles a los usuarios.',
  },
  {
    name: 'Administrar roles',
    slug: 'roles.manage',
    description: 'Crear, modificar y configurar roles.',
  },
  {
    name: 'Consultar permisos',
    slug: 'permissions.view',
    description: 'Consultar los permisos disponibles.',
  },
] as const;

const jefaturaPermissionSlugs = [
  'users.list',
  'users.view',
  'users.create',
  'users.update',
  'users.archive',
  'roles.list',
  'roles.view',
  'roles.assign',
  'permissions.view',
] as const;

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `La variable de entorno ${name} no está configurada.`,
    );
  }

  return value;
}

function validateEmail(email: string): void {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new Error(
      `El correo del administrador "${email}" no es válido.`,
    );
  }
}

async function seedRoles(): Promise<Map<string, number>> {
  const roleIds = new Map<string, number>();

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: {
        slug: roleData.slug,
      },
      update: {
        name: roleData.name,
        description: roleData.description,
      },
      create: roleData,
    });

    roleIds.set(role.slug, role.id);
  }

  return roleIds;
}

async function seedPermissions(): Promise<Map<string, number>> {
  const permissionIds = new Map<string, number>();

  for (const permissionData of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        slug: permissionData.slug,
      },
      update: {
        name: permissionData.name,
        description: permissionData.description,
      },
      create: permissionData,
    });

    permissionIds.set(permission.slug, permission.id);
  }

  return permissionIds;
}

async function assignPermissions(
  roleId: number,
  permissionIds: number[],
): Promise<void> {
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId,
        permissionId,
      },
    });
  }
}

async function seedAdministrator(
  administratorRoleId: number,
): Promise<string> {
  const administratorName =
    getRequiredEnvironmentVariable('ADMIN_NAME');

  const administratorEmail =
    getRequiredEnvironmentVariable('ADMIN_EMAIL').toLowerCase();

  const administratorPassword =
    process.env.ADMIN_PASSWORD;

  if (!administratorPassword) {
    throw new Error(
      'La variable de entorno ADMIN_PASSWORD no está configurada.',
    );
  }

  validateEmail(administratorEmail);

  const existingAdministrator = await prisma.user.findUnique({
    where: {
      email: administratorEmail,
    },
  });

  let administratorId: number;

  if (existingAdministrator) {
    const administrator = await prisma.user.update({
      where: {
        id: existingAdministrator.id,
      },
      data: {
        name: administratorName,
        isActive: true,
        deletedAt: null,
      },
    });

    administratorId = administrator.id;
  } else {
    const passwordHash = await hashPassword(
      administratorPassword,
    );

    const administrator = await prisma.user.create({
      data: {
        name: administratorName,
        email: administratorEmail,
        passwordHash,
        isActive: true,
      },
    });

    administratorId = administrator.id;
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: administratorId,
        roleId: administratorRoleId,
      },
    },
    update: {},
    create: {
      userId: administratorId,
      roleId: administratorRoleId,
    },
  });

  return administratorEmail;
}

async function main(): Promise<void> {
  const roleIds = await seedRoles();
  const permissionIds = await seedPermissions();

  const administratorRoleId = roleIds.get('administrador');
  const jefaturaRoleId = roleIds.get('jefatura-coordinacion');

  if (!administratorRoleId || !jefaturaRoleId) {
    throw new Error(
      'No se han podido obtener los roles necesarios.',
    );
  }

  await assignPermissions(
    administratorRoleId,
    Array.from(permissionIds.values()),
  );

  const jefaturaPermissionIds = jefaturaPermissionSlugs.map(
    (slug) => {
      const permissionId = permissionIds.get(slug);

      if (!permissionId) {
        throw new Error(
          `No se ha encontrado el permiso "${slug}".`,
        );
      }

      return permissionId;
    },
  );

  await assignPermissions(
    jefaturaRoleId,
    jefaturaPermissionIds,
  );

  const administratorEmail = await seedAdministrator(
    administratorRoleId,
  );

  console.log('Datos iniciales creados correctamente.');
  console.log(`Roles procesados: ${roles.length}`);
  console.log(`Permisos procesados: ${permissions.length}`);
  console.log(`Administrador: ${administratorEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      'No se pudieron crear los datos iniciales:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
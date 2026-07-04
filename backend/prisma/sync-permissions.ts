import 'dotenv/config';

import { prisma } from '../src/config/database.js';

type PermissionSeed = {
  name: string;
  slug: string;
  description: string;
};

type AcademicResourceDefinition = {
  slug: string;
  singular: string;
  plural: string;
};

const userAndRolePermissions: PermissionSeed[] = [
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
    description:
      'Archivar usuarios sin eliminarlos físicamente.',
  },
  {
    name: 'Listar roles',
    slug: 'roles.list',
    description: 'Consultar el listado de roles.',
  },
  {
    name: 'Consultar roles',
    slug: 'roles.view',
    description:
      'Consultar los datos y permisos de un rol.',
  },
  {
    name: 'Asignar roles',
    slug: 'roles.assign',
    description:
      'Asignar y retirar roles a los usuarios.',
  },
  {
    name: 'Administrar roles',
    slug: 'roles.manage',
    description:
      'Crear, modificar y configurar roles.',
  },
  {
    name: 'Consultar permisos',
    slug: 'permissions.view',
    description:
      'Consultar los permisos disponibles.',
  },
];

const academicResources: AcademicResourceDefinition[] = [
  {
    slug: 'academic-years',
    singular: 'curso académico',
    plural: 'cursos académicos',
  },
  {
    slug: 'centres',
    singular: 'centro',
    plural: 'centros',
  },
  {
    slug: 'vocational-programmes',
    singular: 'ciclo formativo',
    plural: 'ciclos formativos',
  },
  {
    slug: 'academic-levels',
    singular: 'nivel académico',
    plural: 'niveles académicos',
  },
  {
    slug: 'academic-offerings',
    singular: 'oferta académica',
    plural: 'ofertas académicas',
  },
  {
    slug: 'modules',
    singular: 'módulo',
    plural: 'módulos',
  },
  {
    slug: 'students',
    singular: 'alumno',
    plural: 'alumnos',
  },
  {
    slug: 'enrolments',
    singular: 'matrícula',
    plural: 'matrículas',
  },
];

function createAcademicCrudPermissions(
  resource: AcademicResourceDefinition,
): PermissionSeed[] {
  return [
    {
      name: `Listar ${resource.plural}`,
      slug: `${resource.slug}.list`,
      description:
        `Consultar el listado de ${resource.plural}.`,
    },
    {
      name: `Consultar ${resource.plural}`,
      slug: `${resource.slug}.view`,
      description:
        `Consultar los datos de una entidad de ${resource.plural}.`,
    },
    {
      name: `Crear ${resource.plural}`,
      slug: `${resource.slug}.create`,
      description:
        `Crear un nuevo registro de ${resource.plural}.`,
    },
    {
      name: `Modificar ${resource.plural}`,
      slug: `${resource.slug}.update`,
      description:
        `Modificar los datos de un registro de ${resource.plural}.`,
    },
    {
      name: `Archivar ${resource.plural}`,
      slug: `${resource.slug}.archive`,
      description:
        `Archivar un registro de ${resource.plural} sin eliminarlo físicamente.`,
    },
  ];
}

const academicPermissions: PermissionSeed[] = [
  ...academicResources.flatMap(
    createAcademicCrudPermissions,
  ),
  {
    name: 'Establecer curso académico actual',
    slug: 'academic-years.set-current',
    description:
      'Marcar un curso académico como curso actual de la aplicación.',
  },
];

const permissions: PermissionSeed[] = [
  ...userAndRolePermissions,
  ...academicPermissions,
];

const administratorRoleSlug = 'administrador';

function getRequiredMapValue(
  values: Map<string, number>,
  key: string,
  entityName: string,
): number {
  const value = values.get(key);

  if (!value) {
    throw new Error(
      `No se ha encontrado ${entityName} "${key}".`,
    );
  }

  return value;
}

async function syncPermissions():
Promise<Map<string, number>> {
  const permissionIds =
    new Map<string, number>();

  for (const permissionData of permissions) {
    const permission =
      await prisma.permission.upsert({
        where: {
          slug: permissionData.slug,
        },
        update: {
          name: permissionData.name,
          description:
            permissionData.description,
        },
        create: permissionData,
      });

    permissionIds.set(
      permission.slug,
      permission.id,
    );
  }

  return permissionIds;
}

async function assignAllPermissionsToAdministrator(
  permissionIds: Map<string, number>,
): Promise<void> {
  const administratorRole =
    await prisma.role.findUnique({
      where: {
        slug: administratorRoleSlug,
      },
      select: {
        id: true,
      },
    });

  if (!administratorRole) {
    throw new Error(
      'No existe el rol administrador. Ejecuta primero el seed inicial.',
    );
  }

  for (const permissionSlug of permissionIds.keys()) {
    const permissionId =
      getRequiredMapValue(
        permissionIds,
        permissionSlug,
        'el permiso',
      );

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: administratorRole.id,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId: administratorRole.id,
        permissionId,
      },
    });
  }
}

async function main(): Promise<void> {
  const permissionIds =
    await syncPermissions();

  await assignAllPermissionsToAdministrator(
    permissionIds,
  );

  console.log(
    `Permisos sincronizados: ${permissionIds.size}`,
  );

  console.log(
    'Todos los permisos han quedado asignados al rol administrador.',
  );

  console.log(
    'Recarga la aplicación para que /api/auth/me devuelva los permisos actualizados.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      'No se pudieron sincronizar los permisos:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

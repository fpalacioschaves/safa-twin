import 'dotenv/config';

import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/security/password.js';

type PermissionSeed = {
  name: string;
  slug: string;
  description: string;
};

type ResourceDefinition = {
  slug: string;
  singular: string;
  plural: string;
};

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
    description:
      'Acceso docente al alumnado, ofertas académicas y módulos asignados.',
  },
  {
    name: 'Tutor de grupo',
    slug: 'tutor-grupo',
    description:
      'Seguimiento tutorial del alumnado que tenga asignado.',
  },
  {
    name: 'Tutor de formación en empresa',
    slug: 'tutor-formacion-empresa',
    description:
      'Gestión y seguimiento de la formación en empresa.',
  },
] as const;

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

const academicResources: ResourceDefinition[] = [
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
];

function createCrudPermissions(
  resource: ResourceDefinition,
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
        `Consultar los datos de un ${resource.singular}.`,
    },
    {
      name: `Crear ${resource.plural}`,
      slug: `${resource.slug}.create`,
      description:
        `Crear un nuevo ${resource.singular}.`,
    },
    {
      name: `Modificar ${resource.plural}`,
      slug: `${resource.slug}.update`,
      description:
        `Modificar los datos de un ${resource.singular}.`,
    },
    {
      name: `Archivar ${resource.plural}`,
      slug: `${resource.slug}.archive`,
      description:
        `Archivar un ${resource.singular} sin eliminarlo físicamente.`,
    },
  ];
}

const academicPermissions: PermissionSeed[] = [
  ...academicResources.flatMap(
    createCrudPermissions,
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

const jefaturaUserPermissionSlugs = [
  'users.list',
  'users.view',
  'users.create',
  'users.update',
  'users.archive',
  'roles.list',
  'roles.view',
  'roles.assign',
  'permissions.view',
];

const academicManagementPermissionSlugs =
  academicPermissions.map(
    (permission) => permission.slug,
  );

const academicReadPermissionSlugs =
  academicResources.flatMap((resource) => [
    `${resource.slug}.list`,
    `${resource.slug}.view`,
  ]);

const jefaturaPermissionSlugs = [
  ...jefaturaUserPermissionSlugs,
  ...academicManagementPermissionSlugs,
];

const academicLevels = [
  {
    number: 1,
    name: 'Primero',
    description:
      'Primer nivel o curso del ciclo formativo.',
  },
  {
    number: 2,
    name: 'Segundo',
    description:
      'Segundo nivel o curso del ciclo formativo.',
  },
] as const;

const vocationalProgrammes = [
  {
    code: 'DAW',
    name: 'Desarrollo de Aplicaciones Web',
    acronym: 'DAW',
    family: 'Informática y Comunicaciones',
    type: 'HIGHER' as const,
    totalHours: 2000,
    description:
      'Ciclo Formativo de Grado Superior en Desarrollo de Aplicaciones Web.',
  },
  {
    code: 'DAM',
    name: 'Desarrollo de Aplicaciones Multiplataforma',
    acronym: 'DAM',
    family: 'Informática y Comunicaciones',
    type: 'HIGHER' as const,
    totalHours: 2000,
    description:
      'Ciclo Formativo de Grado Superior en Desarrollo de Aplicaciones Multiplataforma.',
  },
] as const;

const initialCentre = {
  code: 'SAFA-MALAGA',
  name: 'SAFA Málaga',
  shortName: 'SAFA',
  city: 'Málaga',
  province: 'Málaga',
} as const;

function getRequiredEnvironmentVariable(
  name: string,
): string {
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

function getCurrentAcademicYearData(
  currentDate = new Date(),
): {
  name: string;
  startDate: Date;
  endDate: Date;
} {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const startYear =
    currentMonth >= 9
      ? currentYear
      : currentYear - 1;

  const endYear = startYear + 1;

  return {
    name: `${startYear}/${endYear}`,
    startDate: new Date(
      Date.UTC(startYear, 8, 1),
    ),
    endDate: new Date(
      Date.UTC(endYear, 7, 31),
    ),
  };
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

async function seedPermissions(): Promise<
  Map<string, number>
> {
  const permissionIds = new Map<string, number>();

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

function resolvePermissionIds(
  permissionIds: Map<string, number>,
  permissionSlugs: string[],
): number[] {
  return permissionSlugs.map((slug) =>
    getRequiredMapValue(
      permissionIds,
      slug,
      'el permiso',
    ),
  );
}

async function seedAdministrator(
  administratorRoleId: number,
): Promise<string> {
  const administratorName =
    getRequiredEnvironmentVariable('ADMIN_NAME');

  const administratorEmail =
    getRequiredEnvironmentVariable(
      'ADMIN_EMAIL',
    ).toLowerCase();

  const administratorPassword =
    process.env.ADMIN_PASSWORD;

  if (!administratorPassword) {
    throw new Error(
      'La variable de entorno ADMIN_PASSWORD no está configurada.',
    );
  }

  validateEmail(administratorEmail);

  const existingAdministrator =
    await prisma.user.findUnique({
      where: {
        email: administratorEmail,
      },
    });

  let administratorId: number;

  if (existingAdministrator) {
    const administrator =
      await prisma.user.update({
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

    const administrator =
      await prisma.user.create({
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

async function seedCurrentAcademicYear(): Promise<string> {
  const academicYearData =
    getCurrentAcademicYearData();

  await prisma.$transaction(async (transaction) => {
    await transaction.academicYear.updateMany({
      where: {
        isCurrent: true,
        name: {
          not: academicYearData.name,
        },
      },
      data: {
        isCurrent: false,
      },
    });

    await transaction.academicYear.upsert({
      where: {
        name: academicYearData.name,
      },
      update: {
        startDate:
          academicYearData.startDate,
        endDate: academicYearData.endDate,
        isCurrent: true,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: academicYearData.name,
        startDate:
          academicYearData.startDate,
        endDate: academicYearData.endDate,
        isCurrent: true,
        isActive: true,
      },
    });
  });

  return academicYearData.name;
}

async function seedAcademicLevels(): Promise<
  Map<number, number>
> {
  const academicLevelIds =
    new Map<number, number>();

  for (const academicLevelData of academicLevels) {
    const academicLevel =
      await prisma.academicLevel.upsert({
        where: {
          number: academicLevelData.number,
        },
        update: {
          name: academicLevelData.name,
          description:
            academicLevelData.description,
          isActive: true,
          deletedAt: null,
        },
        create: {
          number: academicLevelData.number,
          name: academicLevelData.name,
          description:
            academicLevelData.description,
          isActive: true,
        },
      });

    academicLevelIds.set(
      academicLevel.number,
      academicLevel.id,
    );
  }

  return academicLevelIds;
}

async function seedCentre(): Promise<number> {
  const centre = await prisma.centre.upsert({
    where: {
      code: initialCentre.code,
    },
    update: {
      name: initialCentre.name,
      shortName: initialCentre.shortName,
      city: initialCentre.city,
      province: initialCentre.province,
      isActive: true,
      deletedAt: null,
    },
    create: {
      code: initialCentre.code,
      name: initialCentre.name,
      shortName: initialCentre.shortName,
      city: initialCentre.city,
      province: initialCentre.province,
      isActive: true,
    },
  });

  return centre.id;
}

async function seedVocationalProgrammes(): Promise<
  Map<string, number>
> {
  const vocationalProgrammeIds =
    new Map<string, number>();

  for (
    const vocationalProgrammeData
    of vocationalProgrammes
  ) {
    const vocationalProgramme =
      await prisma.vocationalProgramme.upsert({
        where: {
          code: vocationalProgrammeData.code,
        },
        update: {
          name: vocationalProgrammeData.name,
          acronym:
            vocationalProgrammeData.acronym,
          family:
            vocationalProgrammeData.family,
          type: vocationalProgrammeData.type,
          totalHours:
            vocationalProgrammeData.totalHours,
          description:
            vocationalProgrammeData.description,
          isActive: true,
          deletedAt: null,
        },
        create: {
          code: vocationalProgrammeData.code,
          name: vocationalProgrammeData.name,
          acronym:
            vocationalProgrammeData.acronym,
          family:
            vocationalProgrammeData.family,
          type: vocationalProgrammeData.type,
          totalHours:
            vocationalProgrammeData.totalHours,
          description:
            vocationalProgrammeData.description,
          isActive: true,
        },
      });

    vocationalProgrammeIds.set(
      vocationalProgramme.code,
      vocationalProgramme.id,
    );
  }

  return vocationalProgrammeIds;
}

async function seedCentreProgrammes(
  centreId: number,
  vocationalProgrammeIds: Map<string, number>,
): Promise<void> {
  for (
    const vocationalProgrammeId
    of vocationalProgrammeIds.values()
  ) {
    await prisma.centreProgramme.upsert({
      where: {
        centreId_vocationalProgrammeId: {
          centreId,
          vocationalProgrammeId,
        },
      },
      update: {
        isActive: true,
        deletedAt: null,
      },
      create: {
        centreId,
        vocationalProgrammeId,
        isActive: true,
      },
    });
  }
}

async function main(): Promise<void> {
  const roleIds = await seedRoles();
  const permissionIds =
    await seedPermissions();

  const administratorRoleId =
    getRequiredMapValue(
      roleIds,
      'administrador',
      'el rol',
    );

  const jefaturaRoleId =
    getRequiredMapValue(
      roleIds,
      'jefatura-coordinacion',
      'el rol',
    );

  const professorRoleId =
    getRequiredMapValue(
      roleIds,
      'profesor',
      'el rol',
    );

  const groupTutorRoleId =
    getRequiredMapValue(
      roleIds,
      'tutor-grupo',
      'el rol',
    );

  const placementTutorRoleId =
    getRequiredMapValue(
      roleIds,
      'tutor-formacion-empresa',
      'el rol',
    );

  await assignPermissions(
    administratorRoleId,
    Array.from(permissionIds.values()),
  );

  await assignPermissions(
    jefaturaRoleId,
    resolvePermissionIds(
      permissionIds,
      jefaturaPermissionSlugs,
    ),
  );

  const academicReadPermissionIds =
    resolvePermissionIds(
      permissionIds,
      academicReadPermissionSlugs,
    );

  await assignPermissions(
    professorRoleId,
    academicReadPermissionIds,
  );

  await assignPermissions(
    groupTutorRoleId,
    academicReadPermissionIds,
  );

  await assignPermissions(
    placementTutorRoleId,
    academicReadPermissionIds,
  );

  const administratorEmail =
    await seedAdministrator(
      administratorRoleId,
    );

  const academicYearName =
    await seedCurrentAcademicYear();

  const academicLevelIds =
    await seedAcademicLevels();

  const centreId = await seedCentre();

  const vocationalProgrammeIds =
    await seedVocationalProgrammes();

  await seedCentreProgrammes(
    centreId,
    vocationalProgrammeIds,
  );

  console.log(
    'Datos iniciales creados correctamente.',
  );
  console.log(
    `Roles procesados: ${roles.length}`,
  );
  console.log(
    `Permisos procesados: ${permissions.length}`,
  );
  console.log(
    `Administrador: ${administratorEmail}`,
  );
  console.log(
    `Curso académico actual: ${academicYearName}`,
  );
  console.log(
    `Niveles académicos procesados: ${academicLevelIds.size}`,
  );
  console.log(
    `Centro procesado: ${initialCentre.name}`,
  );
  console.log(
    `Ciclos procesados: ${vocationalProgrammeIds.size}`,
  );
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

import 'dotenv/config';

import { prisma } from '../src/config/database.js';

const permissions = [
  {
    name: 'Listar evaluaciones',
    slug: 'evaluations.list',
    description: 'Consultar el listado de evaluaciones.',
  },
  {
    name: 'Consultar evaluaciones',
    slug: 'evaluations.view',
    description: 'Consultar los datos de una evaluación.',
  },
  {
    name: 'Crear evaluaciones',
    slug: 'evaluations.create',
    description: 'Crear nuevos periodos de evaluación.',
  },
  {
    name: 'Modificar evaluaciones',
    slug: 'evaluations.update',
    description: 'Modificar periodos de evaluación.',
  },
  {
    name: 'Archivar evaluaciones',
    slug: 'evaluations.archive',
    description: 'Archivar periodos de evaluación.',
  },
  {
    name: 'Listar estados de calificación',
    slug: 'grade-statuses.list',
    description: 'Consultar el catálogo de estados de calificación.',
  },
  {
    name: 'Consultar estados de calificación',
    slug: 'grade-statuses.view',
    description: 'Consultar un estado de calificación.',
  },
  {
    name: 'Crear estados de calificación',
    slug: 'grade-statuses.create',
    description: 'Crear estados de calificación.',
  },
  {
    name: 'Modificar estados de calificación',
    slug: 'grade-statuses.update',
    description: 'Modificar estados de calificación.',
  },
  {
    name: 'Archivar estados de calificación',
    slug: 'grade-statuses.archive',
    description: 'Archivar estados de calificación.',
  },
];

const defaultGradeStatuses = [
  {
    code: 'NE',
    name: 'No evaluado',
    description: 'No evaluado por falta de datos suficientes.',
    isEvaluable: false,
    countsAsPassed: false,
    countsAsNoShow: false,
    sortOrder: 10,
  },
  {
    code: 'NC',
    name: 'No calificado',
    description: 'No calificado por ausencia de evidencias o entregas obligatorias.',
    isEvaluable: false,
    countsAsPassed: false,
    countsAsNoShow: false,
    sortOrder: 20,
  },
  {
    code: 'NP',
    name: 'No presentado',
    description: 'No presentado a la evaluación.',
    isEvaluable: false,
    countsAsPassed: false,
    countsAsNoShow: true,
    sortOrder: 30,
  },
  {
    code: 'PFE',
    name: 'Pendiente de formación en empresa',
    description: 'Pendiente de completar o evaluar la formación en empresa.',
    isEvaluable: false,
    countsAsPassed: false,
    countsAsNoShow: false,
    sortOrder: 40,
  },
  {
    code: 'CONVALIDADO',
    name: 'Convalidado',
    description: 'Módulo convalidado.',
    isEvaluable: false,
    countsAsPassed: true,
    countsAsNoShow: false,
    sortOrder: 50,
  },
  {
    code: 'EXENTO',
    name: 'Exento',
    description: 'Módulo exento de evaluación ordinaria.',
    isEvaluable: false,
    countsAsPassed: false,
    countsAsNoShow: false,
    sortOrder: 60,
  },
  {
    code: 'BAJA',
    name: 'Baja',
    description: 'Alumno dado de baja en el módulo.',
    isEvaluable: false,
    countsAsPassed: false,
    countsAsNoShow: false,
    sortOrder: 70,
  },
];

async function main(): Promise<void> {
  const administratorRole =
    await prisma.role.findUnique({
      where: { slug: 'administrador' },
      select: { id: true },
    });

  if (!administratorRole) {
    throw new Error(
      'No existe el rol administrador.',
    );
  }

  for (const permissionData of permissions) {
    const permission =
      await prisma.permission.upsert({
        where: { slug: permissionData.slug },
        update: {
          name: permissionData.name,
          description: permissionData.description,
        },
        create: permissionData,
      });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: administratorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: administratorRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const statusData of defaultGradeStatuses) {
    await prisma.gradeStatus.upsert({
      where: { code: statusData.code },
      update: {
        name: statusData.name,
        description: statusData.description,
        isEvaluable: statusData.isEvaluable,
        countsAsPassed: statusData.countsAsPassed,
        countsAsNoShow: statusData.countsAsNoShow,
        sortOrder: statusData.sortOrder,
        isActive: true,
        deletedAt: null,
      },
      create: {
        ...statusData,
        isActive: true,
      },
    });
  }

  console.log('Permisos de evaluaciones sincronizados.');
  console.log('Estados de calificación iniciales sincronizados.');
}

main()
  .catch((error: unknown) => {
    console.error(
      'No se pudo sincronizar la fase de evaluaciones:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

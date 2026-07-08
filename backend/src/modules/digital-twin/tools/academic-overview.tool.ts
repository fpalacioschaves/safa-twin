import { prisma } from '../../../config/database.js';

import type {
  DigitalTwinIntent,
} from '../digital-twin.schemas.js';

import type {
  DigitalTwinContext,
  NumberLike,
} from '../digital-twin.types.js';

import {
  toNumber,
} from './digital-twin-tool.helpers.js';

interface AcademicOverviewRow {
  label: string;
  total: NumberLike;
}

export async function getAcademicOverviewContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const rows = await prisma.$queryRawUnsafe<AcademicOverviewRow[]>(
    `
      SELECT 'Cursos académicos activos' AS label, COUNT(*) AS total
      FROM academic_years
      WHERE deleted_at IS NULL AND is_active = TRUE
      UNION ALL
      SELECT 'Ciclos formativos activos' AS label, COUNT(*) AS total
      FROM vocational_programmes
      WHERE deleted_at IS NULL AND is_active = TRUE
      UNION ALL
      SELECT 'Módulos profesionales activos' AS label, COUNT(*) AS total
      FROM modules
      WHERE deleted_at IS NULL AND is_active = TRUE
      UNION ALL
      SELECT 'Alumnos activos' AS label, COUNT(*) AS total
      FROM students
      WHERE deleted_at IS NULL AND is_active = TRUE
      UNION ALL
      SELECT 'Matrículas activas del curso actual' AS label, COUNT(*) AS total
      FROM enrolments en
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      WHERE ay.is_current = TRUE
        AND en.deleted_at IS NULL
        AND en.status = 'ENROLLED'
      UNION ALL
      SELECT 'Evaluaciones del curso actual' AS label, COUNT(*) AS total
      FROM evaluations e
      INNER JOIN academic_years ay ON ay.id = e.academic_year_id
      WHERE ay.is_current = TRUE
        AND e.deleted_at IS NULL
      UNION ALL
      SELECT 'Estancias formativas del curso actual' AS label, COUNT(*) AS total
      FROM work_placements wp
      INNER JOIN academic_years ay ON ay.id = wp.academic_year_id
      WHERE ay.is_current = TRUE
        AND wp.deleted_at IS NULL
    `,
  );

  const items = rows.map((row) => ({
    label: row.label,
    total: toNumber(row.total),
  }));

  return {
    kind: 'academic-overview',
    title: 'Resumen general de SAFA Twin',
    summary:
      'Se ha preparado un resumen global con los principales datos académicos disponibles.',
    warnings: intent.programmeAcronyms.length > 0
      || intent.academicLevelNumber !== null
      ? [
        'La petición se ha tratado como consulta general; algunos filtros interpretados pueden no aplicarse al resumen global.',
      ]
      : [],
    data: {
      filters: intent,
      items,
    },
  };
}

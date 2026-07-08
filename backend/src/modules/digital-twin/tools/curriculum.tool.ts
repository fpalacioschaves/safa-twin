import { prisma } from '../../../config/database.js';

import type {
  DigitalTwinIntent,
} from '../digital-twin.schemas.js';

import type {
  DigitalTwinContext,
  NumberLike,
} from '../digital-twin.types.js';

import {
  addProgrammeAndLevelFilters,
  getWhereSql,
  toNumber,
} from './digital-twin-tool.helpers.js';

interface CurriculumSummaryRow {
  label: string;
  total: NumberLike;
}

export async function getCurriculumContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const learningOutcomeClauses = [
    'lo.deleted_at IS NULL',
    'lo.is_active = TRUE',
  ];

  const evaluationCriterionClauses = [
    'ec.deleted_at IS NULL',
    'ec.is_active = TRUE',
  ];

  const trainingActionClauses = [
    'ta.deleted_at IS NULL',
    'ta.is_active = TRUE',
  ];

  const learningOutcomeValues: unknown[] = [];
  const evaluationCriterionValues: unknown[] = [];
  const trainingActionValues: unknown[] = [];

  addProgrammeAndLevelFilters(
    learningOutcomeClauses,
    learningOutcomeValues,
    intent,
  );

  addProgrammeAndLevelFilters(
    evaluationCriterionClauses,
    evaluationCriterionValues,
    intent,
  );

  addProgrammeAndLevelFilters(
    trainingActionClauses,
    trainingActionValues,
    intent,
  );

  const rows = await prisma.$queryRawUnsafe<CurriculumSummaryRow[]>(
    `
      SELECT 'Resultados de Aprendizaje' AS label, COUNT(DISTINCT lo.id) AS total
      FROM module_learning_outcomes lo
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(learningOutcomeClauses)}
      UNION ALL
      SELECT 'Criterios de Evaluación' AS label, COUNT(DISTINCT ec.id) AS total
      FROM module_evaluation_criteria ec
      INNER JOIN module_learning_outcomes lo ON lo.id = ec.learning_outcome_id
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(evaluationCriterionClauses)}
      UNION ALL
      SELECT 'Acciones Formativas' AS label, COUNT(DISTINCT ta.id) AS total
      FROM module_training_actions ta
      INNER JOIN modules m ON m.id = ta.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(trainingActionClauses)}
    `,
    ...learningOutcomeValues,
    ...evaluationCriterionValues,
    ...trainingActionValues,
  );

  const items = rows.map((row) => ({
    label: row.label,
    total: toNumber(row.total),
  }));

  const trainingActionsTotal = items.find(
    (item) => item.label === 'Acciones Formativas',
  )?.total ?? 0;

  const warnings = trainingActionsTotal === 0
    ? [
      'No hay Acciones Formativas activas para los filtros indicados. Esto es normal si aún no se ha ejecutado un poblador real de AF.',
    ]
    : [];

  return {
    kind: 'curriculum-summary',
    title: 'Resumen curricular',
    summary:
      'Se ha preparado un resumen de Resultados de Aprendizaje, Criterios de Evaluación y Acciones Formativas.',
    warnings,
    data: {
      filters: intent,
      items,
    },
  };
}

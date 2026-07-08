import { prisma } from '../../config/database.js';

import {
  digitalTwinIntentSchema,
  type DigitalTwinIntent,
  type DigitalTwinMessageInput,
} from './digital-twin.schemas.js';

type AiRole = 'system' | 'user' | 'assistant';

type NumberLike = bigint | number | string | null;

interface AiMessage {
  role: AiRole;
  content: string;
}

interface AiTextRequest {
  messages: AiMessage[];
  temperature?: number;
}

interface AiJsonRequest extends AiTextRequest {
  instruction: string;
}

interface AiProvider {
  readonly name: string;
  readonly model: string;

  generateText(request: AiTextRequest): Promise<string>;

  generateJson(request: AiJsonRequest): Promise<unknown>;
}

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
}

interface EvaluationSummaryRow {
  academic_year_name: string | null;
  evaluation_code: string | null;
  evaluation_name: string | null;
  evaluation_status: string | null;
  programme_acronym: string;
  academic_level_number: NumberLike;
  module_code: string;
  module_name: string;
  enrolled: NumberLike;
  grades_recorded: NumberLike;
  evaluated: NumberLike;
  passed: NumberLike;
  failed: NumberLike;
  not_evaluated: NumberLike;
  average_grade: NumberLike;
}

interface EmailAudienceRow {
  id: NumberLike;
  full_name: string;
  email: string | null;
  programme_acronym: string;
  academic_level_number: NumberLike;
}

interface WorkPlacementSummaryRow {
  programme_acronym: string;
  academic_level_number: NumberLike;
  students: NumberLike;
  without_placement: NumberLike;
  pending: NumberLike;
  assigned: NumberLike;
  active: NumberLike;
  completed: NumberLike;
  cancelled: NumberLike;
  documentation_pending: NumberLike;
}

interface AcademicOverviewRow {
  label: string;
  total: NumberLike;
}

interface DigitalTwinContext {
  kind:
    | 'academic-overview'
    | 'evaluation-summary'
    | 'email-audience'
    | 'work-placement-summary'
    | 'curriculum-summary';
  title: string;
  summary: string;
  warnings: string[];
  data: unknown;
}

export interface DigitalTwinResponse {
  provider: {
    name: string;
    model: string;
  };
  intent: DigitalTwinIntent;
  assistantMessage: string;
  context: DigitalTwinContext;
  requiresConfirmation: boolean;
  proposedAction: {
    type: string;
    label: string;
    status: string;
  } | null;
}

export interface DigitalTwinStatus {
  provider: string;
  model: string;
  baseUrl: string | null;
  enabled: boolean;
}

class OllamaProvider implements AiProvider {
  public readonly name = 'ollama';

  public readonly model: string;

  private readonly baseUrl: string;

  private readonly timeoutMs: number;

  public constructor() {
    this.baseUrl = (
      process.env.OLLAMA_BASE_URL
      ?? 'http://127.0.0.1:11434'
    ).replace(/\/$/, '');

    this.model = process.env.OLLAMA_MODEL ?? 'llama3.2';

    const timeoutText = process.env.OLLAMA_TIMEOUT_MS ?? '45000';
    const parsedTimeout = Number.parseInt(timeoutText, 10);

    this.timeoutMs = Number.isInteger(parsedTimeout)
      && parsedTimeout > 0
      ? parsedTimeout
      : 45000;
  }

  public async generateText(
    request: AiTextRequest,
  ): Promise<string> {
    const response = await this.callChat(request.messages, {
      temperature: request.temperature ?? 0.2,
    });

    const content = response.message?.content;

    if (typeof content !== 'string') {
      throw new Error(
        'Ollama no ha devuelto contenido textual válido.',
      );
    }

    return content.trim();
  }

  public async generateJson(
    request: AiJsonRequest,
  ): Promise<unknown> {
    const response = await this.callChat(
      [
        ...request.messages,
        {
          role: 'user',
          content: request.instruction,
        },
      ],
      {
        temperature: request.temperature ?? 0,
        format: 'json',
      },
    );

    const content = response.message?.content;

    if (typeof content !== 'string') {
      throw new Error(
        'Ollama no ha devuelto JSON textual válido.',
      );
    }

    return JSON.parse(extractJson(content));
  }

  private async callChat(
    messages: AiMessage[],
    options: {
      temperature: number;
      format?: 'json';
    },
  ): Promise<OllamaChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          format: options.format,
          options: {
            temperature: options.temperature,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Ollama ha respondido con estado ${response.status}.`,
        );
      }

      return await response.json() as OllamaChatResponse;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(
          `No se ha podido obtener respuesta de Ollama: ${error.message}`,
        );
      }

      throw new Error(
        'No se ha podido obtener respuesta de Ollama.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractJson(content: string): string {
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error(
      'La respuesta del modelo no contiene un objeto JSON válido.',
    );
  }

  return content.slice(firstBrace, lastBrace + 1);
}

function getAiProvider(): AiProvider {
  const provider = (
    process.env.AI_PROVIDER ?? 'ollama'
  ).toLowerCase();

  if (provider === 'ollama') {
    return new OllamaProvider();
  }

  throw new Error(
    `El proveedor de IA "${provider}" no está implementado todavía. `
    + 'Usa AI_PROVIDER=ollama.',
  );
}

function toNumber(value: NumberLike): number {
  if (value === null) {
    return 0;
  }

  return Number(value);
}

function toNullableNumber(value: NumberLike): number | null {
  if (value === null) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeProgrammeAcronyms(
  acronyms: string[],
): string[] {
  return Array.from(
    new Set(
      acronyms
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-Z0-9]+$/.test(item)),
    ),
  );
}

function addProgrammeAndLevelFilters(
  clauses: string[],
  values: unknown[],
  intent: DigitalTwinIntent,
): void {
  const acronyms = normalizeProgrammeAcronyms(
    intent.programmeAcronyms,
  );

  if (acronyms.length > 0) {
    clauses.push(
      `vp.acronym IN (${acronyms.map(() => '?').join(', ')})`,
    );

    values.push(...acronyms);
  }

  if (intent.academicLevelNumber !== null) {
    clauses.push('al.number = ?');
    values.push(intent.academicLevelNumber);
  }
}

function getWhereSql(clauses: string[]): string {
  return clauses.length === 0
    ? ''
    : `WHERE ${clauses.join(' AND ')}`;
}

async function classifyRequest(
  provider: AiProvider,
  input: DigitalTwinMessageInput,
): Promise<{
  intent: DigitalTwinIntent;
  warnings: string[];
}> {
  const fallbackIntent = getFallbackIntent(input.message);

  try {
    const rawIntent = await provider.generateJson({
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Eres el clasificador de intención de SAFA Twin. '
            + 'Devuelves solo JSON válido, sin explicaciones.',
        },
        {
          role: 'user',
          content:
            'Clasifica esta petición académica y extrae filtros. '
            + 'Los ciclos pueden ser DAM o DAW. El curso académico '
            + 'se expresa como 1, 2, primero o segundo. La evaluación '
            + 'puede aparecer como primera, segunda, tercera, final, EV1, EV2 o EV3.\n\n'
            + `Petición: ${input.message}`,
        },
      ],
      instruction:
        'Devuelve exactamente un objeto JSON con esta forma: '
        + '{"intent":"GENERAL_QUERY|EVALUATION_REPORT|WORK_PLACEMENT_SUMMARY|EMAIL_DRAFT|CURRICULUM_QUERY",'
        + '"programmeAcronyms":["DAM","DAW"],'
        + '"academicLevelNumber":1,'
        + '"evaluationCode":"EV1|EV2|EV3|FINAL|null",'
        + '"topic":"texto breve o null",'
        + '"confidence":0.0}.',
    });

    const validation = digitalTwinIntentSchema.safeParse(rawIntent);

    if (!validation.success) {
      return {
        intent: fallbackIntent,
        warnings: [
          'Ollama respondió, pero la intención no tenía el formato esperado. Se ha usado clasificación interna.',
        ],
      };
    }

    return {
      intent: validation.data,
      warnings: [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Error desconocido al clasificar la petición.';

    return {
      intent: fallbackIntent,
      warnings: [
        `No se ha podido clasificar con Ollama. Se ha usado clasificación interna. Detalle: ${message}`,
      ],
    };
  }
}

function getFallbackIntent(
  message: string,
): DigitalTwinIntent {
  const normalizedMessage = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const programmeAcronyms: string[] = [];

  if (/\bdam\b/.test(normalizedMessage)) {
    programmeAcronyms.push('DAM');
  }

  if (/\bdaw\b/.test(normalizedMessage)) {
    programmeAcronyms.push('DAW');
  }

  let academicLevelNumber: number | null = null;

  if (/\b1\b|primero|primer/.test(normalizedMessage)) {
    academicLevelNumber = 1;
  }

  if (/\b2\b|segundo/.test(normalizedMessage)) {
    academicLevelNumber = 2;
  }

  let evaluationCode: string | null = null;

  if (/primera|\bev1\b/.test(normalizedMessage)) {
    evaluationCode = 'EV1';
  } else if (/segunda|\bev2\b/.test(normalizedMessage)) {
    evaluationCode = 'EV2';
  } else if (/tercera|\bev3\b/.test(normalizedMessage)) {
    evaluationCode = 'EV3';
  } else if (/final|ordinaria/.test(normalizedMessage)) {
    evaluationCode = 'FINAL';
  }

  let intent: DigitalTwinIntent['intent'] = 'GENERAL_QUERY';

  if (/correo|email|mail|mensaje/.test(normalizedMessage)) {
    intent = 'EMAIL_DRAFT';
  } else if (/evaluacion|nota|calificacion|aprobado|suspenso|rendimiento/.test(normalizedMessage)) {
    intent = 'EVALUATION_REPORT';
  } else if (/practica|empresa|formacion en empresa|estancia/.test(normalizedMessage)) {
    intent = 'WORK_PLACEMENT_SUMMARY';
  } else if (/curriculo|ra|resultado de aprendizaje|ce|criterio|af|accion formativa/.test(normalizedMessage)) {
    intent = 'CURRICULUM_QUERY';
  }

  return {
    intent,
    programmeAcronyms,
    academicLevelNumber,
    evaluationCode,
    topic: message,
    confidence: 0.35,
  };
}

async function getEvaluationContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const clauses = [
    'ay.is_current = TRUE',
    'en.deleted_at IS NULL',
    'en.status = \'ENROLLED\'',
    'e.deleted_at IS NULL',
  ];

  const values: unknown[] = [];

  addProgrammeAndLevelFilters(
    clauses,
    values,
    intent,
  );

  if (intent.evaluationCode !== null) {
    clauses.push(
      '(UPPER(e.code) = ? OR UPPER(e.name) LIKE ?)',
    );

    values.push(
      intent.evaluationCode.toUpperCase(),
      `%${intent.evaluationCode.toUpperCase()}%`,
    );
  }

  const rows = await prisma.$queryRawUnsafe<EvaluationSummaryRow[]>(
    `
      SELECT
        ay.name AS academic_year_name,
        e.code AS evaluation_code,
        e.name AS evaluation_name,
        e.status AS evaluation_status,
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number,
        m.code AS module_code,
        m.name AS module_name,
        COUNT(DISTINCT en.id) AS enrolled,
        COUNT(DISTINCT g.id) AS grades_recorded,
        SUM(
          CASE
            WHEN g.id IS NOT NULL
              AND (
                g.final_grade IS NOT NULL
                OR g.numeric_grade IS NOT NULL
                OR COALESCE(gs.is_evaluable, FALSE) = TRUE
              )
            THEN 1
            ELSE 0
          END
        ) AS evaluated,
        SUM(
          CASE
            WHEN g.id IS NOT NULL
              AND (
                g.is_passed = TRUE
                OR COALESCE(g.final_grade, g.numeric_grade) >= 5
              )
            THEN 1
            ELSE 0
          END
        ) AS passed,
        SUM(
          CASE
            WHEN g.id IS NOT NULL
              AND (
                g.final_grade IS NOT NULL
                OR g.numeric_grade IS NOT NULL
                OR COALESCE(gs.is_evaluable, FALSE) = TRUE
              )
              AND NOT (
                g.is_passed = TRUE
                OR COALESCE(g.final_grade, g.numeric_grade) >= 5
              )
            THEN 1
            ELSE 0
          END
        ) AS failed,
        SUM(
          CASE
            WHEN g.id IS NULL
              OR NOT (
                g.final_grade IS NOT NULL
                OR g.numeric_grade IS NOT NULL
                OR COALESCE(gs.is_evaluable, FALSE) = TRUE
              )
            THEN 1
            ELSE 0
          END
        ) AS not_evaluated,
        AVG(COALESCE(g.final_grade, g.numeric_grade)) AS average_grade
      FROM enrolments en
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN modules m ON m.id = en.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      INNER JOIN evaluations e
        ON e.academic_year_id = en.academic_year_id
        AND e.centre_id = en.centre_id
      LEFT JOIN grades g
        ON g.enrolment_id = en.id
        AND g.evaluation_id = e.id
        AND g.deleted_at IS NULL
      LEFT JOIN grade_statuses gs ON gs.id = g.grade_status_id
      ${getWhereSql(clauses)}
      GROUP BY
        ay.name,
        e.code,
        e.name,
        e.status,
        vp.acronym,
        al.number,
        m.code,
        m.name,
        m.sort_order
      ORDER BY
        ay.name DESC,
        e.sequence ASC,
        vp.acronym ASC,
        al.number ASC,
        m.sort_order ASC,
        m.name ASC
      LIMIT 120
    `,
    ...values,
  );

  const items = rows.map((row) => {
    const enrolled = toNumber(row.enrolled);
    const evaluated = toNumber(row.evaluated);
    const passed = toNumber(row.passed);

    return {
      academicYear: row.academic_year_name,
      evaluation: {
        code: row.evaluation_code,
        name: row.evaluation_name,
        status: row.evaluation_status,
      },
      programme: row.programme_acronym,
      academicLevel: toNumber(row.academic_level_number),
      module: {
        code: row.module_code,
        name: row.module_name,
      },
      enrolled,
      gradesRecorded: toNumber(row.grades_recorded),
      evaluated,
      passed,
      failed: toNumber(row.failed),
      notEvaluated: toNumber(row.not_evaluated),
      successRate: evaluated > 0
        ? roundPercentage((passed / evaluated) * 100)
        : null,
      performanceRate: enrolled > 0
        ? roundPercentage((passed / enrolled) * 100)
        : null,
      averageGrade: toNullableNumber(row.average_grade),
    };
  });

  const warnings: string[] = [];

  if (items.length === 0) {
    warnings.push(
      'No se han encontrado datos de evaluación con los filtros interpretados.',
    );
  }

  if (intent.evaluationCode === null) {
    warnings.push(
      'No se indicó una evaluación concreta. Se han incluido las evaluaciones disponibles del curso actual.',
    );
  }

  return {
    kind: 'evaluation-summary',
    title: 'Resumen de evaluación',
    summary:
      `Se han localizado ${items.length} combinaciones de evaluación, ciclo, curso y módulo.`,
    warnings,
    data: {
      filters: intent,
      items,
    },
  };
}

async function getEmailAudienceContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const clauses = [
    'ay.is_current = TRUE',
    'en.deleted_at IS NULL',
    'en.status = \'ENROLLED\'',
    's.deleted_at IS NULL',
    's.is_active = TRUE',
  ];

  const values: unknown[] = [];

  addProgrammeAndLevelFilters(
    clauses,
    values,
    intent,
  );

  const rows = await prisma.$queryRawUnsafe<EmailAudienceRow[]>(
    `
      SELECT DISTINCT
        s.id,
        CONCAT(
          s.first_name,
          ' ',
          s.last_name_1,
          COALESCE(CONCAT(' ', s.last_name_2), '')
        ) AS full_name,
        s.email,
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number
      FROM students s
      INNER JOIN enrolments en ON en.student_id = s.id
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN modules m ON m.id = en.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(clauses)}
      ORDER BY
        vp.acronym ASC,
        al.number ASC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC
      LIMIT 250
    `,
    ...values,
  );

  const recipients = rows.map((row) => ({
    id: toNumber(row.id),
    name: row.full_name,
    email: row.email,
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
  }));

  const withEmail = recipients.filter(
    (recipient) => Boolean(recipient.email),
  );

  const withoutEmail = recipients.filter(
    (recipient) => !recipient.email,
  );

  const warnings: string[] = [];

  if (recipients.length === 0) {
    warnings.push(
      'No se han encontrado alumnos con los filtros interpretados.',
    );
  }

  if (withoutEmail.length > 0) {
    warnings.push(
      `${withoutEmail.length} alumnos no tienen correo electrónico registrado.`,
    );
  }

  return {
    kind: 'email-audience',
    title: 'Audiencia para borrador de correo',
    summary:
      `Se han localizado ${recipients.length} alumnos; ${withEmail.length} tienen email registrado.`,
    warnings,
    data: {
      filters: intent,
      topic: intent.topic,
      recipientsTotal: recipients.length,
      recipientsWithEmail: withEmail.length,
      recipientsWithoutEmail: withoutEmail.length,
      recipientPreview: withEmail.slice(0, 25),
      missingEmailPreview: withoutEmail.slice(0, 10),
    },
  };
}

async function getWorkPlacementContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const clauses = [
    'ay.is_current = TRUE',
    'en.deleted_at IS NULL',
    'en.status = \'ENROLLED\'',
    's.deleted_at IS NULL',
    's.is_active = TRUE',
  ];

  const values: unknown[] = [];

  addProgrammeAndLevelFilters(
    clauses,
    values,
    intent,
  );

  const rows = await prisma.$queryRawUnsafe<WorkPlacementSummaryRow[]>(
    `
      WITH student_scope AS (
        SELECT DISTINCT
          s.id AS student_id,
          ay.id AS academic_year_id,
          en.centre_id,
          vp.acronym AS programme_acronym,
          al.number AS academic_level_number
        FROM students s
        INNER JOIN enrolments en ON en.student_id = s.id
        INNER JOIN academic_years ay ON ay.id = en.academic_year_id
        INNER JOIN modules m ON m.id = en.module_id
        INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
        INNER JOIN academic_levels al ON al.id = m.academic_level_id
        ${getWhereSql(clauses)}
      )
      SELECT
        student_scope.programme_acronym,
        student_scope.academic_level_number,
        COUNT(DISTINCT student_scope.student_id) AS students,
        SUM(CASE WHEN wp.id IS NULL THEN 1 ELSE 0 END) AS without_placement,
        SUM(CASE WHEN wp.status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN wp.status = 'ASSIGNED' THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN wp.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN wp.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN wp.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN wp.documentation_pending = TRUE THEN 1 ELSE 0 END) AS documentation_pending
      FROM student_scope
      LEFT JOIN work_placements wp
        ON wp.student_id = student_scope.student_id
        AND wp.academic_year_id = student_scope.academic_year_id
        AND wp.centre_id = student_scope.centre_id
        AND wp.deleted_at IS NULL
      GROUP BY
        student_scope.programme_acronym,
        student_scope.academic_level_number
      ORDER BY
        student_scope.programme_acronym ASC,
        student_scope.academic_level_number ASC
      LIMIT 50
    `,
    ...values,
  );

  const items = rows.map((row) => ({
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    students: toNumber(row.students),
    withoutPlacement: toNumber(row.without_placement),
    pending: toNumber(row.pending),
    assigned: toNumber(row.assigned),
    active: toNumber(row.active),
    completed: toNumber(row.completed),
    cancelled: toNumber(row.cancelled),
    documentationPending: toNumber(row.documentation_pending),
  }));

  const warnings = items.length === 0
    ? [
      'No se han encontrado alumnos o estancias formativas con los filtros interpretados.',
    ]
    : [];

  return {
    kind: 'work-placement-summary',
    title: 'Resumen de formación en empresa',
    summary:
      `Se han localizado ${items.length} agrupaciones de formación en empresa.`,
    warnings,
    data: {
      filters: intent,
      items,
    },
  };
}

async function getCurriculumContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const clauses = [
    'lo.deleted_at IS NULL',
    'lo.is_active = TRUE',
  ];

  const values: unknown[] = [];

  addProgrammeAndLevelFilters(
    clauses,
    values,
    intent,
  );

  const rows = await prisma.$queryRawUnsafe<AcademicOverviewRow[]>(
    `
      SELECT 'Resultados de Aprendizaje' AS label, COUNT(DISTINCT lo.id) AS total
      FROM module_learning_outcomes lo
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(clauses)}
      UNION ALL
      SELECT 'Criterios de Evaluación' AS label, COUNT(DISTINCT ec.id) AS total
      FROM module_evaluation_criteria ec
      INNER JOIN module_learning_outcomes lo ON lo.id = ec.learning_outcome_id
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(clauses)}
      UNION ALL
      SELECT 'Acciones Formativas' AS label, COUNT(DISTINCT ta.id) AS total
      FROM module_training_actions ta
      INNER JOIN modules m ON m.id = ta.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      WHERE ta.deleted_at IS NULL
        AND ta.is_active = TRUE
    `,
    ...values,
    ...values,
  );

  const items = rows.map((row) => ({
    label: row.label,
    total: toNumber(row.total),
  }));

  return {
    kind: 'curriculum-summary',
    title: 'Resumen curricular',
    summary:
      'Se ha preparado un resumen de Resultados de Aprendizaje, Criterios de Evaluación y Acciones Formativas.',
    warnings: [],
    data: {
      filters: intent,
      items,
    },
  };
}

async function getAcademicOverviewContext(
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

async function getContextForIntent(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  if (intent.intent === 'EVALUATION_REPORT') {
    return await getEvaluationContext(intent);
  }

  if (intent.intent === 'EMAIL_DRAFT') {
    return await getEmailAudienceContext(intent);
  }

  if (intent.intent === 'WORK_PLACEMENT_SUMMARY') {
    return await getWorkPlacementContext(intent);
  }

  if (intent.intent === 'CURRICULUM_QUERY') {
    return await getCurriculumContext(intent);
  }

  return await getAcademicOverviewContext(intent);
}

function buildSystemPrompt(): string {
  return [
    'Eres el Gemelo Digital académico de SAFA Twin.',
    'Respondes en español, con tono formal, claro y didáctico.',
    'Trabajas únicamente con los datos recibidos desde SAFA Twin.',
    'No inventes cifras, alumnos, módulos, evaluaciones ni conclusiones.',
    'Si faltan datos, indícalo expresamente.',
    'Distingue siempre entre tasa de éxito y tasa de rendimiento.',
    'No conviertas estados no numéricos en notas.',
    'Si la petición implica enviar correos, redacta solo un borrador y deja claro que requiere confirmación humana.',
  ].join(' ');
}

function buildUserPrompt(
  message: string,
  intent: DigitalTwinIntent,
  context: DigitalTwinContext,
  classificationWarnings: string[],
): string {
  return JSON.stringify(
    {
      originalRequest: message,
      interpretedIntent: intent,
      classificationWarnings,
      context,
      expectedOutput:
        'Devuelve una respuesta útil para el usuario. Si procede, estructura el resultado como informe, resumen o borrador de correo.',
    },
    null,
    2,
  );
}

function buildFallbackAssistantMessage(
  context: DigitalTwinContext,
  warnings: string[],
): string {
  const warningText = warnings.length > 0
    ? `\n\nAdvertencias:\n${warnings.map((warning) => `- ${warning}`).join('\n')}`
    : '';

  return [
    `${context.title}.`,
    context.summary,
    'No se ha podido completar la redacción con Ollama, pero SAFA Twin sí ha preparado el contexto de datos solicitado.',
    warningText,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getProposedAction(
  intent: DigitalTwinIntent,
): DigitalTwinResponse['proposedAction'] {
  if (intent.intent === 'EMAIL_DRAFT') {
    return {
      type: 'EMAIL_DRAFT',
      label: 'Borrador de correo pendiente de revisión y confirmación',
      status: 'preview_only',
    };
  }

  if (intent.intent === 'EVALUATION_REPORT') {
    return {
      type: 'DOCUMENT_PREVIEW',
      label: 'Vista previa de informe académico',
      status: 'preview_only',
    };
  }

  return null;
}

export function getDigitalTwinStatus(): DigitalTwinStatus {
  const provider = (
    process.env.AI_PROVIDER ?? 'ollama'
  ).toLowerCase();

  return {
    provider,
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
    baseUrl: provider === 'ollama'
      ? process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
      : null,
    enabled: provider === 'ollama',
  };
}

export async function processDigitalTwinMessage(
  input: DigitalTwinMessageInput,
): Promise<DigitalTwinResponse> {
  const provider = getAiProvider();

  const classification = await classifyRequest(
    provider,
    input,
  );

  const context = await getContextForIntent(
    classification.intent,
  );

  const allWarnings = [
    ...classification.warnings,
    ...context.warnings,
  ];

  let assistantMessage: string;

  try {
    assistantMessage = await provider.generateText({
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: buildUserPrompt(
            input.message,
            classification.intent,
            context,
            classification.warnings,
          ),
        },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Error desconocido al generar la respuesta.';

    assistantMessage = buildFallbackAssistantMessage(
      context,
      [
        ...allWarnings,
        message,
      ],
    );
  }

  return {
    provider: {
      name: provider.name,
      model: provider.model,
    },
    intent: classification.intent,
    assistantMessage,
    context: {
      ...context,
      warnings: allWarnings,
    },
    requiresConfirmation:
      classification.intent.intent === 'EMAIL_DRAFT',
    proposedAction: getProposedAction(
      classification.intent,
    ),
  };
}

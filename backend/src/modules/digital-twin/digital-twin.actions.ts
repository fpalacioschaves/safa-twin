import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import {
  mkdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { prisma } from '../../config/database.js';

import {
  digitalTwinIntentSchema,
  type DigitalTwinIntent,
} from './digital-twin.schemas.js';

import type {
  DigitalTwinContext,
  DigitalTwinResponse,
} from './digital-twin.types.js';

import {
  getAcademicFollowupContext,
} from './tools/academic-followup.tool.js';

import {
  getEvaluationContext,
} from './tools/evaluations.tool.js';

type DigitalTwinActionType =
  | 'EXPORT_ACADEMIC_FOLLOWUP_CSV'
  | 'EXPORT_EVALUATION_SUMMARY_CSV';

interface DigitalTwinActionPayload {
  version: 1;
  action: DigitalTwinActionType;
  title: string;
  createdAt: string;
  intent: DigitalTwinIntent;
}

interface AcademicFollowupStudentRow {
  studentId: number;
  studentCode: string | null;
  student: string;
  programme: string;
  academicLevel: number;
  enrolledModules: number;
  evaluationCount: number;
  expectedGradeRecords: number;
  gradeRecords: number;
  missingGradeRecords: number;
  numericGrades: number;
  passedGrades: number;
  failedGrades: number;
  nonEvaluableStates: number;
  openIncidents: number;
  highOpenIncidents: number;
  riskScore: number;
  riskLevel: string;
  riskReasons: string[];
}

interface AcademicFollowupModuleRow {
  programme: string;
  academicLevel: number;
  module: {
    code: string;
    name: string;
  };
  enrolledStudents: number;
  expectedGradeRecords: number;
  gradeRecords: number;
  missingGradeRecords: number;
  passedGrades: number;
  failedGrades: number;
  nonEvaluableStates: number;
  openIncidents: number;
  performanceRate: number | null;
}

interface AcademicFollowupContextData {
  totals?: Record<string, unknown>;
  students?: AcademicFollowupStudentRow[];
  modules?: AcademicFollowupModuleRow[];
  riskCriteria?: Record<string, string>;
}

interface EvaluationSummaryRow {
  academicYear: string | null;
  evaluation: {
    code: string | null;
    name: string | null;
    status: string | null;
  };
  programme: string;
  academicLevel: number;
  module: {
    code: string;
    name: string;
  };
  enrolled: number;
  gradesRecorded: number;
  evaluated: number;
  passed: number;
  failed: number;
  notEvaluated: number;
  successRate: number | null;
  performanceRate: number | null;
  averageGrade: number | null;
}

interface EvaluationSummaryContextData {
  items?: EvaluationSummaryRow[];
}

export interface DigitalTwinGeneratedDocument {
  id: number;
  documentType: string;
  title: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string;
}

export interface DigitalTwinActionConfirmationResult {
  message: string;
  action: DigitalTwinActionType;
  document: DigitalTwinGeneratedDocument;
}

const ACTION_TOKEN_TTL_MILLISECONDS =
  30 * 60 * 1000;

const actionPayloadSchema = z.object({
  version: z.literal(1),
  action: z.enum([
    'EXPORT_ACADEMIC_FOLLOWUP_CSV',
    'EXPORT_EVALUATION_SUMMARY_CSV',
  ]),
  title: z
    .string()
    .trim()
    .min(2)
    .max(191),
  createdAt: z
    .string()
    .datetime({
      offset: true,
    }),
  intent: digitalTwinIntentSchema,
});

function getActionSecret(): string {
  return process.env.DIGITAL_TWIN_ACTION_SECRET
    ?? process.env.DATABASE_URL
    ?? 'safa-twin-local-digital-twin-action-secret';
}

function signTokenBody(body: string): string {
  return createHmac('sha256', getActionSecret())
    .update(body)
    .digest('base64url');
}

function createConfirmationToken(
  payload: DigitalTwinActionPayload,
): string {
  const body = Buffer
    .from(JSON.stringify(payload), 'utf8')
    .toString('base64url');

  const signature = signTokenBody(body);

  return `${body}.${signature}`;
}

function signaturesMatch(
  expected: string,
  received: string,
): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    receivedBuffer,
  );
}

function readConfirmationToken(
  token: string,
): DigitalTwinActionPayload {
  const parts = token.split('.');

  if (parts.length !== 2) {
    throw new Error(
      'El token de confirmación no tiene un formato válido.',
    );
  }

  const [body, signature] = parts;
  const expectedSignature = signTokenBody(body);

  if (!signaturesMatch(expectedSignature, signature)) {
    throw new Error(
      'El token de confirmación no es válido o ha sido manipulado.',
    );
  }

  const decodedPayload = JSON.parse(
    Buffer
      .from(body, 'base64url')
      .toString('utf8'),
  ) as unknown;

  const validation = actionPayloadSchema.safeParse(
    decodedPayload,
  );

  if (!validation.success) {
    throw new Error(
      'El token de confirmación contiene una acción no válida.',
    );
  }

  const createdAt = new Date(validation.data.createdAt);

  if (
    Number.isNaN(createdAt.getTime())
    || Date.now() - createdAt.getTime() > ACTION_TOKEN_TTL_MILLISECONDS
  ) {
    throw new Error(
      'El token de confirmación ha caducado. Vuelve a pedir la vista previa al Gemelo Digital.',
    );
  }

  return validation.data;
}

function getScopeLabel(intent: DigitalTwinIntent): string {
  const parts: string[] = [];

  if (intent.programmeAcronyms.length > 0) {
    parts.push(intent.programmeAcronyms.join('-'));
  }

  if (intent.academicLevelNumber !== null) {
    parts.push(`${intent.academicLevelNumber}º`);
  }

  if (intent.evaluationCode !== null) {
    parts.push(intent.evaluationCode);
  }

  return parts.length > 0
    ? ` (${parts.join(' · ')})`
    : '';
}

function getDefaultActionTitle(
  action: DigitalTwinActionType,
  intent: DigitalTwinIntent,
): string {
  if (action === 'EXPORT_ACADEMIC_FOLLOWUP_CSV') {
    return `Seguimiento académico online${getScopeLabel(intent)}`;
  }

  return `Informe de evaluación${getScopeLabel(intent)}`;
}

function createPayload(
  action: DigitalTwinActionType,
  intent: DigitalTwinIntent,
): DigitalTwinActionPayload {
  return {
    version: 1,
    action,
    title: getDefaultActionTitle(action, intent),
    createdAt: new Date().toISOString(),
    intent,
  };
}

export function createDigitalTwinProposedAction(
  intent: DigitalTwinIntent,
  context: DigitalTwinContext,
): DigitalTwinResponse['proposedAction'] {
  if (intent.intent === 'EMAIL_DRAFT') {
    return {
      type: 'EMAIL_DRAFT',
      label: 'Borrador de correo pendiente de revisión y confirmación',
      status: 'preview_only',
    };
  }

  if (intent.intent === 'ACADEMIC_FOLLOWUP') {
    const payload = createPayload(
      'EXPORT_ACADEMIC_FOLLOWUP_CSV',
      intent,
    );

    return {
      type: payload.action,
      label: 'Generar CSV de seguimiento académico online',
      status: 'requires_confirmation',
      documentType: 'DIGITAL_TWIN_ACADEMIC_FOLLOWUP_CSV',
      confirmationEndpoint: '/api/digital-twin/actions/confirm',
      confirmationToken: createConfirmationToken(payload),
      previewSummary: context.summary,
    };
  }

  if (intent.intent === 'EVALUATION_REPORT') {
    const payload = createPayload(
      'EXPORT_EVALUATION_SUMMARY_CSV',
      intent,
    );

    return {
      type: payload.action,
      label: 'Generar CSV de informe de evaluación',
      status: 'requires_confirmation',
      documentType: 'DIGITAL_TWIN_EVALUATION_SUMMARY_CSV',
      confirmationEndpoint: '/api/digital-twin/actions/confirm',
      confirmationToken: createConfirmationToken(payload),
      previewSummary: context.summary,
    };
  }

  if (intent.intent === 'INCIDENTS_SUMMARY') {
    return {
      type: 'INCIDENTS_SUMMARY_PREVIEW',
      label: 'Vista previa de resumen de incidencias',
      status: 'preview_only',
    };
  }

  return null;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = Array.isArray(value)
    ? value.join(' | ')
    : String(value);

  if (
    text.includes(';')
    || text.includes('"')
    || text.includes('\n')
    || text.includes('\r')
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function buildCsvSection(
  title: string,
  headers: string[],
  rows: unknown[][],
): string[] {
  return [
    '',
    title,
    headers.map(csvEscape).join(';'),
    ...rows.map((row) => row.map(csvEscape).join(';')),
  ];
}

function buildAcademicFollowupCsv(
  context: DigitalTwinContext,
): string {
  const data = context.data as AcademicFollowupContextData;
  const students = data.students ?? [];
  const modules = data.modules ?? [];
  const totals = data.totals ?? {};
  const riskCriteria = data.riskCriteria ?? {};

  const lines = [
    'sep=;',
    `Informe;${csvEscape(context.title)}`,
    `Resumen;${csvEscape(context.summary)}`,
    `Generado;${csvEscape(new Date().toISOString())}`,
    '',
    'Totales',
    'Indicador;Valor',
    ...Object.entries(totals).map(([key, value]) => (
      `${csvEscape(key)};${csvEscape(value)}`
    )),
    ...buildCsvSection(
      'Alumnos',
      [
        'Alumno',
        'Código',
        'Ciclo',
        'Curso',
        'Módulos matriculados',
        'Evaluaciones',
        'Calificaciones esperadas',
        'Calificaciones registradas',
        'Calificaciones pendientes',
        'Aprobadas',
        'Suspensas',
        'Estados no evaluables',
        'Incidencias abiertas',
        'Incidencias graves abiertas',
        'Nivel de riesgo',
        'Puntuación de riesgo',
        'Motivos',
      ],
      students.map((student) => [
        student.student,
        student.studentCode,
        student.programme,
        student.academicLevel,
        student.enrolledModules,
        student.evaluationCount,
        student.expectedGradeRecords,
        student.gradeRecords,
        student.missingGradeRecords,
        student.passedGrades,
        student.failedGrades,
        student.nonEvaluableStates,
        student.openIncidents,
        student.highOpenIncidents,
        student.riskLevel,
        student.riskScore,
        student.riskReasons,
      ]),
    ),
    ...buildCsvSection(
      'Módulos',
      [
        'Ciclo',
        'Curso',
        'Código módulo',
        'Módulo',
        'Alumnos matriculados',
        'Calificaciones esperadas',
        'Calificaciones registradas',
        'Calificaciones pendientes',
        'Aprobadas',
        'Suspensas',
        'Estados no evaluables',
        'Incidencias abiertas',
        'Tasa de rendimiento',
      ],
      modules.map((moduleItem) => [
        moduleItem.programme,
        moduleItem.academicLevel,
        moduleItem.module.code,
        moduleItem.module.name,
        moduleItem.enrolledStudents,
        moduleItem.expectedGradeRecords,
        moduleItem.gradeRecords,
        moduleItem.missingGradeRecords,
        moduleItem.passedGrades,
        moduleItem.failedGrades,
        moduleItem.nonEvaluableStates,
        moduleItem.openIncidents,
        moduleItem.performanceRate,
      ]),
    ),
    ...buildCsvSection(
      'Criterios de riesgo',
      [
        'Indicador',
        'Descripción',
      ],
      Object.entries(riskCriteria),
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

function buildEvaluationSummaryCsv(
  context: DigitalTwinContext,
): string {
  const data = context.data as EvaluationSummaryContextData;
  const items = data.items ?? [];

  const lines = [
    'sep=;',
    `Informe;${csvEscape(context.title)}`,
    `Resumen;${csvEscape(context.summary)}`,
    `Generado;${csvEscape(new Date().toISOString())}`,
    ...buildCsvSection(
      'Evaluación',
      [
        'Curso académico',
        'Código evaluación',
        'Evaluación',
        'Estado evaluación',
        'Ciclo',
        'Curso',
        'Código módulo',
        'Módulo',
        'Matriculados',
        'Calificaciones registradas',
        'Evaluados',
        'Aprobados',
        'Suspensos',
        'No evaluados',
        'Tasa de éxito',
        'Tasa de rendimiento',
        'Nota media',
      ],
      items.map((item) => [
        item.academicYear,
        item.evaluation.code,
        item.evaluation.name,
        item.evaluation.status,
        item.programme,
        item.academicLevel,
        item.module.code,
        item.module.name,
        item.enrolled,
        item.gradesRecorded,
        item.evaluated,
        item.passed,
        item.failed,
        item.notEvaluated,
        item.successRate,
        item.performanceRate,
        item.averageGrade,
      ]),
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

async function ensureGeneratedDocumentsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS generated_documents (
      id INT NOT NULL AUTO_INCREMENT,
      generated_by_user_id INT NOT NULL,
      document_type VARCHAR(80) NOT NULL,
      title VARCHAR(191) NOT NULL,
      academic_year_id INT NULL,
      centre_id INT NULL,
      vocational_programme_id INT NULL,
      academic_level_id INT NULL,
      module_id INT NULL,
      evaluation_id INT NULL,
      parameters_json LONGTEXT NOT NULL,
      file_name VARCHAR(191) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(191) NOT NULL,
      file_size_bytes BIGINT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY generated_documents_file_path_unique (file_path),
      KEY generated_documents_user_idx (generated_by_user_id),
      KEY generated_documents_type_idx (document_type),
      KEY generated_documents_created_idx (created_at),
      KEY generated_documents_scope_idx (academic_year_id, centre_id, vocational_programme_id, academic_level_id, module_id, evaluation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function buildStoragePaths(
  filePrefix: string,
): {
  directory: string;
  fileName: string;
  filePath: string;
} {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '_');

  const directory = path.join(
    process.cwd(),
    'storage',
    'generated-documents',
    'digital-twin',
  );

  const fileName = `${filePrefix}_${timestamp}.csv`;

  const filePath = path.join(
    'storage',
    'generated-documents',
    'digital-twin',
    fileName,
  );

  return {
    directory,
    fileName,
    filePath,
  };
}

async function registerGeneratedDocument(input: {
  generatedByUserId: number;
  documentType: string;
  title: string;
  parameters: unknown;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
}): Promise<DigitalTwinGeneratedDocument> {
  await ensureGeneratedDocumentsTable();

  const parametersJson = JSON.stringify(input.parameters);

  const documentId = await prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO generated_documents (
            generated_by_user_id,
            document_type,
            title,
            academic_year_id,
            centre_id,
            vocational_programme_id,
            academic_level_id,
            module_id,
            evaluation_id,
            parameters_json,
            file_name,
            file_path,
            mime_type,
            file_size_bytes
          ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)
        `,
        input.generatedByUserId,
        input.documentType,
        input.title,
        parametersJson,
        input.fileName,
        input.filePath,
        input.mimeType,
        input.fileSizeBytes,
      );

      const rows = await transaction.$queryRawUnsafe<Array<{
        id: bigint | number;
      }>>('SELECT LAST_INSERT_ID() AS id');

      return Number(rows[0]?.id ?? 0);
    },
  );

  return {
    id: documentId,
    documentType: input.documentType,
    title: input.title,
    fileName: input.fileName,
    filePath: input.filePath,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    downloadUrl:
      `/api/generated-documents/${documentId}/download`,
  };
}

async function writeAndRegisterCsv(input: {
  generatedByUserId: number;
  documentType: string;
  title: string;
  parameters: unknown;
  filePrefix: string;
  csv: string;
}): Promise<DigitalTwinGeneratedDocument> {
  const {
    directory,
    fileName,
    filePath,
  } = buildStoragePaths(input.filePrefix);

  await mkdir(
    directory,
    {
      recursive: true,
    },
  );

  const absolutePath = path.resolve(
    process.cwd(),
    filePath,
  );

  await writeFile(
    absolutePath,
    input.csv,
    'utf8',
  );

  const fileStats = await stat(absolutePath);

  return await registerGeneratedDocument({
    generatedByUserId: input.generatedByUserId,
    documentType: input.documentType,
    title: input.title,
    parameters: input.parameters,
    fileName,
    filePath,
    mimeType: 'text/csv; charset=utf-8',
    fileSizeBytes: fileStats.size,
  });
}

async function exportAcademicFollowupCsv(
  payload: DigitalTwinActionPayload,
  generatedByUserId: number,
): Promise<DigitalTwinActionConfirmationResult> {
  const context = await getAcademicFollowupContext(
    payload.intent,
  );

  const document = await writeAndRegisterCsv({
    generatedByUserId,
    documentType:
      'DIGITAL_TWIN_ACADEMIC_FOLLOWUP_CSV',
    title: payload.title,
    parameters: {
      action: payload.action,
      intent: payload.intent,
      contextSummary: context.summary,
      generatedFrom: 'digital-twin-confirmed-action',
    },
    filePrefix: 'seguimiento_academico_online',
    csv: buildAcademicFollowupCsv(context),
  });

  return {
    message:
      'El informe de seguimiento académico online se ha generado correctamente.',
    action: payload.action,
    document,
  };
}

async function exportEvaluationSummaryCsv(
  payload: DigitalTwinActionPayload,
  generatedByUserId: number,
): Promise<DigitalTwinActionConfirmationResult> {
  const context = await getEvaluationContext(
    payload.intent,
  );

  const document = await writeAndRegisterCsv({
    generatedByUserId,
    documentType:
      'DIGITAL_TWIN_EVALUATION_SUMMARY_CSV',
    title: payload.title,
    parameters: {
      action: payload.action,
      intent: payload.intent,
      contextSummary: context.summary,
      generatedFrom: 'digital-twin-confirmed-action',
    },
    filePrefix: 'informe_evaluacion',
    csv: buildEvaluationSummaryCsv(context),
  });

  return {
    message:
      'El informe de evaluación se ha generado correctamente.',
    action: payload.action,
    document,
  };
}

export async function confirmDigitalTwinAction(
  confirmationToken: string,
  generatedByUserId: number,
): Promise<DigitalTwinActionConfirmationResult> {
  const payload = readConfirmationToken(
    confirmationToken,
  );

  if (payload.action === 'EXPORT_ACADEMIC_FOLLOWUP_CSV') {
    return await exportAcademicFollowupCsv(
      payload,
      generatedByUserId,
    );
  }

  return await exportEvaluationSummaryCsv(
    payload,
    generatedByUserId,
  );
}

import {
  readFile,
  stat,
} from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '../../config/database.js';

import type {
  GeneratedDocumentsQuery,
} from './generated-documents.schemas.js';

interface GeneratedDocumentRow {
  id: bigint | number;
  generated_by_user_id: bigint | number;
  generated_by_user_name: string | null;
  generated_by_user_email: string | null;
  document_type: string;
  title: string;
  academic_year_id: bigint | number | null;
  centre_id: bigint | number | null;
  vocational_programme_id: bigint | number | null;
  academic_level_id: bigint | number | null;
  module_id: bigint | number | null;
  evaluation_id: bigint | number | null;
  parameters_json: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size_bytes: bigint | number;
  created_at: Date;
}

export interface GeneratedDocumentItem {
  id: number;
  generatedByUserId: number;
  generatedByUserName: string | null;
  generatedByUserEmail: string | null;
  documentType: string;
  title: string;
  academicYearId: number | null;
  centreId: number | null;
  vocationalProgrammeId: number | null;
  academicLevelId: number | null;
  moduleId: number | null;
  evaluationId: number | null;
  parameters: unknown;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface GeneratedDocumentsListResult {
  items: GeneratedDocumentItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GeneratedDocumentDownloadResult {
  item: GeneratedDocumentItem;
  buffer: Buffer;
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

function toNumberOrNull(
  value: bigint | number | null,
): number | null {
  return value === null
    ? null
    : Number(value);
}

function parseParameters(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function mapRow(row: GeneratedDocumentRow): GeneratedDocumentItem {
  return {
    id: Number(row.id),
    generatedByUserId: Number(row.generated_by_user_id),
    generatedByUserName: row.generated_by_user_name,
    generatedByUserEmail: row.generated_by_user_email,
    documentType: row.document_type,
    title: row.title,
    academicYearId: toNumberOrNull(row.academic_year_id),
    centreId: toNumberOrNull(row.centre_id),
    vocationalProgrammeId: toNumberOrNull(row.vocational_programme_id),
    academicLevelId: toNumberOrNull(row.academic_level_id),
    moduleId: toNumberOrNull(row.module_id),
    evaluationId: toNumberOrNull(row.evaluation_id),
    parameters: parseParameters(row.parameters_json),
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes),
    createdAt: row.created_at.toISOString(),
  };
}

function getSafeAbsolutePath(filePath: string): string {
  const storageRoot = path.resolve(
    process.cwd(),
    'storage',
    'generated-documents',
  );

  const absolutePath = path.resolve(
    process.cwd(),
    filePath,
  );

  if (
    absolutePath !== storageRoot
    && !absolutePath.startsWith(`${storageRoot}${path.sep}`)
  ) {
    throw new Error('Ruta de documento no permitida.');
  }

  return absolutePath;
}

export async function listGeneratedDocuments(
  query: GeneratedDocumentsQuery,
): Promise<GeneratedDocumentsListResult> {
  await ensureGeneratedDocumentsTable();

  const offset = (query.page - 1) * query.pageSize;

  const countRows = await prisma.$queryRaw<Array<{
    total: bigint | number;
  }>>`
    SELECT COUNT(*) AS total
    FROM generated_documents
    WHERE deleted_at IS NULL
  `;

  const rows = await prisma.$queryRaw<GeneratedDocumentRow[]>`
    SELECT
      gd.id,
      gd.generated_by_user_id,
      u.name AS generated_by_user_name,
      u.email AS generated_by_user_email,
      gd.document_type,
      gd.title,
      gd.academic_year_id,
      gd.centre_id,
      gd.vocational_programme_id,
      gd.academic_level_id,
      gd.module_id,
      gd.evaluation_id,
      gd.parameters_json,
      gd.file_name,
      gd.file_path,
      gd.mime_type,
      gd.file_size_bytes,
      gd.created_at
    FROM generated_documents gd
    LEFT JOIN users u ON u.id = gd.generated_by_user_id
    WHERE gd.deleted_at IS NULL
    ORDER BY gd.created_at DESC, gd.id DESC
    LIMIT ${query.pageSize}
    OFFSET ${offset}
  `;

  const total = Number(countRows[0]?.total ?? 0);

  return {
    items: rows.map(mapRow),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(
        1,
        Math.ceil(total / query.pageSize),
      ),
    },
  };
}

export async function getGeneratedDocumentDownload(
  id: number,
): Promise<GeneratedDocumentDownloadResult | null> {
  await ensureGeneratedDocumentsTable();

  const rows = await prisma.$queryRaw<GeneratedDocumentRow[]>`
    SELECT
      gd.id,
      gd.generated_by_user_id,
      u.name AS generated_by_user_name,
      u.email AS generated_by_user_email,
      gd.document_type,
      gd.title,
      gd.academic_year_id,
      gd.centre_id,
      gd.vocational_programme_id,
      gd.academic_level_id,
      gd.module_id,
      gd.evaluation_id,
      gd.parameters_json,
      gd.file_name,
      gd.file_path,
      gd.mime_type,
      gd.file_size_bytes,
      gd.created_at
    FROM generated_documents gd
    LEFT JOIN users u ON u.id = gd.generated_by_user_id
    WHERE gd.deleted_at IS NULL
      AND gd.id = ${id}
    LIMIT 1
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  const item = mapRow(row);
  const absolutePath = getSafeAbsolutePath(item.filePath);

  await stat(absolutePath);

  return {
    item,
    buffer: await readFile(absolutePath),
  };
}

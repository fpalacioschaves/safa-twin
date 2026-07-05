import { prisma } from '../../config/database.js';

import type {
  DocumentTemplateInputDefinition,
} from './document-template.types.js';

import {
  getDocumentTemplateByCode,
} from './document-template.service.js';

export interface DocumentTemplateContextOption {
  value: string;
  label: string;
  description?: string;
}

export interface DocumentTemplateContextOptionsResult {
  templateCode: string;
  options: Record<string, DocumentTemplateContextOption[]>;
}

interface AcademicYearOptionRow {
  id: bigint | number;
  name: string;
  is_current: boolean | number;
}

interface EvaluationOptionRow {
  id: bigint | number;
  code: string;
  name: string;
  status: string;
  academic_year_name: string;
  centre_name: string;
  centre_short_name: string | null;
}

interface AcademicOfferingOptionRow {
  id: bigint | number;
  academic_year_name: string;
  centre_name: string;
  centre_short_name: string | null;
  programme_code: string;
  programme_name: string;
  programme_acronym: string;
  level_name: string;
  modality: string;
}

interface ModuleOptionRow {
  id: bigint | number;
  code: string;
  name: string;
  acronym: string | null;
  programme_acronym: string;
  level_name: string;
}

interface StudentOptionRow {
  id: bigint | number;
  student_code: string | null;
  first_name: string;
  last_name_1: string;
  last_name_2: string | null;
}

interface CompanyOptionRow {
  id: bigint | number;
  name: string;
  city: string | null;
  province: string | null;
}

interface WorkPlacementOptionRow {
  id: bigint | number;
  student_first_name: string;
  student_last_name_1: string;
  student_last_name_2: string | null;
  academic_year_name: string;
  company_name: string;
  status: string;
}

function toOptionValue(value: bigint | number): string {
  return Number(value).toString();
}

function getCentreLabel(
  shortName: string | null,
  name: string,
): string {
  return shortName
    ? `${shortName} · ${name}`
    : name;
}

function getStudentFullName(row: StudentOptionRow): string {
  return [
    row.last_name_1,
    row.last_name_2,
    row.first_name,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

async function getAcademicYearOptions(): Promise<DocumentTemplateContextOption[]> {
  const rows = await prisma.$queryRaw<AcademicYearOptionRow[]>`
    SELECT
      id,
      name,
      is_current
    FROM academic_years
    WHERE deleted_at IS NULL
      AND is_active = 1
    ORDER BY is_current DESC, start_date DESC, name DESC
  `;

  return rows.map((row) => ({
    value: toOptionValue(row.id),
    label: row.name,
    description: row.is_current ? 'Curso actual' : undefined,
  }));
}

async function getEvaluationOptions(): Promise<DocumentTemplateContextOption[]> {
  const rows = await prisma.$queryRaw<EvaluationOptionRow[]>`
    SELECT
      e.id,
      e.code,
      e.name,
      e.status,
      ay.name AS academic_year_name,
      c.name AS centre_name,
      c.short_name AS centre_short_name
    FROM evaluations e
    INNER JOIN academic_years ay ON ay.id = e.academic_year_id
    INNER JOIN centres c ON c.id = e.centre_id
    WHERE e.deleted_at IS NULL
      AND ay.deleted_at IS NULL
      AND c.deleted_at IS NULL
    ORDER BY ay.start_date DESC, e.sequence ASC, e.name ASC
  `;

  return rows.map((row) => ({
    value: toOptionValue(row.id),
    label: `${row.academic_year_name} · ${row.code} · ${row.name}`,
    description: `${getCentreLabel(row.centre_short_name, row.centre_name)} · ${row.status}`,
  }));
}

async function getAcademicOfferingOptions(): Promise<DocumentTemplateContextOption[]> {
  const rows = await prisma.$queryRaw<AcademicOfferingOptionRow[]>`
    SELECT
      ao.id,
      ay.name AS academic_year_name,
      c.name AS centre_name,
      c.short_name AS centre_short_name,
      vp.code AS programme_code,
      vp.name AS programme_name,
      vp.acronym AS programme_acronym,
      al.name AS level_name,
      ao.modality
    FROM academic_offerings ao
    INNER JOIN academic_years ay ON ay.id = ao.academic_year_id
    INNER JOIN centres c ON c.id = ao.centre_id
    INNER JOIN vocational_programmes vp ON vp.id = ao.vocational_programme_id
    INNER JOIN academic_levels al ON al.id = ao.academic_level_id
    WHERE ao.deleted_at IS NULL
      AND ao.is_active = 1
      AND ay.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND vp.deleted_at IS NULL
      AND al.deleted_at IS NULL
    ORDER BY ay.start_date DESC, vp.acronym ASC, al.number ASC, ao.modality ASC
  `;

  return rows.map((row) => ({
    value: toOptionValue(row.id),
    label: `${row.academic_year_name} · ${row.programme_acronym} · ${row.level_name} · ${row.modality}`,
    description: `${getCentreLabel(row.centre_short_name, row.centre_name)} · ${row.programme_name}`,
  }));
}

async function getModuleOptions(): Promise<DocumentTemplateContextOption[]> {
  const rows = await prisma.$queryRaw<ModuleOptionRow[]>`
    SELECT
      m.id,
      m.code,
      m.name,
      m.acronym,
      vp.acronym AS programme_acronym,
      al.name AS level_name
    FROM modules m
    INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
    INNER JOIN academic_levels al ON al.id = m.academic_level_id
    WHERE m.deleted_at IS NULL
      AND m.is_active = 1
      AND vp.deleted_at IS NULL
      AND al.deleted_at IS NULL
    ORDER BY vp.acronym ASC, al.number ASC, m.sort_order ASC, m.code ASC
  `;

  return rows.map((row) => ({
    value: toOptionValue(row.id),
    label: `${row.code} · ${row.name}`,
    description: `${row.programme_acronym} · ${row.level_name}${row.acronym ? ` · ${row.acronym}` : ''}`,
  }));
}

async function getStudentOptions(): Promise<DocumentTemplateContextOption[]> {
  const rows = await prisma.$queryRaw<StudentOptionRow[]>`
    SELECT
      id,
      student_code,
      first_name,
      last_name_1,
      last_name_2
    FROM students
    WHERE deleted_at IS NULL
      AND is_active = 1
    ORDER BY last_name_1 ASC, last_name_2 ASC, first_name ASC
    LIMIT 500
  `;

  return rows.map((row) => ({
    value: toOptionValue(row.id),
    label: getStudentFullName(row),
    description: row.student_code ? `Código: ${row.student_code}` : undefined,
  }));
}

async function getCompanyOptions(): Promise<DocumentTemplateContextOption[]> {
  const rows = await prisma.$queryRaw<CompanyOptionRow[]>`
    SELECT
      id,
      name,
      city,
      province
    FROM companies
    WHERE deleted_at IS NULL
      AND is_active = 1
    ORDER BY name ASC
    LIMIT 500
  `;

  return rows.map((row) => ({
    value: toOptionValue(row.id),
    label: row.name,
    description: [row.city, row.province]
      .filter((value) => value && value.trim().length > 0)
      .join(' · ') || undefined,
  }));
}

async function getWorkPlacementOptions(): Promise<DocumentTemplateContextOption[]> {
  const rows = await prisma.$queryRaw<WorkPlacementOptionRow[]>`
    SELECT
      wp.id,
      s.first_name AS student_first_name,
      s.last_name_1 AS student_last_name_1,
      s.last_name_2 AS student_last_name_2,
      ay.name AS academic_year_name,
      c.name AS company_name,
      wp.status
    FROM work_placements wp
    INNER JOIN students s ON s.id = wp.student_id
    INNER JOIN academic_years ay ON ay.id = wp.academic_year_id
    INNER JOIN companies c ON c.id = wp.company_id
    WHERE wp.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND ay.deleted_at IS NULL
      AND c.deleted_at IS NULL
    ORDER BY ay.start_date DESC, s.last_name_1 ASC, s.last_name_2 ASC, s.first_name ASC
    LIMIT 500
  `;

  return rows.map((row) => ({
    value: toOptionValue(row.id),
    label: [
      row.student_last_name_1,
      row.student_last_name_2,
      row.student_first_name,
    ]
      .filter((value) => value && value.trim().length > 0)
      .join(' '),
    description: `${row.academic_year_name} · ${row.company_name} · ${row.status}`,
  }));
}

async function getOptionsForInput(
  input: DocumentTemplateInputDefinition,
): Promise<DocumentTemplateContextOption[]> {
  if (input.key === 'academicYearId') {
    return getAcademicYearOptions();
  }

  if (input.key === 'evaluationId') {
    return getEvaluationOptions();
  }

  if (input.key === 'academicOfferingId') {
    return getAcademicOfferingOptions();
  }

  if (input.key === 'moduleId') {
    return getModuleOptions();
  }

  if (input.key === 'studentId') {
    return getStudentOptions();
  }

  if (input.key === 'companyId') {
    return getCompanyOptions();
  }

  if (input.key === 'workPlacementId') {
    return getWorkPlacementOptions();
  }

  return [];
}

export async function getDocumentTemplateContextOptions(
  code: string,
): Promise<DocumentTemplateContextOptionsResult | null> {
  const template = getDocumentTemplateByCode(code);

  if (!template) {
    return null;
  }

  const optionEntries = await Promise.all(
    template.requiredInputs.map(async (input) => [
      input.key,
      await getOptionsForInput(input),
    ] as const),
  );

  return {
    templateCode: template.code,
    options: Object.fromEntries(optionEntries),
  };
}

export const DOCUMENT_TEMPLATE_CATEGORIES = [
  'evaluation',
  'final_memory',
  'attendance',
  'student',
  'academic_offering',
  'work_placement',
  'statistics',
  'incidents',
] as const;

export const DOCUMENT_TEMPLATE_SCOPES = [
  'academic_year',
  'programme',
  'level',
  'academic_offering',
  'module',
  'student',
  'company',
  'work_placement',
] as const;

export const DOCUMENT_OUTPUT_FORMATS = [
  'docx',
  'pdf',
  'xlsx',
  'csv',
  'json',
] as const;

export const DOCUMENT_TEMPLATE_VARIABLE_TYPES = [
  'string',
  'number',
  'date',
  'boolean',
  'array',
  'object',
] as const;

export type DocumentTemplateCategory =
  (typeof DOCUMENT_TEMPLATE_CATEGORIES)[number];

export type DocumentTemplateScope =
  (typeof DOCUMENT_TEMPLATE_SCOPES)[number];

export type DocumentOutputFormat =
  (typeof DOCUMENT_OUTPUT_FORMATS)[number];

export type DocumentTemplateVariableType =
  (typeof DOCUMENT_TEMPLATE_VARIABLE_TYPES)[number];

export interface DocumentTemplateVariableDefinition {
  key: string;
  label: string;
  type: DocumentTemplateVariableType;
  required: boolean;
  description: string;
  example?: string;
}

export interface DocumentTemplateInputDefinition {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

export interface DocumentTemplateSectionDefinition {
  key: string;
  title: string;
  order: number;
  required: boolean;
  description: string;
  variables: string[];
}

export interface DocumentTemplateDefinition {
  code: string;
  name: string;
  description: string;
  category: DocumentTemplateCategory;
  scope: DocumentTemplateScope[];
  outputFormats: DocumentOutputFormat[];
  requiredPermission: string;
  requiredInputs: DocumentTemplateInputDefinition[];
  variables: DocumentTemplateVariableDefinition[];
  sections: DocumentTemplateSectionDefinition[];
  createdForPhase: '7A';
  isBaseTemplate: true;
  isActive: boolean;
}

export interface DocumentTemplateListFilters {
  category?: DocumentTemplateCategory;
  scope?: DocumentTemplateScope;
  outputFormat?: DocumentOutputFormat;
  search?: string;
  activeOnly?: boolean;
}

export interface DocumentTemplateValidationRequest {
  outputFormat?: DocumentOutputFormat;
  context?: Record<string, unknown>;
}

export interface DocumentTemplateValidationIssue {
  field: string;
  message: string;
}

export interface DocumentTemplateValidationResult {
  valid: boolean;
  templateCode: string;
  outputFormat: DocumentOutputFormat | null;
  missingInputs: DocumentTemplateInputDefinition[];
  unsupportedFormat: boolean;
  issues: DocumentTemplateValidationIssue[];
}

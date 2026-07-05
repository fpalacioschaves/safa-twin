export const DOCUMENT_TEMPLATE_CATEGORIES = [
  'evaluation',
  'final_memory',
  'attendance',
  'student',
  'group',
  'work_placement',
  'statistics',
  'incidents',
] as const;

export const DOCUMENT_TEMPLATE_SCOPES = [
  'academic_year',
  'programme',
  'level',
  'group',
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

export type DocumentTemplateCategory =
  (typeof DOCUMENT_TEMPLATE_CATEGORIES)[number];

export type DocumentTemplateScope =
  (typeof DOCUMENT_TEMPLATE_SCOPES)[number];

export type DocumentOutputFormat =
  (typeof DOCUMENT_OUTPUT_FORMATS)[number];

export type DocumentTemplateVariableType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'array'
  | 'object';

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

export interface DocumentTemplatesResponse {
  items: DocumentTemplateDefinition[];
  total: number;
}

export interface DocumentTemplateListQuery {
  category?: DocumentTemplateCategory | '';
  scope?: DocumentTemplateScope | '';
  outputFormat?: DocumentOutputFormat | '';
  search?: string;
  activeOnly?: boolean;
}

export interface DocumentTemplateVariablesResponse {
  templateCode: string;
  templateName: string;
  variables: DocumentTemplateVariableDefinition[];
  sections: DocumentTemplateSectionDefinition[];
}

export interface DocumentTemplateRequiredInputsResponse {
  templateCode: string;
  requiredInputs: DocumentTemplateInputDefinition[];
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

export interface DocumentTemplateGenerationRequest {
  outputFormat: DocumentOutputFormat;
  context?: Record<string, unknown>;
}

export interface DocumentTemplateGenerationResult {
  documentId: number;
  templateCode: string;
  templateName: string;
  outputFormat: DocumentOutputFormat;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string;
  generatedAt: string;
}

export type DocumentTemplateCategory =
  | 'evaluation'
  | 'final_memory'
  | 'attendance'
  | 'student'
  | 'group'
  | 'work_placement'
  | 'statistics'
  | 'incidents';

export type DocumentTemplateScope =
  | 'academic_year'
  | 'programme'
  | 'level'
  | 'group'
  | 'module'
  | 'student'
  | 'company'
  | 'work_placement';

export type DocumentOutputFormat = 'docx' | 'pdf' | 'xlsx' | 'csv' | 'json';

export type DocumentTemplateVariableType =
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'array'
  | 'object';

export type DocumentPermissionRole =
  | 'Administrador'
  | 'Jefatura'
  | 'Coordinacion'
  | 'Profesor'
  | 'TutorGrupo'
  | 'TutorFCT';

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
  allowedRoles: DocumentPermissionRole[];
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

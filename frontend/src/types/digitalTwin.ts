export type DigitalTwinIntentName =
  | 'GENERAL_QUERY'
  | 'STUDENTS_QUERY'
  | 'EVALUATION_REPORT'
  | 'ACADEMIC_FOLLOWUP'
  | 'INCIDENTS_SUMMARY'
  | 'WORK_PLACEMENT_SUMMARY'
  | 'EMAIL_DRAFT'
  | 'CURRICULUM_QUERY';

export interface DigitalTwinIntent {
  intent: DigitalTwinIntentName;
  programmeAcronyms: string[];
  academicLevelNumber: number | null;
  evaluationCode: string | null;
  topic: string | null;
  confidence: number;
}

export interface DigitalTwinContext {
  kind: string;
  title: string;
  summary: string;
  warnings: string[];
  data: unknown;
}

export interface DigitalTwinProposedAction {
  type: string;
  label: string;
  status: string;
  documentType?: string;
  confirmationEndpoint?: string;
  confirmationToken?: string;
  previewSummary?: string;
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
  proposedAction: DigitalTwinProposedAction | null;
}

export interface DigitalTwinStatus {
  provider: string;
  model: string;
  baseUrl: string | null;
  enabled: boolean;
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

export interface DigitalTwinActionConfirmationResponse {
  message: string;
  action: string;
  document: DigitalTwinGeneratedDocument;
}

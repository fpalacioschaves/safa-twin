import type {
  DigitalTwinIntent,
} from './digital-twin.schemas.js';

export type NumberLike = bigint | number | string | null;

export type DigitalTwinContextKind =
  | 'academic-overview'
  | 'evaluation-summary'
  | 'academic-followup'
  | 'email-audience'
  | 'work-placement-summary'
  | 'curriculum-summary'
  | 'students-summary'
  | 'incidents-summary';

export interface DigitalTwinContext {
  kind: DigitalTwinContextKind;
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

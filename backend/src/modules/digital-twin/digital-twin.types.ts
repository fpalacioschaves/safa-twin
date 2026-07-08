import type {
  DigitalTwinIntent,
} from './digital-twin.schemas.js';

export type NumberLike = bigint | number | string | null;

export type DigitalTwinContextKind =
  | 'academic-overview'
  | 'evaluation-summary'
  | 'email-audience'
  | 'work-placement-summary'
  | 'curriculum-summary'
  | 'students-summary'
  | 'attendance-summary'
  | 'incidents-summary';

export interface DigitalTwinContext {
  kind: DigitalTwinContextKind;
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

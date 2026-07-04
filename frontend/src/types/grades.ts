import type {
  AssessmentComponent,
  AssessmentScheme,
} from './assessment-schemes';

import type {
  Enrolment,
} from './enrolments';

import type {
  Evaluation,
  GradeStatus,
} from './evaluations';

export type GradeStatusFilter =
  | 'all'
  | 'active'
  | 'archived';

export interface GradeComponentScore {
  id: number;
  gradeId: number;
  assessmentComponentId: number;
  score: number | null;
  weightedScore: number | null;
  isMissing: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  assessmentComponent: AssessmentComponent;
}

export interface Grade {
  id: number;
  enrolmentId: number;
  evaluationId: number;
  assessmentSchemeId: number;
  gradeStatusId: number | null;
  numericGrade: number | null;
  finalGrade: number | null;
  isPassed: boolean | null;
  isLocked: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  enrolment: Enrolment;
  evaluation: Evaluation;
  assessmentScheme: AssessmentScheme;
  gradeStatus: GradeStatus | null;
  componentScores: GradeComponentScore[];
}

export interface GradesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListGradesParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: GradeStatusFilter;
  enrolmentId?: number;
  evaluationId?: number;
  academicYearId?: number;
  centreId?: number;
  moduleId?: number;
}

export interface ListGradesResponse {
  items: Grade[];
  pagination: GradesPagination;
}

export interface GetGradeResponse {
  grade: Grade;
}

export interface GradeComponentScoreInput {
  assessmentComponentId: number;
  score?: number;
  isMissing: boolean;
  remarks?: string;
}

export interface GradeFormInput {
  enrolmentId: number;
  evaluationId: number;
  assessmentSchemeId?: number;
  gradeStatusId?: number;
  remarks?: string;
  componentScores: GradeComponentScoreInput[];
}

export type CreateGradeInput = GradeFormInput;

export type UpdateGradeInput = GradeFormInput;

export interface GradeMutationResponse {
  message: string;
  grade: Grade;
}

export type CurriculumStatus =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export type CurriculumTab =
  | 'learning-outcomes'
  | 'evaluation-criteria'
  | 'training-actions';

export interface CurriculumModuleSummary {
  id: number;
  code: string;
  name: string;
  vocationalProgramme: {
    id: number;
    acronym: string;
    name: string;
  };
  academicLevel: {
    id: number;
    number: number;
    name: string;
  };
}

export interface CurriculumLearningOutcomeItem {
  id: number;
  moduleId: number;
  module: CurriculumModuleSummary;
  code: string;
  title: string;
  description: string | null;
  sourceReference: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CurriculumEvaluationCriterionItem {
  id: number;
  learningOutcomeId: number;
  learningOutcome: {
    id: number;
    code: string;
    title: string;
  };
  moduleId: number;
  module: CurriculumModuleSummary;
  code: string;
  title: string;
  description: string | null;
  sourceReference: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CurriculumTrainingActionItem {
  id: number;
  moduleId: number;
  module: CurriculumModuleSummary;
  code: string;
  title: string;
  description: string | null;
  plannedHours: number | null;
  sourceReference: string | null;
  sortOrder: number;
  isActive: boolean;
  relatedLearningOutcomes: {
    id: number;
    code: string;
    title: string;
  }[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CurriculumPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CurriculumListResponse<TItem> {
  items: TItem[];
  pagination: CurriculumPagination;
}

export interface CurriculumListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: CurriculumStatus;
  moduleId?: number;
  learningOutcomeId?: number;
  vocationalProgrammeAcronym?: string;
  academicLevelNumber?: number;
}

export interface CurriculumLearningOutcomeMutationRequest {
  moduleId: number;
  code: string;
  title: string;
  description?: string;
  sourceReference?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CurriculumLearningOutcomeMutationResponse {
  message: string;
  learningOutcome: CurriculumLearningOutcomeItem;
}

export interface CurriculumEvaluationCriterionMutationRequest {
  learningOutcomeId: number;
  code: string;
  title: string;
  description?: string;
  sourceReference?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CurriculumEvaluationCriterionMutationResponse {
  message: string;
  evaluationCriterion: CurriculumEvaluationCriterionItem;
}

export interface CurriculumTrainingActionMutationRequest {
  moduleId: number;
  code: string;
  title: string;
  description?: string;
  plannedHours?: number;
  sourceReference?: string;
  sortOrder: number;
  isActive: boolean;
  relatedLearningOutcomeIds: number[];
}

export interface CurriculumTrainingActionMutationResponse {
  message: string;
  trainingAction: CurriculumTrainingActionItem;
}

export interface CurriculumLearningOutcomeImportItem {
  moduleCode: string;
  vocationalProgrammeAcronym?: string;
  academicLevelNumber?: number;
  code: string;
  title: string;
  description?: string;
  sourceReference?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CurriculumEvaluationCriterionImportItem {
  moduleCode: string;
  vocationalProgrammeAcronym?: string;
  academicLevelNumber?: number;
  learningOutcomeCode: string;
  code: string;
  title: string;
  description?: string;
  sourceReference?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CurriculumTrainingActionImportItem {
  moduleCode: string;
  vocationalProgrammeAcronym?: string;
  academicLevelNumber?: number;
  code: string;
  title: string;
  description?: string;
  plannedHours?: number;
  sourceReference?: string;
  sortOrder?: number;
  isActive?: boolean;
  relatedLearningOutcomeCodes?: string[];
}

export interface CurriculumImportRequest {
  sourceName?: string;
  sourceUrl?: string;
  learningOutcomes?: CurriculumLearningOutcomeImportItem[];
  evaluationCriteria?: CurriculumEvaluationCriterionImportItem[];
  trainingActions?: CurriculumTrainingActionImportItem[];
}

export interface CurriculumImportResponse {
  message: string;
  summary: {
    learningOutcomesProcessed: number;
    evaluationCriteriaProcessed: number;
    trainingActionsProcessed: number;
    linksProcessed: number;
  };
}

export type CurriculumLearningOutcomesResponse =
  CurriculumListResponse<CurriculumLearningOutcomeItem>;

export type CurriculumEvaluationCriteriaResponse =
  CurriculumListResponse<CurriculumEvaluationCriterionItem>;

export type CurriculumTrainingActionsResponse =
  CurriculumListResponse<CurriculumTrainingActionItem>;

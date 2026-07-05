import type {
  AcademicLevel,
} from './academic-levels';

import type {
  AcademicYear,
} from './academic-years';

import type {
  Centre,
} from './centres';

import type {
  VocationalProgramme,
} from './vocational-programmes';

export type EvaluationStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'CLOSED'
  | 'LOCKED';

export type EvaluationStatusFilter =
  | 'all'
  | EvaluationStatus
  | 'archived';

export interface Evaluation {
  id: number;
  academicYearId: number;
  centreId: number;
  code: string;
  name: string;
  sequence: number;
  startsAt: string | null;
  endsAt: string | null;
  status: EvaluationStatus;
  closedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  academicYear: AcademicYear;
  centre: Centre;
}

export interface GradeStatus {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isEvaluable: boolean;
  countsAsPassed: boolean;
  countsAsNoShow: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListEvaluationsParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: EvaluationStatusFilter;
  academicYearId?: number;
  centreId?: number;
}

export interface ListEvaluationsResponse {
  items: Evaluation[];
  pagination: Pagination;
}

export interface GetEvaluationResponse {
  evaluation: Evaluation;
}

export interface EvaluationFormInput {
  academicYearId: number;
  centreId: number;
  code: string;
  name: string;
  sequence: number;
  startsAt?: string;
  endsAt?: string;
  status: EvaluationStatus;
  remarks?: string;
}

export type CreateEvaluationInput =
  EvaluationFormInput;

export type UpdateEvaluationInput =
  EvaluationFormInput;

export interface EvaluationMutationResponse {
  message: string;
  evaluation: Evaluation;
}

export type GradeStatusStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export interface ListGradeStatusesParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: GradeStatusStatusFilter;
}

export interface ListGradeStatusesResponse {
  items: GradeStatus[];
  pagination: Pagination;
}

export interface GetGradeStatusResponse {
  gradeStatus: GradeStatus;
}

export interface GradeStatusFormInput {
  code: string;
  name: string;
  description?: string;
  isEvaluable: boolean;
  countsAsPassed: boolean;
  countsAsNoShow: boolean;
  sortOrder: number;
  isActive: boolean;
}

export type CreateGradeStatusInput =
  GradeStatusFormInput;

export type UpdateGradeStatusInput =
  GradeStatusFormInput;

export interface GradeStatusMutationResponse {
  message: string;
  gradeStatus: GradeStatus;
}

export interface EvaluationStatisticsParameters {
  moduleId?: number;
  vocationalProgrammeId?: number;
  academicLevelId?: number;
}

export interface EvaluationStatisticsFilters {
  moduleId: number | null;
  vocationalProgrammeId: number | null;
  academicLevelId: number | null;
}

export interface EvaluationStatisticsTotals {
  enrolled: number;
  numericEvaluated: number;
  passed: number;
  failed: number;
  notNumericallyEvaluated: number;
  withoutGradeRecord: number;
  withoutNumericStatus: number;
}

export interface EvaluationStatisticsRates {
  successRate: number | null;
  performanceRate: number | null;
}

export interface EvaluationNonNumericStatusStatistic {
  code: string;
  name: string;
  isEvaluable: boolean;
  countsAsPassed: boolean;
  countsAsNoShow: boolean;
  total: number;
}

export interface EvaluationStatisticsSummary {
  totals: EvaluationStatisticsTotals;
  rates: EvaluationStatisticsRates;
  nonNumericStatuses: EvaluationNonNumericStatusStatistic[];
}

export interface EvaluationStatisticsModule {
  id: number;
  code: string;
  name: string;
  acronym: string | null;
  vocationalProgrammeId: number;
  academicLevelId: number;
  vocationalProgramme: Pick<
    VocationalProgramme,
    'id' | 'code' | 'name' | 'acronym'
  >;
  academicLevel: Pick<
    AcademicLevel,
    'id' | 'number' | 'name'
  >;
}

export interface EvaluationModuleStatistics {
  module: EvaluationStatisticsModule;
  statistics: EvaluationStatisticsSummary;
}

export interface EvaluationStatisticsResponse {
  evaluation: Evaluation;
  filters: EvaluationStatisticsFilters;
  summary: EvaluationStatisticsSummary;
  modules: EvaluationModuleStatistics[];
  formulas: {
    successRate: string;
    performanceRate: string;
    nonNumericStatuses: string;
  };
}
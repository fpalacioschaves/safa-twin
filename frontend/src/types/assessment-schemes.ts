import type {
  AcademicYear,
} from './academic-years';

import type {
  Centre,
} from './centres';

import type {
  ProfessionalModule,
} from './modules';

export type AssessmentComponentType =
  | 'ACTIVITIES'
  | 'SELF_ASSESSMENTS'
  | 'FORUMS'
  | 'COMPANY'
  | 'OTHER';

export type AssessmentSchemeStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export type AssessmentSchemeDualFilter =
  | 'all'
  | 'dual'
  | 'non-dual';

export interface AssessmentComponent {
  id: number;
  assessmentSchemeId: number;
  code: string;
  name: string;
  type: AssessmentComponentType;
  percentage: number;
  sortOrder: number;
  isRequired: boolean;
  isCompanyComponent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentScheme {
  id: number;
  academicYearId: number;
  centreId: number;
  moduleId: number;
  name: string;
  isDual: boolean;
  isActive: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  academicYear: AcademicYear;
  centre: Centre;
  module: ProfessionalModule;
  components: AssessmentComponent[];
}

export interface AssessmentSchemesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListAssessmentSchemesResponse {
  items: AssessmentScheme[];
  pagination: AssessmentSchemesPagination;
}

export interface ListAssessmentSchemesParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: AssessmentSchemeStatusFilter;
  dual: AssessmentSchemeDualFilter;
  academicYearId?: number;
  centreId?: number;
  moduleId?: number;
}

export interface AssessmentComponentInput {
  code: string;
  name: string;
  type: AssessmentComponentType;
  percentage: number;
  sortOrder: number;
  isRequired: boolean;
  isCompanyComponent: boolean;
}

export interface CreateAssessmentSchemeInput {
  academicYearId: number;
  centreId: number;
  moduleId: number;
  name: string;
  isDual: boolean;
  isActive: boolean;
  remarks?: string;
  components: AssessmentComponentInput[];
}

export interface UpdateAssessmentSchemeInput {
  academicYearId: number;
  centreId: number;
  moduleId: number;
  name: string;
  isDual: boolean;
  isActive: boolean;
  remarks?: string;
  components: AssessmentComponentInput[];
}

export interface GetAssessmentSchemeResponse {
  assessmentScheme: AssessmentScheme;
}

export interface AssessmentSchemeMutationResponse {
  message: string;
  assessmentScheme: AssessmentScheme;
}

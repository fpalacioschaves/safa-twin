export type AcademicLevelStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export interface AcademicLevelSummary {
  totalOfferingCount: number;
  totalModuleCount: number;
}

export interface AcademicLevel {
  id: number;
  number: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  summary: AcademicLevelSummary;
}

export interface AcademicLevelsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListAcademicLevelsResponse {
  items: AcademicLevel[];
  pagination: AcademicLevelsPagination;
}

export interface ListAcademicLevelsParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: AcademicLevelStatusFilter;
  number?: number;
}

export interface GetAcademicLevelResponse {
  academicLevel: AcademicLevel;
}

export interface CreateAcademicLevelInput {
  number: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface UpdateAcademicLevelInput {
  number: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface AcademicLevelMutationResponse {
  message: string;
  academicLevel: AcademicLevel;
}

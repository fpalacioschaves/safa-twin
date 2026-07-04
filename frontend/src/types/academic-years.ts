export type AcademicYearStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export type AcademicYearCurrentFilter =
  | 'all'
  | 'current'
  | 'not-current';

export interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AcademicYearsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListAcademicYearsResponse {
  items: AcademicYear[];
  pagination: AcademicYearsPagination;
}

export interface ListAcademicYearsParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: AcademicYearStatusFilter;
  current: AcademicYearCurrentFilter;
}

export interface GetAcademicYearResponse {
  academicYear: AcademicYear;
}

export interface CreateAcademicYearInput {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface UpdateAcademicYearInput {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface AcademicYearMutationResponse {
  message: string;
  academicYear: AcademicYear;
}
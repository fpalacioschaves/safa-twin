export type VocationalProgrammeStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export type ProgrammeType =
  | 'BASIC'
  | 'INTERMEDIATE'
  | 'HIGHER'
  | 'SPECIALIZATION';

export type ProgrammeTypeFilter =
  | 'all'
  | ProgrammeType;

export interface VocationalProgramme {
  id: number;
  code: string;
  name: string;
  acronym: string;
  family: string | null;
  type: ProgrammeType;
  totalHours: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface VocationalProgrammesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListVocationalProgrammesResponse {
  items: VocationalProgramme[];
  pagination: VocationalProgrammesPagination;
}

export interface ListVocationalProgrammesParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: VocationalProgrammeStatusFilter;
  type: ProgrammeTypeFilter;
}

export interface GetVocationalProgrammeResponse {
  vocationalProgramme: VocationalProgramme;
}

export interface CreateVocationalProgrammeInput {
  code: string;
  name: string;
  acronym: string;
  family?: string;
  type: ProgrammeType;
  totalHours?: number;
  description?: string;
  isActive: boolean;
}

export interface UpdateVocationalProgrammeInput {
  code: string;
  name: string;
  acronym: string;
  family?: string;
  type: ProgrammeType;
  totalHours?: number;
  description?: string;
  isActive: boolean;
}

export interface VocationalProgrammeMutationResponse {
  message: string;
  vocationalProgramme: VocationalProgramme;
}

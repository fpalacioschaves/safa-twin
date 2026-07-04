import type {
  AcademicLevel,
} from './academic-levels';

import type {
  VocationalProgramme,
} from './vocational-programmes';

export type ModuleStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export interface ModuleProgrammeSummary {
  id: number;
  code: string;
  name: string;
  acronym: string;
  type: VocationalProgramme['type'];
  isActive: boolean;
  deletedAt: string | null;
}

export interface ModuleAcademicLevelSummary {
  id: number;
  number: number;
  name: string;
  isActive: boolean;
  deletedAt: string | null;
}

export interface ProfessionalModule {
  id: number;
  vocationalProgrammeId: number;
  academicLevelId: number;
  code: string;
  name: string;
  acronym: string | null;
  totalHours: number | null;
  weeklyHours: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  vocationalProgramme: ModuleProgrammeSummary;
  academicLevel: ModuleAcademicLevelSummary;
}

export interface ModulesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListModulesResponse {
  items: ProfessionalModule[];
  pagination: ModulesPagination;
}

export interface ListModulesParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: ModuleStatusFilter;
  vocationalProgrammeId?: number;
  academicLevelId?: number;
}

export interface GetModuleResponse {
  module: ProfessionalModule;
}

export interface CreateModuleInput {
  vocationalProgrammeId: number;
  academicLevelId: number;
  code: string;
  name: string;
  acronym?: string;
  totalHours?: number;
  weeklyHours?: number;
  sortOrder: number;
  isActive: boolean;
}

export interface UpdateModuleInput {
  vocationalProgrammeId: number;
  academicLevelId: number;
  code: string;
  name: string;
  acronym?: string;
  totalHours?: number;
  weeklyHours?: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ModuleMutationResponse {
  message: string;
  module: ProfessionalModule;
}

export type ModuleFormVocationalProgramme =
  Pick<
    VocationalProgramme,
    | 'id'
    | 'code'
    | 'name'
    | 'acronym'
    | 'isActive'
    | 'deletedAt'
  >;

export type ModuleFormAcademicLevel =
  Pick<
    AcademicLevel,
    | 'id'
    | 'number'
    | 'name'
    | 'isActive'
    | 'deletedAt'
  >;

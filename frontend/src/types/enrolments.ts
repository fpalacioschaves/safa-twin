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

export type EnrolmentStatus =
  | 'ENROLLED'
  | 'WITHDRAWN'
  | 'CONVALIDATED'
  | 'EXEMPT'
  | 'PENDING'
  | 'COMPLETED';

export type EnrolmentStatusFilter =
  | 'all'
  | EnrolmentStatus;

export interface EnrolmentStudent {
  id: number;
  studentCode: string | null;
  firstName: string;
  lastName1: string;
  lastName2: string | null;
  documentNumber: string | null;
  fullName: string;
}

export interface EnrolmentModule {
  id: number;
  code: string;
  name: string;
  acronym: string | null;
  totalHours: number | null;
  weeklyHours: string | null;
  isActive: boolean;
  deletedAt: string | null;
  vocationalProgramme: Pick<
    VocationalProgramme,
    | 'id'
    | 'code'
    | 'name'
    | 'acronym'
  >;
  academicLevel: Pick<
    AcademicLevel,
    | 'id'
    | 'number'
    | 'name'
  >;
}

export interface Enrolment {
  id: number;
  studentId: number;
  academicYearId: number;
  centreId: number;
  moduleId: number;
  status: EnrolmentStatus;
  enrolledAt: string;
  cancelledAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  student: EnrolmentStudent;
  academicYear: AcademicYear;
  centre: Centre;
  module: EnrolmentModule;
}

export interface EnrolmentsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListEnrolmentsResponse {
  items: Enrolment[];
  pagination: EnrolmentsPagination;
}

export interface ListEnrolmentsParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: EnrolmentStatusFilter;
  studentId?: number;
  academicYearId?: number;
  centreId?: number;
  vocationalProgrammeId?: number;
  academicLevelId?: number;
  moduleId?: number;
}

export interface GetEnrolmentResponse {
  enrolment: Enrolment;
}

export interface CreateEnrolmentInput {
  studentId: number;
  academicYearId: number;
  centreId: number;
  moduleId: number;
  status: EnrolmentStatus;
  enrolledAt: string;
  cancelledAt?: string;
  remarks?: string;
}

export interface UpdateEnrolmentInput {
  studentId: number;
  academicYearId: number;
  centreId: number;
  moduleId: number;
  status: EnrolmentStatus;
  enrolledAt: string;
  cancelledAt?: string;
  remarks?: string;
}

export interface EnrolmentMutationResponse {
  message: string;
  enrolment: Enrolment;
}

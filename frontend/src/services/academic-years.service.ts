import type {
  AcademicYearMutationResponse,
  CreateAcademicYearInput,
  GetAcademicYearResponse,
  ListAcademicYearsParameters,
  ListAcademicYearsResponse,
  UpdateAcademicYearInput,
} from '../types/academic-years';

import {
  apiRequest,
} from './api.service';

const ACADEMIC_YEARS_API_URL =
  '/api/academic-years';

export async function getAcademicYears(
  parameters: ListAcademicYearsParameters,
): Promise<ListAcademicYearsResponse> {
  const query = new URLSearchParams();

  query.set(
    'page',
    parameters.page.toString(),
  );

  query.set(
    'pageSize',
    parameters.pageSize.toString(),
  );

  query.set(
    'status',
    parameters.status,
  );

  query.set(
    'current',
    parameters.current,
  );

  if (parameters.search) {
    query.set(
      'search',
      parameters.search,
    );
  }

  return apiRequest<ListAcademicYearsResponse>(
    `${ACADEMIC_YEARS_API_URL}?${query.toString()}`,
  );
}

export async function getAcademicYear(
  academicYearId: number,
): Promise<GetAcademicYearResponse> {
  return apiRequest<GetAcademicYearResponse>(
    `${ACADEMIC_YEARS_API_URL}/${academicYearId}`,
  );
}

export async function createAcademicYear(
  input: CreateAcademicYearInput,
): Promise<AcademicYearMutationResponse> {
  return apiRequest<AcademicYearMutationResponse>(
    ACADEMIC_YEARS_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateAcademicYear(
  academicYearId: number,
  input: UpdateAcademicYearInput,
): Promise<AcademicYearMutationResponse> {
  return apiRequest<AcademicYearMutationResponse>(
    `${ACADEMIC_YEARS_API_URL}/${academicYearId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function setCurrentAcademicYear(
  academicYearId: number,
): Promise<AcademicYearMutationResponse> {
  return apiRequest<AcademicYearMutationResponse>(
    `${ACADEMIC_YEARS_API_URL}/${academicYearId}/set-current`,
    {
      method: 'PATCH',
    },
  );
}

export async function archiveAcademicYear(
  academicYearId: number,
): Promise<AcademicYearMutationResponse> {
  return apiRequest<AcademicYearMutationResponse>(
    `${ACADEMIC_YEARS_API_URL}/${academicYearId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreAcademicYear(
  academicYearId: number,
): Promise<AcademicYearMutationResponse> {
  return apiRequest<AcademicYearMutationResponse>(
    `${ACADEMIC_YEARS_API_URL}/${academicYearId}/restore`,
    {
      method: 'POST',
    },
  );
}
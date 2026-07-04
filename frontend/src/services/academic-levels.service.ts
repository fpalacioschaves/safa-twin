import type {
  AcademicLevelMutationResponse,
  CreateAcademicLevelInput,
  GetAcademicLevelResponse,
  ListAcademicLevelsParameters,
  ListAcademicLevelsResponse,
  UpdateAcademicLevelInput,
} from '../types/academic-levels';

import {
  apiRequest,
} from './api.service';

const ACADEMIC_LEVELS_API_URL = '/api/academic-levels';

export async function getAcademicLevels(
  parameters: ListAcademicLevelsParameters,
): Promise<ListAcademicLevelsResponse> {
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

  if (parameters.search) {
    query.set(
      'search',
      parameters.search,
    );
  }

  if (parameters.number !== undefined) {
    query.set(
      'number',
      parameters.number.toString(),
    );
  }

  return apiRequest<ListAcademicLevelsResponse>(
    `${ACADEMIC_LEVELS_API_URL}?${query.toString()}`,
  );
}

export async function getAcademicLevel(
  academicLevelId: number,
): Promise<GetAcademicLevelResponse> {
  return apiRequest<GetAcademicLevelResponse>(
    `${ACADEMIC_LEVELS_API_URL}/${academicLevelId}`,
  );
}

export async function createAcademicLevel(
  input: CreateAcademicLevelInput,
): Promise<AcademicLevelMutationResponse> {
  return apiRequest<AcademicLevelMutationResponse>(
    ACADEMIC_LEVELS_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateAcademicLevel(
  academicLevelId: number,
  input: UpdateAcademicLevelInput,
): Promise<AcademicLevelMutationResponse> {
  return apiRequest<AcademicLevelMutationResponse>(
    `${ACADEMIC_LEVELS_API_URL}/${academicLevelId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveAcademicLevel(
  academicLevelId: number,
): Promise<AcademicLevelMutationResponse> {
  return apiRequest<AcademicLevelMutationResponse>(
    `${ACADEMIC_LEVELS_API_URL}/${academicLevelId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreAcademicLevel(
  academicLevelId: number,
): Promise<AcademicLevelMutationResponse> {
  return apiRequest<AcademicLevelMutationResponse>(
    `${ACADEMIC_LEVELS_API_URL}/${academicLevelId}/restore`,
    {
      method: 'POST',
    },
  );
}

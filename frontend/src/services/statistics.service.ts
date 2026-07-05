import type {
  AcademicStatisticsParameters,
  AcademicStatisticsResponse,
} from '../types/statistics';

import {
  apiRequest,
} from './api.service';

const BASE_URL = '/api/statistics';

export async function getAcademicStatistics(
  parameters: AcademicStatisticsParameters = {},
): Promise<AcademicStatisticsResponse> {
  const query = new URLSearchParams();

  if (parameters.academicYearId) {
    query.set(
      'academicYearId',
      parameters.academicYearId.toString(),
    );
  }

  if (parameters.centreId) {
    query.set(
      'centreId',
      parameters.centreId.toString(),
    );
  }

  if (parameters.vocationalProgrammeId) {
    query.set(
      'vocationalProgrammeId',
      parameters.vocationalProgrammeId.toString(),
    );
  }

  if (parameters.academicLevelId) {
    query.set(
      'academicLevelId',
      parameters.academicLevelId.toString(),
    );
  }

  if (parameters.moduleId) {
    query.set(
      'moduleId',
      parameters.moduleId.toString(),
    );
  }

  if (parameters.evaluationId) {
    query.set(
      'evaluationId',
      parameters.evaluationId.toString(),
    );
  }

  const queryString = query.toString();

  return apiRequest<AcademicStatisticsResponse>(
    queryString
      ? `${BASE_URL}/academic-summary?${queryString}`
      : `${BASE_URL}/academic-summary`,
  );
}

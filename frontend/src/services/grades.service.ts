import type {
  CreateGradeInput,
  GetGradeResponse,
  GradeMutationResponse,
  ListGradesParameters,
  ListGradesResponse,
  UpdateGradeInput,
} from '../types/grades';

import {
  apiRequest,
} from './api.service';

const GRADES_API_URL = '/api/grades';

export async function getGrades(
  parameters: ListGradesParameters,
): Promise<ListGradesResponse> {
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
    query.set('search', parameters.search);
  }

  if (parameters.enrolmentId) {
    query.set(
      'enrolmentId',
      parameters.enrolmentId.toString(),
    );
  }

  if (parameters.evaluationId) {
    query.set(
      'evaluationId',
      parameters.evaluationId.toString(),
    );
  }

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

  if (parameters.moduleId) {
    query.set(
      'moduleId',
      parameters.moduleId.toString(),
    );
  }

  return apiRequest<ListGradesResponse>(
    `${GRADES_API_URL}?${query.toString()}`,
  );
}

export async function getGrade(
  gradeId: number,
): Promise<GetGradeResponse> {
  return apiRequest<GetGradeResponse>(
    `${GRADES_API_URL}/${gradeId}`,
  );
}

export async function createGrade(
  input: CreateGradeInput,
): Promise<GradeMutationResponse> {
  return apiRequest<GradeMutationResponse>(
    GRADES_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateGrade(
  gradeId: number,
  input: UpdateGradeInput,
): Promise<GradeMutationResponse> {
  return apiRequest<GradeMutationResponse>(
    `${GRADES_API_URL}/${gradeId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveGrade(
  gradeId: number,
): Promise<GradeMutationResponse> {
  return apiRequest<GradeMutationResponse>(
    `${GRADES_API_URL}/${gradeId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreGrade(
  gradeId: number,
): Promise<GradeMutationResponse> {
  return apiRequest<GradeMutationResponse>(
    `${GRADES_API_URL}/${gradeId}/restore`,
    {
      method: 'POST',
    },
  );
}

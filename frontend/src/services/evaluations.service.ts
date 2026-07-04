import type {
  CreateEvaluationInput,
  CreateGradeStatusInput,
  EvaluationMutationResponse,
  GetEvaluationResponse,
  GetGradeStatusResponse,
  GradeStatusMutationResponse,
  ListEvaluationsParameters,
  ListEvaluationsResponse,
  ListGradeStatusesParameters,
  ListGradeStatusesResponse,
  UpdateEvaluationInput,
  UpdateGradeStatusInput,
} from '../types/evaluations';

import {
  apiRequest,
} from './api.service';

const EVALUATIONS_API_URL =
  '/api/evaluations';

const GRADE_STATUSES_API_URL =
  '/api/grade-statuses';

export async function getEvaluations(
  parameters: ListEvaluationsParameters,
): Promise<ListEvaluationsResponse> {
  const query = new URLSearchParams();

  query.set('page', parameters.page.toString());
  query.set(
    'pageSize',
    parameters.pageSize.toString(),
  );
  query.set('status', parameters.status);

  if (parameters.search) {
    query.set('search', parameters.search);
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

  return apiRequest<ListEvaluationsResponse>(
    `${EVALUATIONS_API_URL}?${query.toString()}`,
  );
}

export async function getEvaluation(
  evaluationId: number,
): Promise<GetEvaluationResponse> {
  return apiRequest<GetEvaluationResponse>(
    `${EVALUATIONS_API_URL}/${evaluationId}`,
  );
}

export async function createEvaluation(
  input: CreateEvaluationInput,
): Promise<EvaluationMutationResponse> {
  return apiRequest<EvaluationMutationResponse>(
    EVALUATIONS_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateEvaluation(
  evaluationId: number,
  input: UpdateEvaluationInput,
): Promise<EvaluationMutationResponse> {
  return apiRequest<EvaluationMutationResponse>(
    `${EVALUATIONS_API_URL}/${evaluationId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveEvaluation(
  evaluationId: number,
): Promise<EvaluationMutationResponse> {
  return apiRequest<EvaluationMutationResponse>(
    `${EVALUATIONS_API_URL}/${evaluationId}`,
    { method: 'DELETE' },
  );
}

export async function restoreEvaluation(
  evaluationId: number,
): Promise<EvaluationMutationResponse> {
  return apiRequest<EvaluationMutationResponse>(
    `${EVALUATIONS_API_URL}/${evaluationId}/restore`,
    { method: 'POST' },
  );
}

export async function getGradeStatuses(
  parameters: ListGradeStatusesParameters,
): Promise<ListGradeStatusesResponse> {
  const query = new URLSearchParams();

  query.set('page', parameters.page.toString());
  query.set(
    'pageSize',
    parameters.pageSize.toString(),
  );
  query.set('status', parameters.status);

  if (parameters.search) {
    query.set('search', parameters.search);
  }

  return apiRequest<ListGradeStatusesResponse>(
    `${GRADE_STATUSES_API_URL}?${query.toString()}`,
  );
}

export async function getGradeStatus(
  gradeStatusId: number,
): Promise<GetGradeStatusResponse> {
  return apiRequest<GetGradeStatusResponse>(
    `${GRADE_STATUSES_API_URL}/${gradeStatusId}`,
  );
}

export async function createGradeStatus(
  input: CreateGradeStatusInput,
): Promise<GradeStatusMutationResponse> {
  return apiRequest<GradeStatusMutationResponse>(
    GRADE_STATUSES_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateGradeStatus(
  gradeStatusId: number,
  input: UpdateGradeStatusInput,
): Promise<GradeStatusMutationResponse> {
  return apiRequest<GradeStatusMutationResponse>(
    `${GRADE_STATUSES_API_URL}/${gradeStatusId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveGradeStatus(
  gradeStatusId: number,
): Promise<GradeStatusMutationResponse> {
  return apiRequest<GradeStatusMutationResponse>(
    `${GRADE_STATUSES_API_URL}/${gradeStatusId}`,
    { method: 'DELETE' },
  );
}

export async function restoreGradeStatus(
  gradeStatusId: number,
): Promise<GradeStatusMutationResponse> {
  return apiRequest<GradeStatusMutationResponse>(
    `${GRADE_STATUSES_API_URL}/${gradeStatusId}/restore`,
    { method: 'POST' },
  );
}

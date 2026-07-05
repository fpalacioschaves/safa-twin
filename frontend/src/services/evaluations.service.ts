import type {
  CreateEvaluationInput,
  CreateGradeStatusInput,
  EvaluationMutationResponse,
  EvaluationStatisticsParameters,
  EvaluationStatisticsResponse,
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

export async function closeEvaluation(
  evaluationId: number,
): Promise<EvaluationMutationResponse> {
  return apiRequest<EvaluationMutationResponse>(
    `${EVALUATIONS_API_URL}/${evaluationId}/close`,
    {
      method: 'POST',
    },
  );
}

export async function lockEvaluation(
  evaluationId: number,
): Promise<EvaluationMutationResponse> {
  return apiRequest<EvaluationMutationResponse>(
    `${EVALUATIONS_API_URL}/${evaluationId}/lock`,
    {
      method: 'POST',
    },
  );
}

export async function reopenEvaluation(
  evaluationId: number,
): Promise<EvaluationMutationResponse> {
  return apiRequest<EvaluationMutationResponse>(
    `${EVALUATIONS_API_URL}/${evaluationId}/reopen`,
    {
      method: 'POST',
    },
  );
}

export async function getEvaluationStatistics(
  evaluationId: number,
  parameters: EvaluationStatisticsParameters = {},
): Promise<EvaluationStatisticsResponse> {
  const query = new URLSearchParams();

  if (parameters.moduleId) {
    query.set(
      'moduleId',
      parameters.moduleId.toString(),
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

  const queryString = query.toString();

  return apiRequest<EvaluationStatisticsResponse>(
    queryString
      ? `${EVALUATIONS_API_URL}/${evaluationId}/statistics?${queryString}`
      : `${EVALUATIONS_API_URL}/${evaluationId}/statistics`,
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
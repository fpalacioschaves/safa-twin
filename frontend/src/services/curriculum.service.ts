import {
  apiRequest,
} from './api.service';

import type {
  CurriculumEvaluationCriteriaResponse,
  CurriculumEvaluationCriterionMutationRequest,
  CurriculumEvaluationCriterionMutationResponse,
  CurriculumImportRequest,
  CurriculumImportResponse,
  CurriculumLearningOutcomeMutationRequest,
  CurriculumLearningOutcomeMutationResponse,
  CurriculumLearningOutcomesResponse,
  CurriculumListQuery,
  CurriculumTrainingActionMutationRequest,
  CurriculumTrainingActionMutationResponse,
  CurriculumTrainingActionsResponse,
} from '../types/curriculum';

const BASE_URL = '/api/curriculum';

function appendCommonQueryParams(
  params: URLSearchParams,
  query: CurriculumListQuery,
): void {
  if (query.search) {
    params.set(
      'search',
      query.search,
    );
  }

  if (query.page) {
    params.set(
      'page',
      query.page.toString(),
    );
  }

  if (query.pageSize) {
    params.set(
      'pageSize',
      query.pageSize.toString(),
    );
  }

  if (query.status) {
    params.set(
      'status',
      query.status,
    );
  }

  if (query.moduleId) {
    params.set(
      'moduleId',
      query.moduleId.toString(),
    );
  }

  if (query.learningOutcomeId) {
    params.set(
      'learningOutcomeId',
      query.learningOutcomeId.toString(),
    );
  }

  if (query.vocationalProgrammeAcronym) {
    params.set(
      'vocationalProgrammeAcronym',
      query.vocationalProgrammeAcronym,
    );
  }

  if (query.academicLevelNumber) {
    params.set(
      'academicLevelNumber',
      query.academicLevelNumber.toString(),
    );
  }
}

function buildQueryString(
  query: CurriculumListQuery,
): string {
  const params = new URLSearchParams();

  appendCommonQueryParams(
    params,
    query,
  );

  return params.toString();
}

export async function getCurriculumLearningOutcomes(
  query: CurriculumListQuery = {},
): Promise<CurriculumLearningOutcomesResponse> {
  const queryString = buildQueryString(query);

  return apiRequest<CurriculumLearningOutcomesResponse>(
    queryString
      ? `${BASE_URL}/learning-outcomes?${queryString}`
      : `${BASE_URL}/learning-outcomes`,
  );
}

export async function createCurriculumLearningOutcome(
  request: CurriculumLearningOutcomeMutationRequest,
): Promise<CurriculumLearningOutcomeMutationResponse> {
  return apiRequest<CurriculumLearningOutcomeMutationResponse>(
    `${BASE_URL}/learning-outcomes`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

export async function updateCurriculumLearningOutcome(
  id: number,
  request: CurriculumLearningOutcomeMutationRequest,
): Promise<CurriculumLearningOutcomeMutationResponse> {
  return apiRequest<CurriculumLearningOutcomeMutationResponse>(
    `${BASE_URL}/learning-outcomes/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(request),
    },
  );
}

export async function archiveCurriculumLearningOutcome(
  id: number,
): Promise<CurriculumLearningOutcomeMutationResponse> {
  return apiRequest<CurriculumLearningOutcomeMutationResponse>(
    `${BASE_URL}/learning-outcomes/${id}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreCurriculumLearningOutcome(
  id: number,
): Promise<CurriculumLearningOutcomeMutationResponse> {
  return apiRequest<CurriculumLearningOutcomeMutationResponse>(
    `${BASE_URL}/learning-outcomes/${id}/restore`,
    {
      method: 'PATCH',
    },
  );
}

export async function getCurriculumEvaluationCriteria(
  query: CurriculumListQuery = {},
): Promise<CurriculumEvaluationCriteriaResponse> {
  const queryString = buildQueryString(query);

  return apiRequest<CurriculumEvaluationCriteriaResponse>(
    queryString
      ? `${BASE_URL}/evaluation-criteria?${queryString}`
      : `${BASE_URL}/evaluation-criteria`,
  );
}

export async function createCurriculumEvaluationCriterion(
  request: CurriculumEvaluationCriterionMutationRequest,
): Promise<CurriculumEvaluationCriterionMutationResponse> {
  return apiRequest<CurriculumEvaluationCriterionMutationResponse>(
    `${BASE_URL}/evaluation-criteria`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

export async function updateCurriculumEvaluationCriterion(
  id: number,
  request: CurriculumEvaluationCriterionMutationRequest,
): Promise<CurriculumEvaluationCriterionMutationResponse> {
  return apiRequest<CurriculumEvaluationCriterionMutationResponse>(
    `${BASE_URL}/evaluation-criteria/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(request),
    },
  );
}

export async function archiveCurriculumEvaluationCriterion(
  id: number,
): Promise<CurriculumEvaluationCriterionMutationResponse> {
  return apiRequest<CurriculumEvaluationCriterionMutationResponse>(
    `${BASE_URL}/evaluation-criteria/${id}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreCurriculumEvaluationCriterion(
  id: number,
): Promise<CurriculumEvaluationCriterionMutationResponse> {
  return apiRequest<CurriculumEvaluationCriterionMutationResponse>(
    `${BASE_URL}/evaluation-criteria/${id}/restore`,
    {
      method: 'PATCH',
    },
  );
}

export async function getCurriculumTrainingActions(
  query: CurriculumListQuery = {},
): Promise<CurriculumTrainingActionsResponse> {
  const queryString = buildQueryString(query);

  return apiRequest<CurriculumTrainingActionsResponse>(
    queryString
      ? `${BASE_URL}/training-actions?${queryString}`
      : `${BASE_URL}/training-actions`,
  );
}

export async function createCurriculumTrainingAction(
  request: CurriculumTrainingActionMutationRequest,
): Promise<CurriculumTrainingActionMutationResponse> {
  return apiRequest<CurriculumTrainingActionMutationResponse>(
    `${BASE_URL}/training-actions`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

export async function updateCurriculumTrainingAction(
  id: number,
  request: CurriculumTrainingActionMutationRequest,
): Promise<CurriculumTrainingActionMutationResponse> {
  return apiRequest<CurriculumTrainingActionMutationResponse>(
    `${BASE_URL}/training-actions/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(request),
    },
  );
}

export async function archiveCurriculumTrainingAction(
  id: number,
): Promise<CurriculumTrainingActionMutationResponse> {
  return apiRequest<CurriculumTrainingActionMutationResponse>(
    `${BASE_URL}/training-actions/${id}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreCurriculumTrainingAction(
  id: number,
): Promise<CurriculumTrainingActionMutationResponse> {
  return apiRequest<CurriculumTrainingActionMutationResponse>(
    `${BASE_URL}/training-actions/${id}/restore`,
    {
      method: 'PATCH',
    },
  );
}

export async function importCurriculum(
  request: CurriculumImportRequest,
): Promise<CurriculumImportResponse> {
  return apiRequest<CurriculumImportResponse>(
    `${BASE_URL}/import`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

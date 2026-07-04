import type {
  AssessmentSchemeMutationResponse,
  CreateAssessmentSchemeInput,
  GetAssessmentSchemeResponse,
  ListAssessmentSchemesParameters,
  ListAssessmentSchemesResponse,
  UpdateAssessmentSchemeInput,
} from '../types/assessment-schemes';

import {
  apiRequest,
} from './api.service';

const ASSESSMENT_SCHEMES_API_URL =
  '/api/assessment-schemes';

export async function getAssessmentSchemes(
  parameters: ListAssessmentSchemesParameters,
): Promise<ListAssessmentSchemesResponse> {
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
    'dual',
    parameters.dual,
  );

  if (parameters.search) {
    query.set(
      'search',
      parameters.search,
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

  return apiRequest<ListAssessmentSchemesResponse>(
    `${ASSESSMENT_SCHEMES_API_URL}?${query.toString()}`,
  );
}

export async function getAssessmentScheme(
  assessmentSchemeId: number,
): Promise<GetAssessmentSchemeResponse> {
  return apiRequest<GetAssessmentSchemeResponse>(
    `${ASSESSMENT_SCHEMES_API_URL}/${assessmentSchemeId}`,
  );
}

export async function createAssessmentScheme(
  input: CreateAssessmentSchemeInput,
): Promise<AssessmentSchemeMutationResponse> {
  return apiRequest<AssessmentSchemeMutationResponse>(
    ASSESSMENT_SCHEMES_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateAssessmentScheme(
  assessmentSchemeId: number,
  input: UpdateAssessmentSchemeInput,
): Promise<AssessmentSchemeMutationResponse> {
  return apiRequest<AssessmentSchemeMutationResponse>(
    `${ASSESSMENT_SCHEMES_API_URL}/${assessmentSchemeId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveAssessmentScheme(
  assessmentSchemeId: number,
): Promise<AssessmentSchemeMutationResponse> {
  return apiRequest<AssessmentSchemeMutationResponse>(
    `${ASSESSMENT_SCHEMES_API_URL}/${assessmentSchemeId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreAssessmentScheme(
  assessmentSchemeId: number,
): Promise<AssessmentSchemeMutationResponse> {
  return apiRequest<AssessmentSchemeMutationResponse>(
    `${ASSESSMENT_SCHEMES_API_URL}/${assessmentSchemeId}/restore`,
    {
      method: 'POST',
    },
  );
}

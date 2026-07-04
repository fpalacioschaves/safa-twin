import type {
  CreateEnrolmentInput,
  EnrolmentMutationResponse,
  GetEnrolmentResponse,
  ListEnrolmentsParameters,
  ListEnrolmentsResponse,
  UpdateEnrolmentInput,
} from '../types/enrolments';

import {
  apiRequest,
} from './api.service';

const ENROLMENTS_API_URL =
  '/api/enrolments';

export async function getEnrolments(
  parameters: ListEnrolmentsParameters,
): Promise<ListEnrolmentsResponse> {
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

  if (parameters.studentId) {
    query.set(
      'studentId',
      parameters.studentId.toString(),
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

  return apiRequest<ListEnrolmentsResponse>(
    `${ENROLMENTS_API_URL}?${query.toString()}`,
  );
}

export async function getEnrolment(
  enrolmentId: number,
): Promise<GetEnrolmentResponse> {
  return apiRequest<GetEnrolmentResponse>(
    `${ENROLMENTS_API_URL}/${enrolmentId}`,
  );
}

export async function createEnrolment(
  input: CreateEnrolmentInput,
): Promise<EnrolmentMutationResponse> {
  return apiRequest<EnrolmentMutationResponse>(
    ENROLMENTS_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateEnrolment(
  enrolmentId: number,
  input: UpdateEnrolmentInput,
): Promise<EnrolmentMutationResponse> {
  return apiRequest<EnrolmentMutationResponse>(
    `${ENROLMENTS_API_URL}/${enrolmentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveEnrolment(
  enrolmentId: number,
): Promise<EnrolmentMutationResponse> {
  return apiRequest<EnrolmentMutationResponse>(
    `${ENROLMENTS_API_URL}/${enrolmentId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreEnrolment(
  enrolmentId: number,
): Promise<EnrolmentMutationResponse> {
  return apiRequest<EnrolmentMutationResponse>(
    `${ENROLMENTS_API_URL}/${enrolmentId}/restore`,
    {
      method: 'POST',
    },
  );
}

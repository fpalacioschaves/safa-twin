import type {
  CreateStudentInput,
  GetStudentResponse,
  ListStudentsParameters,
  ListStudentsResponse,
  StudentMutationResponse,
  UpdateStudentInput,
} from '../types/students';

import {
  apiRequest,
} from './api.service';

const STUDENTS_API_URL = '/api/students';

export async function getStudents(
  parameters: ListStudentsParameters,
): Promise<ListStudentsResponse> {
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
    'documentType',
    parameters.documentType,
  );

  if (parameters.search) {
    query.set(
      'search',
      parameters.search,
    );
  }

  return apiRequest<ListStudentsResponse>(
    `${STUDENTS_API_URL}?${query.toString()}`,
  );
}

export async function getStudent(
  studentId: number,
): Promise<GetStudentResponse> {
  return apiRequest<GetStudentResponse>(
    `${STUDENTS_API_URL}/${studentId}`,
  );
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<StudentMutationResponse> {
  return apiRequest<StudentMutationResponse>(
    STUDENTS_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateStudent(
  studentId: number,
  input: UpdateStudentInput,
): Promise<StudentMutationResponse> {
  return apiRequest<StudentMutationResponse>(
    `${STUDENTS_API_URL}/${studentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveStudent(
  studentId: number,
): Promise<StudentMutationResponse> {
  return apiRequest<StudentMutationResponse>(
    `${STUDENTS_API_URL}/${studentId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreStudent(
  studentId: number,
): Promise<StudentMutationResponse> {
  return apiRequest<StudentMutationResponse>(
    `${STUDENTS_API_URL}/${studentId}/restore`,
    {
      method: 'POST',
    },
  );
}

import type {
  CreateVocationalProgrammeInput,
  GetVocationalProgrammeResponse,
  ListVocationalProgrammesParameters,
  ListVocationalProgrammesResponse,
  UpdateVocationalProgrammeInput,
  VocationalProgrammeMutationResponse,
} from '../types/vocational-programmes';

import {
  apiRequest,
} from './api.service';

const VOCATIONAL_PROGRAMMES_API_URL =
  '/api/vocational-programmes';

export async function getVocationalProgrammes(
  parameters: ListVocationalProgrammesParameters,
): Promise<ListVocationalProgrammesResponse> {
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
    'type',
    parameters.type,
  );

  if (parameters.search) {
    query.set(
      'search',
      parameters.search,
    );
  }

  return apiRequest<ListVocationalProgrammesResponse>(
    `${VOCATIONAL_PROGRAMMES_API_URL}?${query.toString()}`,
  );
}

export async function getVocationalProgramme(
  vocationalProgrammeId: number,
): Promise<GetVocationalProgrammeResponse> {
  return apiRequest<GetVocationalProgrammeResponse>(
    `${VOCATIONAL_PROGRAMMES_API_URL}/${vocationalProgrammeId}`,
  );
}

export async function createVocationalProgramme(
  input: CreateVocationalProgrammeInput,
): Promise<VocationalProgrammeMutationResponse> {
  return apiRequest<VocationalProgrammeMutationResponse>(
    VOCATIONAL_PROGRAMMES_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateVocationalProgramme(
  vocationalProgrammeId: number,
  input: UpdateVocationalProgrammeInput,
): Promise<VocationalProgrammeMutationResponse> {
  return apiRequest<VocationalProgrammeMutationResponse>(
    `${VOCATIONAL_PROGRAMMES_API_URL}/${vocationalProgrammeId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveVocationalProgramme(
  vocationalProgrammeId: number,
): Promise<VocationalProgrammeMutationResponse> {
  return apiRequest<VocationalProgrammeMutationResponse>(
    `${VOCATIONAL_PROGRAMMES_API_URL}/${vocationalProgrammeId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreVocationalProgramme(
  vocationalProgrammeId: number,
): Promise<VocationalProgrammeMutationResponse> {
  return apiRequest<VocationalProgrammeMutationResponse>(
    `${VOCATIONAL_PROGRAMMES_API_URL}/${vocationalProgrammeId}/restore`,
    {
      method: 'POST',
    },
  );
}

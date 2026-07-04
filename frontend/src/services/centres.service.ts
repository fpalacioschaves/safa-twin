import type {
  CentreMutationResponse,
  CreateCentreInput,
  GetCentreResponse,
  ListCentresParameters,
  ListCentresResponse,
  UpdateCentreInput,
} from '../types/centres';

import {
  apiRequest,
} from './api.service';

const CENTRES_API_URL = '/api/centres';

export async function getCentres(
  parameters: ListCentresParameters,
): Promise<ListCentresResponse> {
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

  return apiRequest<ListCentresResponse>(
    `${CENTRES_API_URL}?${query.toString()}`,
  );
}

export async function getCentre(
  centreId: number,
): Promise<GetCentreResponse> {
  return apiRequest<GetCentreResponse>(
    `${CENTRES_API_URL}/${centreId}`,
  );
}

export async function createCentre(
  input: CreateCentreInput,
): Promise<CentreMutationResponse> {
  return apiRequest<CentreMutationResponse>(
    CENTRES_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateCentre(
  centreId: number,
  input: UpdateCentreInput,
): Promise<CentreMutationResponse> {
  return apiRequest<CentreMutationResponse>(
    `${CENTRES_API_URL}/${centreId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveCentre(
  centreId: number,
): Promise<CentreMutationResponse> {
  return apiRequest<CentreMutationResponse>(
    `${CENTRES_API_URL}/${centreId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreCentre(
  centreId: number,
): Promise<CentreMutationResponse> {
  return apiRequest<CentreMutationResponse>(
    `${CENTRES_API_URL}/${centreId}/restore`,
    {
      method: 'POST',
    },
  );
}
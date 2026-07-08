import type {
  ArchiveIncidentResponse,
  CreateIncidentInput,
  GetIncidentResponse,
  IncidentMutationResponse,
  IncidentsSummaryResponse,
  ListIncidentsParameters,
  ListIncidentsResponse,
  UpdateIncidentInput,
} from '../types/incidents';

import {
  apiRequest,
} from './api.service';

const INCIDENTS_API_URL = '/api/incidents';

function addOptionalNumberParameter(
  query: URLSearchParams,
  key: string,
  value: number | undefined,
): void {
  if (value !== undefined) {
    query.set(
      key,
      value.toString(),
    );
  }
}

function addOptionalTextParameter(
  query: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value) {
    query.set(
      key,
      value,
    );
  }
}

function buildIncidentQuery(
  parameters: ListIncidentsParameters,
): URLSearchParams {
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
    'type',
    parameters.type,
  );

  query.set(
    'severity',
    parameters.severity,
  );

  query.set(
    'resolution',
    parameters.resolution,
  );

  addOptionalTextParameter(
    query,
    'search',
    parameters.search,
  );

  addOptionalTextParameter(
    query,
    'dateFrom',
    parameters.dateFrom,
  );

  addOptionalTextParameter(
    query,
    'dateTo',
    parameters.dateTo,
  );

  addOptionalNumberParameter(
    query,
    'studentId',
    parameters.studentId,
  );

  addOptionalNumberParameter(
    query,
    'academicYearId',
    parameters.academicYearId,
  );

  addOptionalNumberParameter(
    query,
    'centreId',
    parameters.centreId,
  );

  addOptionalNumberParameter(
    query,
    'moduleId',
    parameters.moduleId,
  );

  addOptionalNumberParameter(
    query,
    'vocationalProgrammeId',
    parameters.vocationalProgrammeId,
  );

  addOptionalNumberParameter(
    query,
    'academicLevelId',
    parameters.academicLevelId,
  );

  return query;
}

export async function getIncidents(
  parameters: ListIncidentsParameters,
): Promise<ListIncidentsResponse> {
  const query = buildIncidentQuery(parameters);

  return apiRequest<ListIncidentsResponse>(
    `${INCIDENTS_API_URL}?${query.toString()}`,
  );
}

export async function getIncidentsSummary(
  parameters: Omit<
    ListIncidentsParameters,
    'page' | 'pageSize' | 'search'
  >,
): Promise<IncidentsSummaryResponse> {
  const query = buildIncidentQuery({
    ...parameters,
    page: 1,
    pageSize: 1,
  });

  query.delete('page');
  query.delete('pageSize');
  query.delete('search');

  return apiRequest<IncidentsSummaryResponse>(
    `${INCIDENTS_API_URL}/summary?${query.toString()}`,
  );
}

export async function getIncident(
  incidentId: number,
): Promise<GetIncidentResponse> {
  return apiRequest<GetIncidentResponse>(
    `${INCIDENTS_API_URL}/${incidentId}`,
  );
}

export async function createIncident(
  input: CreateIncidentInput,
): Promise<IncidentMutationResponse> {
  return apiRequest<IncidentMutationResponse>(
    INCIDENTS_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateIncident(
  incidentId: number,
  input: UpdateIncidentInput,
): Promise<IncidentMutationResponse> {
  return apiRequest<IncidentMutationResponse>(
    `${INCIDENTS_API_URL}/${incidentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveIncident(
  incidentId: number,
): Promise<ArchiveIncidentResponse> {
  return apiRequest<ArchiveIncidentResponse>(
    `${INCIDENTS_API_URL}/${incidentId}`,
    {
      method: 'DELETE',
    },
  );
}

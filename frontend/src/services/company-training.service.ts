import {
  apiRequest,
} from './api.service';

import type {
  CompanyMutationResponse,
  CompanyTrainingSummaryResponse,
  CompanyTutorMutationResponse,
  CreateCompanyInput,
  CreateCompanyTutorInput,
  CreatePlacementFollowupInput,
  CreatePlacementIncidentInput,
  CreateWorkPlacementInput,
  GetCompanyResponse,
  GetWorkPlacementResponse,
  ListCompaniesParameters,
  ListCompaniesResponse,
  ListCompanyTutorsParameters,
  ListCompanyTutorsResponse,
  ListPlacementFollowupsResponse,
  ListPlacementIncidentsResponse,
  ListWorkPlacementsParameters,
  ListWorkPlacementsResponse,
  PlacementFollowupMutationResponse,
  PlacementIncidentMutationResponse,
  UpdateCompanyInput,
  UpdateCompanyTutorInput,
  UpdatePlacementFollowupInput,
  UpdatePlacementIncidentInput,
  UpdateWorkPlacementInput,
  WorkPlacementMutationResponse,
} from '../types/company-training';

const COMPANY_TRAINING_API_URL =
  '/api/company-training';

function appendOptionalNumber(
  query: URLSearchParams,
  name: string,
  value: number | undefined,
): void {
  if (value !== undefined) {
    query.set(name, value.toString());
  }
}

function appendOptionalString(
  query: URLSearchParams,
  name: string,
  value: string | undefined,
): void {
  if (value && value.trim()) {
    query.set(name, value.trim());
  }
}

export async function getCompanyTrainingSummary():
Promise<CompanyTrainingSummaryResponse> {
  return apiRequest<CompanyTrainingSummaryResponse>(
    `${COMPANY_TRAINING_API_URL}/summary`,
  );
}

export async function getCompanies(
  parameters: ListCompaniesParameters,
): Promise<ListCompaniesResponse> {
  const query = new URLSearchParams();

  query.set('page', parameters.page.toString());
  query.set('pageSize', parameters.pageSize.toString());
  query.set('status', parameters.status);
  appendOptionalString(query, 'search', parameters.search);

  return apiRequest<ListCompaniesResponse>(
    `${COMPANY_TRAINING_API_URL}/companies?${query.toString()}`,
  );
}

export async function getCompany(
  companyId: number,
): Promise<GetCompanyResponse> {
  return apiRequest<GetCompanyResponse>(
    `${COMPANY_TRAINING_API_URL}/companies/${companyId}`,
  );
}

export async function createCompany(
  input: CreateCompanyInput,
): Promise<CompanyMutationResponse> {
  return apiRequest<CompanyMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/companies`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateCompany(
  companyId: number,
  input: UpdateCompanyInput,
): Promise<CompanyMutationResponse> {
  return apiRequest<CompanyMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/companies/${companyId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveCompany(
  companyId: number,
): Promise<CompanyMutationResponse> {
  return apiRequest<CompanyMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/companies/${companyId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreCompany(
  companyId: number,
): Promise<CompanyMutationResponse> {
  return apiRequest<CompanyMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/companies/${companyId}/restore`,
    {
      method: 'POST',
    },
  );
}

export async function getCompanyTutors(
  companyId: number,
  parameters: ListCompanyTutorsParameters,
): Promise<ListCompanyTutorsResponse> {
  const query = new URLSearchParams();
  query.set('status', parameters.status);

  return apiRequest<ListCompanyTutorsResponse>(
    `${COMPANY_TRAINING_API_URL}/companies/${companyId}/tutors?${query.toString()}`,
  );
}

export async function createCompanyTutor(
  companyId: number,
  input: CreateCompanyTutorInput,
): Promise<CompanyTutorMutationResponse> {
  return apiRequest<CompanyTutorMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/companies/${companyId}/tutors`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateCompanyTutor(
  companyTutorId: number,
  input: UpdateCompanyTutorInput,
): Promise<CompanyTutorMutationResponse> {
  return apiRequest<CompanyTutorMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/company-tutors/${companyTutorId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveCompanyTutor(
  companyTutorId: number,
): Promise<CompanyTutorMutationResponse> {
  return apiRequest<CompanyTutorMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/company-tutors/${companyTutorId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function getWorkPlacements(
  parameters: ListWorkPlacementsParameters,
): Promise<ListWorkPlacementsResponse> {
  const query = new URLSearchParams();

  query.set('page', parameters.page.toString());
  query.set('pageSize', parameters.pageSize.toString());
  query.set('recordStatus', parameters.recordStatus);
  query.set('status', parameters.status);
  appendOptionalString(query, 'search', parameters.search);
  appendOptionalNumber(query, 'academicYearId', parameters.academicYearId);
  appendOptionalNumber(query, 'centreId', parameters.centreId);
  appendOptionalNumber(query, 'companyId', parameters.companyId);
  appendOptionalNumber(query, 'studentId', parameters.studentId);

  return apiRequest<ListWorkPlacementsResponse>(
    `${COMPANY_TRAINING_API_URL}/placements?${query.toString()}`,
  );
}

export async function getWorkPlacement(
  workPlacementId: number,
): Promise<GetWorkPlacementResponse> {
  return apiRequest<GetWorkPlacementResponse>(
    `${COMPANY_TRAINING_API_URL}/placements/${workPlacementId}`,
  );
}

export async function createWorkPlacement(
  input: CreateWorkPlacementInput,
): Promise<WorkPlacementMutationResponse> {
  return apiRequest<WorkPlacementMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placements`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateWorkPlacement(
  workPlacementId: number,
  input: UpdateWorkPlacementInput,
): Promise<WorkPlacementMutationResponse> {
  return apiRequest<WorkPlacementMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placements/${workPlacementId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveWorkPlacement(
  workPlacementId: number,
): Promise<WorkPlacementMutationResponse> {
  return apiRequest<WorkPlacementMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placements/${workPlacementId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function getPlacementFollowups(
  workPlacementId: number,
): Promise<ListPlacementFollowupsResponse> {
  return apiRequest<ListPlacementFollowupsResponse>(
    `${COMPANY_TRAINING_API_URL}/placements/${workPlacementId}/followups`,
  );
}

export async function createPlacementFollowup(
  workPlacementId: number,
  input: CreatePlacementFollowupInput,
): Promise<PlacementFollowupMutationResponse> {
  return apiRequest<PlacementFollowupMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placements/${workPlacementId}/followups`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updatePlacementFollowup(
  placementFollowupId: number,
  input: UpdatePlacementFollowupInput,
): Promise<PlacementFollowupMutationResponse> {
  return apiRequest<PlacementFollowupMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placement-followups/${placementFollowupId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archivePlacementFollowup(
  placementFollowupId: number,
): Promise<PlacementFollowupMutationResponse> {
  return apiRequest<PlacementFollowupMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placement-followups/${placementFollowupId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function getPlacementIncidents(
  workPlacementId: number,
): Promise<ListPlacementIncidentsResponse> {
  return apiRequest<ListPlacementIncidentsResponse>(
    `${COMPANY_TRAINING_API_URL}/placements/${workPlacementId}/incidents`,
  );
}

export async function createPlacementIncident(
  workPlacementId: number,
  input: CreatePlacementIncidentInput,
): Promise<PlacementIncidentMutationResponse> {
  return apiRequest<PlacementIncidentMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placements/${workPlacementId}/incidents`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updatePlacementIncident(
  placementIncidentId: number,
  input: UpdatePlacementIncidentInput,
): Promise<PlacementIncidentMutationResponse> {
  return apiRequest<PlacementIncidentMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placement-incidents/${placementIncidentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archivePlacementIncident(
  placementIncidentId: number,
): Promise<PlacementIncidentMutationResponse> {
  return apiRequest<PlacementIncidentMutationResponse>(
    `${COMPANY_TRAINING_API_URL}/placement-incidents/${placementIncidentId}`,
    {
      method: 'DELETE',
    },
  );
}

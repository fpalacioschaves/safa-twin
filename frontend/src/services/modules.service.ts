import type {
  CreateModuleInput,
  GetModuleResponse,
  ListModulesParameters,
  ListModulesResponse,
  ModuleMutationResponse,
  UpdateModuleInput,
} from '../types/modules';

import {
  apiRequest,
} from './api.service';

const MODULES_API_URL = '/api/modules';

export async function getModules(
  parameters: ListModulesParameters,
): Promise<ListModulesResponse> {
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

  return apiRequest<ListModulesResponse>(
    `${MODULES_API_URL}?${query.toString()}`,
  );
}

export async function getModule(
  moduleId: number,
): Promise<GetModuleResponse> {
  return apiRequest<GetModuleResponse>(
    `${MODULES_API_URL}/${moduleId}`,
  );
}

export async function createModule(
  input: CreateModuleInput,
): Promise<ModuleMutationResponse> {
  return apiRequest<ModuleMutationResponse>(
    MODULES_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateModule(
  moduleId: number,
  input: UpdateModuleInput,
): Promise<ModuleMutationResponse> {
  return apiRequest<ModuleMutationResponse>(
    `${MODULES_API_URL}/${moduleId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function archiveModule(
  moduleId: number,
): Promise<ModuleMutationResponse> {
  return apiRequest<ModuleMutationResponse>(
    `${MODULES_API_URL}/${moduleId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreModule(
  moduleId: number,
): Promise<ModuleMutationResponse> {
  return apiRequest<ModuleMutationResponse>(
    `${MODULES_API_URL}/${moduleId}/restore`,
    {
      method: 'POST',
    },
  );
}

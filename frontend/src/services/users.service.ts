import type {
  CreateUserInput,
  GetUserResponse,
  ListAssignableRolesResponse,
  ListUsersParameters,
  ListUsersResponse,
  UpdateUserInput,
  UserMutationResponse,
} from '../types/users';

import {
  apiRequest,
} from './api.service';

const USERS_API_URL = '/api/users';

export async function getUsers(
  parameters: ListUsersParameters,
): Promise<ListUsersResponse> {
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

  return apiRequest<ListUsersResponse>(
    `${USERS_API_URL}?${query.toString()}`,
  );
}

export async function getAssignableRoles():
Promise<ListAssignableRolesResponse> {
  return apiRequest<ListAssignableRolesResponse>(
    `${USERS_API_URL}/roles`,
  );
}

export async function getUser(
  userId: number,
): Promise<GetUserResponse> {
  return apiRequest<GetUserResponse>(
    `${USERS_API_URL}/${userId}`,
  );
}

export async function createUser(
  input: CreateUserInput,
): Promise<UserMutationResponse> {
  return apiRequest<UserMutationResponse>(
    USERS_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function updateUser(
  userId: number,
  input: UpdateUserInput,
): Promise<UserMutationResponse> {
  return apiRequest<UserMutationResponse>(
    `${USERS_API_URL}/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export async function setUserActiveStatus(
  userId: number,
  isActive: boolean,
): Promise<UserMutationResponse> {
  return apiRequest<UserMutationResponse>(
    `${USERS_API_URL}/${userId}/status`,
    {
      method: 'PATCH',

      body: JSON.stringify({
        isActive,
      }),
    },
  );
}

export async function archiveUser(
  userId: number,
): Promise<UserMutationResponse> {
  return apiRequest<UserMutationResponse>(
    `${USERS_API_URL}/${userId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function restoreUser(
  userId: number,
): Promise<UserMutationResponse> {
  return apiRequest<UserMutationResponse>(
    `${USERS_API_URL}/${userId}/restore`,
    {
      method: 'POST',
    },
  );
}
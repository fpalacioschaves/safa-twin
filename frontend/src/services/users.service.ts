import type {
  ListUsersParameters,
  ListUsersResponse,
} from '../types/users';

import {
  apiRequest,
} from './api.service';

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
    `/api/users?${query.toString()}`,
  );
}
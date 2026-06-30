import type {
  AuthenticatedUser,
  AuthResponse,
  LoginCredentials,
} from '../types/auth';

import {
  ApiError,
  apiRequest,
} from './api.service';

export {
  ApiError,
};

const AUTH_API_URL = '/api/auth';

export async function login(
  credentials: LoginCredentials,
): Promise<AuthenticatedUser> {
  const response = await apiRequest<AuthResponse>(
    `${AUTH_API_URL}/login`,
    {
      method: 'POST',
      body: JSON.stringify(credentials),
    },
  );

  return response.user;
}

export async function getCurrentUser():
Promise<AuthenticatedUser> {
  const response = await apiRequest<AuthResponse>(
    `${AUTH_API_URL}/me`,
  );

  return response.user;
}

export async function logout(): Promise<void> {
  await apiRequest<void>(
    `${AUTH_API_URL}/logout`,
    {
      method: 'POST',
    },
  );
}
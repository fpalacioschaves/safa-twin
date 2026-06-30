import type {
  ApiErrorResponse,
  AuthenticatedUser,
  AuthResponse,
  LoginCredentials,
} from '../types/auth';

const AUTH_API_URL = '/api/auth';

export class ApiError extends Error {
  public readonly status: number;

  public constructor(
    status: number,
    message: string,
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Se ha producido un error inesperado.';

    try {
      const errorResponse =
        await response.json() as ApiErrorResponse;

      if (errorResponse.error?.message) {
        message = errorResponse.error.message;
      }
    } catch {
      // La respuesta no contenía un JSON válido.
    }

    throw new ApiError(
      response.status,
      message,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}

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
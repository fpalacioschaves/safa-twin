import type {
  ApiErrorResponse,
} from '../types/auth';

export class ApiError extends Error {
  public readonly status: number;

  public readonly code: string | null;

  public constructor(
    status: number,
    message: string,
    code: string | null = null,
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (
    options.body
    && !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      0,
      'No se ha podido conectar con el servidor.',
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    let message =
      'Se ha producido un error inesperado.';

    let code: string | null = null;

    try {
      const errorResponse =
        await response.json() as ApiErrorResponse;

      if (errorResponse.error?.message) {
        message = errorResponse.error.message;
      }

      if (errorResponse.error?.code) {
        code = errorResponse.error.code;
      }
    } catch {
      // La respuesta no contenía JSON válido.
    }

    throw new ApiError(
      response.status,
      message,
      code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}
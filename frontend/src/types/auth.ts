export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  user: AuthenticatedUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
}
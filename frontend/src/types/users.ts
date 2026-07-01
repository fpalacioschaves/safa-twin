export type UserStatusFilter =
  | 'all'
  | 'active'
  | 'archived';

export interface UserRoleSummary {
  name: string;
  slug: string;
}

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  roles: UserRoleSummary[];
}

export interface UsersPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListUsersResponse {
  items: UserListItem[];
  pagination: UsersPagination;
}

export interface ListUsersParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: UserStatusFilter;
}

export interface AssignableRole {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface ListAssignableRolesResponse {
  items: AssignableRole[];
}

export interface UserDetail {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  roles: AssignableRole[];
}

export interface GetUserResponse {
  user: UserDetail;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  roleIds: number[];
}

export interface UpdateUserInput {
  name: string;
  email: string;
  roleIds: number[];
  password?: string;
  passwordConfirmation?: string;
}

export interface UserMutationResponse {
  message: string;
  user: UserDetail;
}
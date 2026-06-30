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
export type CentreStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export interface Centre {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  taxId: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CentresPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListCentresResponse {
  items: Centre[];
  pagination: CentresPagination;
}

export interface ListCentresParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: CentreStatusFilter;
}

export interface GetCentreResponse {
  centre: Centre;
}

export interface CreateCentreInput {
  code: string;
  name: string;
  shortName?: string;
  taxId?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface UpdateCentreInput {
  code: string;
  name: string;
  shortName?: string;
  taxId?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface CentreMutationResponse {
  message: string;
  centre: Centre;
}
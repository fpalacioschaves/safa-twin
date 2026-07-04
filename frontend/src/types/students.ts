export type StudentStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export type StudentDocumentType =
  | 'DNI'
  | 'NIE'
  | 'PASSPORT'
  | 'OTHER';

export type StudentDocumentTypeFilter =
  | 'all'
  | StudentDocumentType;

export interface Student {
  id: number;
  studentCode: string | null;
  firstName: string;
  lastName1: string;
  lastName2: string | null;
  fullName: string;
  documentType: StudentDocumentType | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface StudentsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListStudentsResponse {
  items: Student[];
  pagination: StudentsPagination;
}

export interface ListStudentsParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: StudentStatusFilter;
  documentType: StudentDocumentTypeFilter;
}

export interface GetStudentResponse {
  student: Student;
}

export interface CreateStudentInput {
  studentCode?: string;
  firstName: string;
  lastName1: string;
  lastName2?: string;
  documentType?: StudentDocumentType;
  documentNumber?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  isActive: boolean;
}

export interface UpdateStudentInput {
  studentCode?: string;
  firstName: string;
  lastName1: string;
  lastName2?: string;
  documentType?: StudentDocumentType;
  documentNumber?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  isActive: boolean;
}

export interface StudentMutationResponse {
  message: string;
  student: Student;
}

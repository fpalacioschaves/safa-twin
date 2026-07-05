export type RecordStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'archived';

export type WorkPlacementStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type WorkPlacementStatusFilter =
  | 'all'
  | WorkPlacementStatus;

export type PlacementFollowupType =
  | 'VISIT'
  | 'PHONE'
  | 'EMAIL'
  | 'MEETING'
  | 'OTHER';

export type PlacementIncidentSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export interface CompanyTrainingSummary {
  companiesCount: number;
  activeCompanyTutorsCount: number;
  activePlacementsCount: number;
  placementsWithPendingDocumentationCount: number;
  openIncidentsCount?: number;
  followupsCount?: number;
  placementsByStatus: Record<WorkPlacementStatus, number>;
}

export interface CompanyTrainingSummaryResponse {
  summary: CompanyTrainingSummary;
}

export interface CompanyTrainingPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Company {
  id: number;
  name: string;
  taxIdentifier: string | null;
  sector: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  tutorsCount: number;
  placementsCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CompanyTutor {
  id: number;
  companyId: number;
  companyName: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkPlacement {
  id: number;
  studentId: number;
  studentCode: string | null;
  studentFullName: string;
  academicYearId: number;
  academicYearName: string;
  centreId: number;
  centreCode: string;
  centreName: string;
  companyId: number;
  companyName: string;
  companyTutorId: number | null;
  companyTutorFullName: string | null;
  academicTutorUserId: number | null;
  academicTutorName: string | null;
  status: WorkPlacementStatus;
  startsAt: string | null;
  endsAt: string | null;
  schedule: string | null;
  totalHours: number | null;
  completedHours: number | null;
  activities: string | null;
  learningOutcomes: string | null;
  finalEvaluation: string | null;
  documentationPending: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PlacementFollowup {
  id: number;
  workPlacementId: number;
  workPlacementLabel: string;
  companyId: number;
  companyName: string;
  studentFullName: string;
  createdByUserId: number | null;
  createdByUserName: string | null;
  createdByUserEmail: string | null;
  followupType: PlacementFollowupType;
  followupAt: string;
  title: string;
  description: string | null;
  nextActions: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PlacementIncident {
  id: number;
  workPlacementId: number;
  workPlacementLabel: string;
  companyId: number;
  companyName: string;
  studentFullName: string;
  createdByUserId: number | null;
  createdByUserName: string | null;
  createdByUserEmail: string | null;
  severity: PlacementIncidentSeverity;
  occurredAt: string;
  title: string;
  description: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ListCompaniesParameters {
  search?: string;
  page: number;
  pageSize: number;
  status: RecordStatusFilter;
}

export interface ListCompaniesResponse {
  items: Company[];
  pagination: CompanyTrainingPagination;
}

export interface GetCompanyResponse {
  company: Company;
}

export interface CreateCompanyInput {
  name: string;
  taxIdentifier?: string;
  sector?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
}

export interface UpdateCompanyInput extends CreateCompanyInput {}

export interface CompanyMutationResponse {
  message: string;
  company: Company;
}

export interface ListCompanyTutorsParameters {
  status: RecordStatusFilter;
}

export interface ListCompanyTutorsResponse {
  items: CompanyTutor[];
}

export interface CreateCompanyTutorInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
  isActive: boolean;
}

export interface UpdateCompanyTutorInput extends CreateCompanyTutorInput {}

export interface CompanyTutorMutationResponse {
  message: string;
  companyTutor: CompanyTutor;
}

export interface ListWorkPlacementsParameters {
  search?: string;
  page: number;
  pageSize: number;
  recordStatus: RecordStatusFilter;
  status: WorkPlacementStatusFilter;
  academicYearId?: number;
  centreId?: number;
  companyId?: number;
  studentId?: number;
}

export interface ListWorkPlacementsResponse {
  items: WorkPlacement[];
  pagination: CompanyTrainingPagination;
}

export interface GetWorkPlacementResponse {
  workPlacement: WorkPlacement;
}

export interface CreateWorkPlacementInput {
  studentId: number;
  academicYearId: number;
  centreId: number;
  companyId: number;
  companyTutorId?: number;
  academicTutorUserId?: number;
  status: WorkPlacementStatus;
  startsAt?: string;
  endsAt?: string;
  schedule?: string;
  totalHours?: number;
  completedHours?: number;
  activities?: string;
  learningOutcomes?: string;
  finalEvaluation?: string;
  documentationPending: boolean;
  remarks?: string;
}

export interface UpdateWorkPlacementInput extends CreateWorkPlacementInput {}

export interface WorkPlacementMutationResponse {
  message: string;
  workPlacement: WorkPlacement;
}

export interface ListPlacementFollowupsResponse {
  items: PlacementFollowup[];
}

export interface CreatePlacementFollowupInput {
  followupType: PlacementFollowupType;
  followupAt: string;
  title: string;
  description?: string;
  nextActions?: string;
}

export interface UpdatePlacementFollowupInput extends CreatePlacementFollowupInput {}

export interface PlacementFollowupMutationResponse {
  message: string;
  placementFollowup: PlacementFollowup;
}

export interface ListPlacementIncidentsResponse {
  items: PlacementIncident[];
}

export interface CreatePlacementIncidentInput {
  severity: PlacementIncidentSeverity;
  occurredAt: string;
  title: string;
  description: string;
  resolution?: string;
  resolvedAt?: string;
}

export interface UpdatePlacementIncidentInput extends CreatePlacementIncidentInput {}

export interface PlacementIncidentMutationResponse {
  message: string;
  placementIncident: PlacementIncident;
}

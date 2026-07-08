export type IncidentType =
  | 'ACADEMIC'
  | 'BEHAVIOUR'
  | 'DISCIPLINARY'
  | 'TECHNICAL'
  | 'COMPANY_RELATED'
  | 'OTHER';

export type IncidentSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type IncidentTypeFilter =
  | 'all'
  | IncidentType;

export type IncidentSeverityFilter =
  | 'all'
  | IncidentSeverity;

export type IncidentResolutionFilter =
  | 'all'
  | 'resolved'
  | 'unresolved';

export interface IncidentStudentReference {
  id: number;
  code: string | null;
  fullName: string;
}

export interface IncidentAcademicYearReference {
  id: number;
  name: string;
}

export interface IncidentCentreReference {
  id: number;
  name: string;
}

export interface IncidentModuleReference {
  id: number;
  code: string | null;
  name: string | null;
}

export interface IncidentVocationalProgrammeReference {
  id: number;
  acronym: string | null;
}

export interface IncidentAcademicLevelReference {
  id: number;
  number: number;
}

export interface IncidentUserReference {
  id: number;
  name: string | null;
}

export interface Incident {
  id: number;
  student: IncidentStudentReference;
  academicYear: IncidentAcademicYearReference;
  centre: IncidentCentreReference;
  module: IncidentModuleReference | null;
  vocationalProgramme: IncidentVocationalProgrammeReference | null;
  academicLevel: IncidentAcademicLevelReference | null;
  createdByUser: IncidentUserReference | null;
  type: IncidentType;
  severity: IncidentSeverity;
  occurredAt: string;
  title: string;
  description: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface IncidentsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListIncidentsResponse {
  items: Incident[];
  pagination: IncidentsPagination;
}

export interface ListIncidentsParameters {
  search?: string;
  page: number;
  pageSize: number;
  type: IncidentTypeFilter;
  severity: IncidentSeverityFilter;
  resolution: IncidentResolutionFilter;
  studentId?: number;
  academicYearId?: number;
  centreId?: number;
  moduleId?: number;
  vocationalProgrammeId?: number;
  academicLevelId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetIncidentResponse {
  incident: Incident;
}

export interface IncidentInput {
  studentId: number;
  academicYearId: number;
  centreId: number;
  moduleId: number | null;
  type: IncidentType;
  severity: IncidentSeverity;
  occurredAt: string;
  title: string;
  description: string;
  resolution: string | null;
  resolvedAt?: string;
}

export type CreateIncidentInput = IncidentInput;

export type UpdateIncidentInput = IncidentInput;

export interface IncidentMutationResponse {
  incident: Incident;
}

export interface ArchiveIncidentResponse {
  archived: boolean;
}

export interface IncidentsSummaryItem {
  programme: string;
  academicLevel: number;
  totalIncidents: number;
  academicIncidents: number;
  behaviourIncidents: number;
  disciplinaryIncidents: number;
  technicalIncidents: number;
  companyRelatedIncidents: number;
  otherIncidents: number;
  lowIncidents: number;
  mediumIncidents: number;
  highIncidents: number;
  resolvedIncidents: number;
  unresolvedIncidents: number;
}

export interface IncidentsSummaryTotals {
  totalIncidents: number;
  academicIncidents: number;
  behaviourIncidents: number;
  disciplinaryIncidents: number;
  technicalIncidents: number;
  companyRelatedIncidents: number;
  otherIncidents: number;
  lowIncidents: number;
  mediumIncidents: number;
  highIncidents: number;
  resolvedIncidents: number;
  unresolvedIncidents: number;
}

export interface IncidentsSummaryResponse {
  items: IncidentsSummaryItem[];
  totals: IncidentsSummaryTotals;
}

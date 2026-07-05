export type CompanyTrainingReportStatusFilter =
  | 'all'
  | 'PENDING'
  | 'ASSIGNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type CompanyTrainingDocumentationFilter =
  | 'all'
  | 'pending'
  | 'complete';

export type CompanyTrainingIncidentFilter =
  | 'all'
  | 'open'
  | 'resolved';

export interface CompanyTrainingReportFilters {
  academicYearId?: number;
  centreId?: number;
  companyId?: number;
  status: CompanyTrainingReportStatusFilter;
  documentationPending: CompanyTrainingDocumentationFilter;
  incidentStatus: CompanyTrainingIncidentFilter;
  maxRows: number;
}

export interface CompanyTrainingReportExportInput {
  academicYearId?: number;
  centreId?: number;
  companyId?: number;
  status: CompanyTrainingReportStatusFilter;
  documentationPending: CompanyTrainingDocumentationFilter;
  incidentStatus: CompanyTrainingIncidentFilter;
  title?: string;
}

export interface CompanyTrainingReportItem {
  id: number;
  studentId: number;
  studentCode: string | null;
  studentFullName: string;
  academicYearId: number;
  academicYearName: string;
  centreId: number;
  centreName: string;
  companyId: number;
  companyName: string;
  companyTutorFullName: string | null;
  academicTutorName: string | null;
  status: string;
  statusLabel: string;
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
  followupsCount: number;
  lastFollowupAt: string | null;
  openIncidentsCount: number;
  resolvedIncidentsCount: number;
  totalIncidentsCount: number;
}

export interface CompanyTrainingReportSummary {
  totalPlacements: number;
  pendingDocumentationCount: number;
  placementsWithoutFollowupsCount: number;
  openIncidentsCount: number;
  resolvedIncidentsCount: number;
  followupsCount: number;
  placementsByStatus: Record<string, number>;
}

export interface CompanyTrainingReportPreview {
  filters: CompanyTrainingReportFilters;
  summary: CompanyTrainingReportSummary;
  items: CompanyTrainingReportItem[];
  total: number;
  exportedRowsLimit: number;
  isPreviewTruncated: boolean;
  isExportTruncated: boolean;
}

export interface CompanyTrainingReportDocument {
  id: number;
  documentType: string;
  title: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string;
}

export interface CompanyTrainingReportExportResponse {
  message: string;
  document: CompanyTrainingReportDocument;
}

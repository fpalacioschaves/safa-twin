export interface GeneratedDocumentItem {
  id: number;
  generatedByUserId: number;
  generatedByUserName: string | null;
  generatedByUserEmail: string | null;
  documentType: string;
  title: string;
  academicYearId: number | null;
  centreId: number | null;
  vocationalProgrammeId: number | null;
  academicLevelId: number | null;
  moduleId: number | null;
  evaluationId: number | null;
  parameters: unknown;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface GeneratedDocumentsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GeneratedDocumentsResponse {
  items: GeneratedDocumentItem[];
  pagination: GeneratedDocumentsPagination;
}

export interface GeneratedDocumentsQuery {
  page?: number;
  pageSize?: number;
  documentType?: string;
}

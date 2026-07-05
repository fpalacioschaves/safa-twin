import {
  apiRequest,
} from './api.service';

import type {
  CompanyTrainingReportExportInput,
  CompanyTrainingReportExportResponse,
  CompanyTrainingReportFilters,
  CompanyTrainingReportPreview,
} from '../types/company-training-reports';

const BASE_URL = '/api/company-training/reports';

function appendOptionalNumber(
  query: URLSearchParams,
  key: string,
  value: number | undefined,
): void {
  if (value !== undefined) {
    query.set(
      key,
      value.toString(),
    );
  }
}

export async function getCompanyTrainingReportPreview(
  filters: CompanyTrainingReportFilters,
): Promise<CompanyTrainingReportPreview> {
  const query = new URLSearchParams();

  appendOptionalNumber(
    query,
    'academicYearId',
    filters.academicYearId,
  );

  appendOptionalNumber(
    query,
    'centreId',
    filters.centreId,
  );

  appendOptionalNumber(
    query,
    'companyId',
    filters.companyId,
  );

  query.set('status', filters.status);
  query.set(
    'documentationPending',
    filters.documentationPending,
  );
  query.set('incidentStatus', filters.incidentStatus);
  query.set('maxRows', filters.maxRows.toString());

  return apiRequest<CompanyTrainingReportPreview>(
    `${BASE_URL}/preview?${query.toString()}`,
  );
}

export async function exportCompanyTrainingReportCsv(
  input: CompanyTrainingReportExportInput,
): Promise<CompanyTrainingReportExportResponse> {
  return apiRequest<CompanyTrainingReportExportResponse>(
    `${BASE_URL}/export-csv`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

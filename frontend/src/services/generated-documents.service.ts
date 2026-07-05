import {
  apiRequest,
} from './api.service';

import type {
  GeneratedDocumentsQuery,
  GeneratedDocumentsResponse,
} from '../types/generated-documents';

const BASE_URL = '/api/generated-documents';

export function buildGeneratedDocumentDownloadUrl(
  id: number,
): string {
  return `${BASE_URL}/${id}/download`;
}

export async function getGeneratedDocuments(
  query: GeneratedDocumentsQuery = {},
): Promise<GeneratedDocumentsResponse> {
  const params = new URLSearchParams();

  if (query.page) {
    params.set('page', query.page.toString());
  }

  if (query.pageSize) {
    params.set('pageSize', query.pageSize.toString());
  }

  if (query.documentType) {
    params.set('documentType', query.documentType);
  }

  const queryString = params.toString();

  return apiRequest<GeneratedDocumentsResponse>(
    queryString
      ? `${BASE_URL}?${queryString}`
      : BASE_URL,
  );
}

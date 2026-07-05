import {
  apiRequest,
} from './api.service';

import type {
  DocumentTemplateContextOptionsResponse,
  DocumentTemplateDefinition,
  DocumentTemplateGenerationRequest,
  DocumentTemplateGenerationResult,
  DocumentTemplateListQuery,
  DocumentTemplateRequiredInputsResponse,
  DocumentTemplateValidationRequest,
  DocumentTemplateValidationResult,
  DocumentTemplateVariablesResponse,
  DocumentTemplatesResponse,
} from '../types/document-templates';

const BASE_URL = '/api/document-templates';

function buildDocumentTemplateQueryString(
  query: DocumentTemplateListQuery,
): string {
  const params = new URLSearchParams();

  if (query.category) {
    params.set('category', query.category);
  }

  if (query.scope) {
    params.set('scope', query.scope);
  }

  if (query.outputFormat) {
    params.set('outputFormat', query.outputFormat);
  }

  if (query.search?.trim()) {
    params.set('search', query.search.trim());
  }

  if (query.activeOnly === false) {
    params.set('activeOnly', 'false');
  }

  return params.toString();
}

export async function getDocumentTemplates(
  query: DocumentTemplateListQuery = {},
): Promise<DocumentTemplatesResponse> {
  const queryString =
    buildDocumentTemplateQueryString(query);

  return apiRequest<DocumentTemplatesResponse>(
    queryString
      ? `${BASE_URL}?${queryString}`
      : BASE_URL,
  );
}

export async function getDocumentTemplate(
  code: string,
): Promise<DocumentTemplateDefinition> {
  return apiRequest<DocumentTemplateDefinition>(
    `${BASE_URL}/${encodeURIComponent(code)}`,
  );
}

export async function getDocumentTemplateVariables(
  code: string,
): Promise<DocumentTemplateVariablesResponse> {
  return apiRequest<DocumentTemplateVariablesResponse>(
    `${BASE_URL}/${encodeURIComponent(code)}/variables`,
  );
}

export async function getDocumentTemplateRequiredInputs(
  code: string,
): Promise<DocumentTemplateRequiredInputsResponse> {
  return apiRequest<DocumentTemplateRequiredInputsResponse>(
    `${BASE_URL}/${encodeURIComponent(code)}/required-inputs`,
  );
}

export async function getDocumentTemplateContextOptions(
  code: string,
): Promise<DocumentTemplateContextOptionsResponse> {
  return apiRequest<DocumentTemplateContextOptionsResponse>(
    `${BASE_URL}/${encodeURIComponent(code)}/context-options`,
  );
}

export async function validateDocumentTemplateContext(
  code: string,
  request: DocumentTemplateValidationRequest,
): Promise<DocumentTemplateValidationResult> {
  return apiRequest<DocumentTemplateValidationResult>(
    `${BASE_URL}/${encodeURIComponent(code)}/validate`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

export async function generateDocumentFromTemplate(
  code: string,
  request: DocumentTemplateGenerationRequest,
): Promise<DocumentTemplateGenerationResult> {
  return apiRequest<DocumentTemplateGenerationResult>(
    `${BASE_URL}/${encodeURIComponent(code)}/generate`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
}

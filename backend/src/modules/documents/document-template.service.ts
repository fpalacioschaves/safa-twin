import {
  DocumentOutputFormat,
  DocumentTemplateDefinition,
  DocumentTemplateInputDefinition,
  DocumentTemplateListFilters,
  DocumentTemplateValidationRequest,
  DocumentTemplateValidationResult
} from './document-template.types';
import { DOCUMENT_TEMPLATE_REGISTRY } from './document-template.registry';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}

export class DocumentTemplateService {
  listTemplates(filters: DocumentTemplateListFilters = {}): DocumentTemplateDefinition[] {
    const activeOnly = filters.activeOnly ?? true;
    const search = filters.search ? normalizeText(filters.search) : null;

    return DOCUMENT_TEMPLATE_REGISTRY.filter((template) => {
      if (activeOnly && !template.isActive) {
        return false;
      }

      if (filters.category && template.category !== filters.category) {
        return false;
      }

      if (filters.scope && !template.scope.includes(filters.scope)) {
        return false;
      }

      if (filters.outputFormat && !template.outputFormats.includes(filters.outputFormat)) {
        return false;
      }

      if (search) {
        const haystack = normalizeText(
          `${template.code} ${template.name} ${template.description} ${template.category}`
        );

        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  getTemplateByCode(code: string): DocumentTemplateDefinition | null {
    const normalizedCode = code.trim();

    return (
      DOCUMENT_TEMPLATE_REGISTRY.find((template) => template.code === normalizedCode && template.isActive) ??
      null
    );
  }

  getRequiredInputs(code: string): DocumentTemplateInputDefinition[] | null {
    const template = this.getTemplateByCode(code);

    return template ? template.requiredInputs : null;
  }

  validateTemplateContext(
    code: string,
    request: DocumentTemplateValidationRequest = {}
  ): DocumentTemplateValidationResult | null {
    const template = this.getTemplateByCode(code);

    if (!template) {
      return null;
    }

    const context = request.context ?? {};
    const requestedFormat = request.outputFormat ?? null;
    const unsupportedFormat =
      requestedFormat !== null && !template.outputFormats.includes(requestedFormat as DocumentOutputFormat);

    const missingInputs = template.requiredInputs.filter((input) => {
      if (!input.required) {
        return false;
      }

      return !hasValue(context[input.key]);
    });

    const issues = missingInputs.map((input) => ({
      field: input.key,
      message: `El campo "${input.label}" es obligatorio para la plantilla "${template.name}".`
    }));

    if (unsupportedFormat && requestedFormat) {
      issues.push({
        field: 'outputFormat',
        message: `El formato "${requestedFormat}" no está soportado por la plantilla "${template.name}".`
      });
    }

    return {
      valid: issues.length === 0,
      templateCode: template.code,
      outputFormat: requestedFormat,
      missingInputs,
      unsupportedFormat,
      issues
    };
  }
}

export const documentTemplateService = new DocumentTemplateService();

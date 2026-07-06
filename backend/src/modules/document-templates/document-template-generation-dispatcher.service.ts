import {
  generateDocumentFromTemplate as generateGenericDocumentFromTemplate,
  type DocumentTemplateGenerationRequest,
  type DocumentTemplateGenerationResult,
} from './document-template-generator.service.js';
import {
  getDocumentTemplateByCode,
} from './document-template.service.js';
import {
  generateEvaluationModuleReportFromTemplate,
} from './reports/evaluation-module-report-generator.service.js';
import {
  generateFinalMemoryProgrammeLevelFromTemplate,
} from './reports/final-memory-programme-level-generator.service.js';

export type {
  DocumentTemplateGenerationRequest,
  DocumentTemplateGenerationResult,
};

export async function generateDocumentFromTemplate(
  code: string,
  request: DocumentTemplateGenerationRequest,
  userId: number,
): Promise<DocumentTemplateGenerationResult | null> {
  const template = getDocumentTemplateByCode(code);

  if (!template) {
    return null;
  }

  if (template.code === 'evaluation_module_report') {
    return generateEvaluationModuleReportFromTemplate({
      template,
      request,
      userId,
    });
  }

  if (template.code === 'final_memory_programme_level') {
    return generateFinalMemoryProgrammeLevelFromTemplate({
      template,
      request,
      userId,
    });
  }

  return generateGenericDocumentFromTemplate(
    code,
    request,
    userId,
  );
}

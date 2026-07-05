import { Request, Response } from 'express';
import { documentTemplateService } from './document-template.service';
import {
  DocumentOutputFormat,
  DocumentTemplateCategory,
  DocumentTemplateScope,
  DocumentTemplateValidationRequest
} from './document-template.types';

function sendOk<T>(res: Response, data: T): Response {
  return res.json({
    ok: true,
    data
  });
}

function sendNotFound(res: Response, message: string): Response {
  return res.status(404).json({
    ok: false,
    message
  });
}

export class DocumentTemplateController {
  list(req: Request, res: Response): Response {
    const templates = documentTemplateService.listTemplates({
      category: req.query.category as DocumentTemplateCategory | undefined,
      scope: req.query.scope as DocumentTemplateScope | undefined,
      outputFormat: req.query.outputFormat as DocumentOutputFormat | undefined,
      search: req.query.search as string | undefined,
      activeOnly: req.query.activeOnly === undefined ? true : req.query.activeOnly !== 'false'
    });

    return sendOk(res, {
      total: templates.length,
      templates
    });
  }

  show(req: Request, res: Response): Response {
    const template = documentTemplateService.getTemplateByCode(req.params.code);

    if (!template) {
      return sendNotFound(res, 'No existe una plantilla documental activa con ese código.');
    }

    return sendOk(res, template);
  }

  variables(req: Request, res: Response): Response {
    const template = documentTemplateService.getTemplateByCode(req.params.code);

    if (!template) {
      return sendNotFound(res, 'No existe una plantilla documental activa con ese código.');
    }

    return sendOk(res, {
      templateCode: template.code,
      templateName: template.name,
      variables: template.variables,
      sections: template.sections
    });
  }

  requiredInputs(req: Request, res: Response): Response {
    const requiredInputs = documentTemplateService.getRequiredInputs(req.params.code);

    if (!requiredInputs) {
      return sendNotFound(res, 'No existe una plantilla documental activa con ese código.');
    }

    return sendOk(res, {
      templateCode: req.params.code,
      requiredInputs
    });
  }

  validate(req: Request, res: Response): Response {
    const validation = documentTemplateService.validateTemplateContext(
      req.params.code,
      req.body as DocumentTemplateValidationRequest
    );

    if (!validation) {
      return sendNotFound(res, 'No existe una plantilla documental activa con ese código.');
    }

    return sendOk(res, validation);
  }
}

export const documentTemplateController = new DocumentTemplateController();

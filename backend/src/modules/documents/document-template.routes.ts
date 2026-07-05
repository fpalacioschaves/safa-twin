import { Router } from 'express';
import { documentTemplateController } from './document-template.controller';

export const documentTemplateRouter = Router();

documentTemplateRouter.get('/', (req, res) => documentTemplateController.list(req, res));

documentTemplateRouter.get('/:code', (req, res) => documentTemplateController.show(req, res));

documentTemplateRouter.get('/:code/variables', (req, res) =>
  documentTemplateController.variables(req, res)
);

documentTemplateRouter.get('/:code/required-inputs', (req, res) =>
  documentTemplateController.requiredInputs(req, res)
);

documentTemplateRouter.post('/:code/validate', (req, res) =>
  documentTemplateController.validate(req, res)
);

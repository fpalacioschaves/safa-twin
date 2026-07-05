import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  generateDocumentFromTemplate,
  getDocumentTemplate,
  getDocumentTemplateContextOptions,
  getDocumentTemplateRequiredInputs,
  getDocumentTemplates,
  getDocumentTemplateVariables,
  validateDocumentTemplateContext,
} from '../services/document-templates.service';

import type {
  DocumentOutputFormat,
  DocumentTemplateCategory,
  DocumentTemplateContextOption,
  DocumentTemplateDefinition,
  DocumentTemplateGenerationResult,
  DocumentTemplateInputDefinition,
  DocumentTemplateListQuery,
  DocumentTemplateScope,
  DocumentTemplateValidationResult,
  DocumentTemplateVariablesResponse,
} from '../types/document-templates';

import {
  DOCUMENT_OUTPUT_FORMATS,
  DOCUMENT_TEMPLATE_CATEGORIES,
  DOCUMENT_TEMPLATE_SCOPES,
} from '../types/document-templates';

import './DocumentTemplatesPage.css';

const CATEGORY_LABELS: Record<DocumentTemplateCategory, string> = {
  evaluation: 'Evaluación',
  final_memory: 'Memoria final',
  attendance: 'Asistencia',
  student: 'Alumno',
  academic_offering: 'Oferta académica',
  work_placement: 'Formación en empresa',
  statistics: 'Estadísticas',
  incidents: 'Incidencias',
};

const SCOPE_LABELS: Record<DocumentTemplateScope, string> = {
  academic_year: 'Curso académico',
  programme: 'Ciclo',
  level: 'Nivel',
  academic_offering: 'Oferta académica',
  module: 'Módulo',
  student: 'Alumno',
  company: 'Empresa',
  work_placement: 'Estancia en empresa',
};

const FORMAT_LABELS: Record<DocumentOutputFormat, string> = {
  docx: 'DOCX',
  pdf: 'PDF',
  xlsx: 'XLSX',
  csv: 'CSV',
  json: 'JSON',
};

const DEFAULT_FILTERS: DocumentTemplateListQuery = {
  category: '',
  scope: '',
  outputFormat: '',
  search: '',
  activeOnly: true,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Se ha producido un error inesperado.';
}

function getInitialValues(
  inputs: DocumentTemplateInputDefinition[],
): Record<string, string> {
  return Object.fromEntries(
    inputs.map((input) => [input.key, '']),
  );
}

function isDateInput(key: string): boolean {
  const normalizedKey = key.toLowerCase();

  return normalizedKey.includes('date')
    || normalizedKey.endsWith('from')
    || normalizedKey.endsWith('to');
}

function buildContext(
  values: Record<string, string>,
  options: Record<string, DocumentTemplateContextOption[]>,
): Record<string, unknown> {
  const context: Record<string, unknown> = {};

  Object.entries(values).forEach(([key, value]) => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return;
    }

    context[key] = cleanValue;

    const selectedOption = options[key]?.find(
      (option) => option.value === cleanValue,
    );

    if (selectedOption) {
      context[`${key}Label`] = selectedOption.description
        ? `${selectedOption.label} · ${selectedOption.description}`
        : selectedOption.label;
    }
  });

  return context;
}

export function DocumentTemplatesPage() {
  const [filters, setFilters] =
    useState<DocumentTemplateListQuery>(DEFAULT_FILTERS);
  const [templates, setTemplates] =
    useState<DocumentTemplateDefinition[]>([]);
  const [selectedCode, setSelectedCode] =
    useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplateDefinition | null>(null);
  const [variablesData, setVariablesData] =
    useState<DocumentTemplateVariablesResponse | null>(null);
  const [requiredInputs, setRequiredInputs] =
    useState<DocumentTemplateInputDefinition[]>([]);
  const [contextOptions, setContextOptions] =
    useState<Record<string, DocumentTemplateContextOption[]>>({});
  const [inputValues, setInputValues] =
    useState<Record<string, string>>({});
  const [validationFormat, setValidationFormat] =
    useState<DocumentOutputFormat>('docx');
  const [validationResult, setValidationResult] =
    useState<DocumentTemplateValidationResult | null>(null);
  const [generationResult, setGenerationResult] =
    useState<DocumentTemplateGenerationResult | null>(null);
  const [isLoadingList, setIsLoadingList] =
    useState(false);
  const [isLoadingDetail, setIsLoadingDetail] =
    useState(false);
  const [isValidating, setIsValidating] =
    useState(false);
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  async function loadTemplateDetail(code: string): Promise<void> {
    setIsLoadingDetail(true);
    setError(null);
    setValidationResult(null);
    setGenerationResult(null);

    try {
      const [
        template,
        variables,
        inputs,
        options,
      ] = await Promise.all([
        getDocumentTemplate(code),
        getDocumentTemplateVariables(code),
        getDocumentTemplateRequiredInputs(code),
        getDocumentTemplateContextOptions(code),
      ]);

      setSelectedCode(code);
      setSelectedTemplate(template);
      setVariablesData(variables);
      setRequiredInputs(inputs.requiredInputs);
      setContextOptions(options.options);
      setInputValues(getInitialValues(inputs.requiredInputs));
      setValidationFormat(template.outputFormats[0] ?? 'docx');
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
      setSelectedTemplate(null);
      setVariablesData(null);
      setRequiredInputs([]);
      setContextOptions({});
      setInputValues({});
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function loadTemplates(
    nextFilters: DocumentTemplateListQuery = filters,
  ): Promise<void> {
    setIsLoadingList(true);
    setError(null);

    try {
      const result = await getDocumentTemplates(nextFilters);
      setTemplates(result.items);

      if (result.items.length === 0) {
        setSelectedCode(null);
        setSelectedTemplate(null);
        return;
      }

      const nextCode = selectedCode
        && result.items.some((template) => template.code === selectedCode)
        ? selectedCode
        : result.items[0].code;

      await loadTemplateDetail(nextCode);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    void loadTemplates(DEFAULT_FILTERS);
  }, []);

  function resetGeneratedState(): void {
    setValidationResult(null);
    setGenerationResult(null);
  }

  function renderContextInput(
    input: DocumentTemplateInputDefinition,
  ) {
    const options = contextOptions[input.key] ?? [];
    const selectedOption = options.find(
      (option) => option.value === inputValues[input.key],
    );

    if (options.length > 0) {
      return (
        <label key={input.key}>
          {input.label}
          <select
            required={input.required}
            value={inputValues[input.key] ?? ''}
            onChange={(event) => {
              setInputValues((current) => ({
                ...current,
                [input.key]: event.target.value,
              }));
              resetGeneratedState();
            }}
          >
            <option value="">Selecciona una opción</option>
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
          {selectedOption?.description ? (
            <small className="document-template-input-help">
              {selectedOption.description}
            </small>
          ) : null}
        </label>
      );
    }

    return (
      <label key={input.key}>
        {input.label}
        <input
          required={input.required}
          type={isDateInput(input.key) ? 'date' : 'text'}
          value={inputValues[input.key] ?? ''}
          placeholder={input.description}
          onChange={(event) => {
            setInputValues((current) => ({
              ...current,
              [input.key]: event.target.value,
            }));
            resetGeneratedState();
          }}
        />
      </label>
    );
  }

  async function handleValidationSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedTemplate) {
      return;
    }

    setIsValidating(true);
    setError(null);
    setGenerationResult(null);

    try {
      const result = await validateDocumentTemplateContext(
        selectedTemplate.code,
        {
          outputFormat: validationFormat,
          context: buildContext(inputValues, contextOptions),
        },
      );

      setValidationResult(result);
    } catch (validationError: unknown) {
      setError(getErrorMessage(validationError));
    } finally {
      setIsValidating(false);
    }
  }

  async function handleGenerationSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedTemplate) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      const result = await generateDocumentFromTemplate(
        selectedTemplate.code,
        {
          outputFormat: validationFormat,
          context: buildContext(inputValues, contextOptions),
        },
      );

      setGenerationResult(result);
    } catch (generationError: unknown) {
      setError(getErrorMessage(generationError));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="dashboard-content document-templates-page">
      <section className="document-templates-hero">
        <div>
          <p className="eyebrow">Plantillas documentales</p>
          <h2>Catálogo base de documentos académicos</h2>
          <p>
            Selecciona plantillas, revisa sus variables y genera documentos
            registrados en el historial documental.
          </p>
        </div>
        <span className="document-templates-status">
          {templates.length} plantillas
        </span>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="document-templates-card">
        <div className="document-templates-card-header">
          <div>
            <p className="eyebrow">Filtros</p>
            <h3>Buscar plantillas</h3>
          </div>
        </div>

        <form
          className="document-templates-filters"
          onSubmit={(event) => {
            event.preventDefault();
            void loadTemplates(filters);
          }}
        >
          <label>
            Texto
            <input
              type="search"
              value={filters.search ?? ''}
              placeholder="Ej. memoria, absentismo, alumno..."
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }));
              }}
            />
          </label>

          <label>
            Categoría
            <select
              value={filters.category ?? ''}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  category: event.target.value as DocumentTemplateCategory | '',
                }));
              }}
            >
              <option value="">Todas</option>
              {DOCUMENT_TEMPLATE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ámbito
            <select
              value={filters.scope ?? ''}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  scope: event.target.value as DocumentTemplateScope | '',
                }));
              }}
            >
              <option value="">Todos</option>
              {DOCUMENT_TEMPLATE_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Formato
            <select
              value={filters.outputFormat ?? ''}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  outputFormat: event.target.value as DocumentOutputFormat | '',
                }));
              }}
            >
              <option value="">Todos</option>
              {DOCUMENT_OUTPUT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {FORMAT_LABELS[format]}
                </option>
              ))}
            </select>
          </label>

          <div className="document-templates-filter-actions">
            <button className="button button-primary" type="submit">
              {isLoadingList ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                void loadTemplates(DEFAULT_FILTERS);
              }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section className="document-templates-layout">
        <article className="document-templates-card document-templates-list-card">
          <div className="document-templates-card-header">
            <div>
              <p className="eyebrow">Catálogo</p>
              <h3>Plantillas disponibles</h3>
            </div>
            <span>{templates.length}</span>
          </div>

          <div className="document-templates-list">
            {templates.map((template) => (
              <button
                className={selectedCode === template.code
                  ? 'document-template-list-item document-template-list-item-active'
                  : 'document-template-list-item'}
                key={template.code}
                type="button"
                onClick={() => {
                  void loadTemplateDetail(template.code);
                }}
              >
                <strong>{template.name}</strong>
                <span>{CATEGORY_LABELS[template.category]}</span>
                <small>{template.code}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="document-templates-card document-templates-detail-card">
          {isLoadingDetail ? (
            <p className="document-templates-empty">Cargando plantilla...</p>
          ) : selectedTemplate ? (
            <>
              <div className="document-templates-card-header">
                <div>
                  <p className="eyebrow">{CATEGORY_LABELS[selectedTemplate.category]}</p>
                  <h3>{selectedTemplate.name}</h3>
                  <p>{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="document-template-badges">
                {selectedTemplate.outputFormats.map((format) => (
                  <span key={format}>{FORMAT_LABELS[format]}</span>
                ))}
              </div>

              <div className="document-template-detail-grid">
                <section>
                  <h4>Ámbitos</h4>
                  <ul>
                    {selectedTemplate.scope.map((scope) => (
                      <li key={scope}>{SCOPE_LABELS[scope]}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4>Datos obligatorios</h4>
                  <ul>
                    {requiredInputs.map((input) => (
                      <li key={input.key}>
                        <strong>{input.label}</strong>
                        <span>{input.description}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="document-template-variables">
                <h4>Variables disponibles</h4>
                <div className="document-template-variable-list">
                  {(variablesData?.variables ?? selectedTemplate.variables).map((variable) => (
                    <article key={variable.key}>
                      <strong>{variable.key}</strong>
                      <span>{variable.label}</span>
                      <small>{variable.type}</small>
                      <p>{variable.description}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="document-template-validation">
                <h4>Validar contexto</h4>
                <p>
                  Elige los datos desde desplegables. El código interno se envía
                  automáticamente al backend.
                </p>

                <form onSubmit={(event) => {
                  void handleValidationSubmit(event);
                }}>
                  <label>
                    Formato de salida
                    <select
                      value={validationFormat}
                      onChange={(event) => {
                        setValidationFormat(event.target.value as DocumentOutputFormat);
                        resetGeneratedState();
                      }}
                    >
                      {selectedTemplate.outputFormats.map((format) => (
                        <option key={format} value={format}>
                          {FORMAT_LABELS[format]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {requiredInputs.map(renderContextInput)}

                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isValidating}
                  >
                    {isValidating ? 'Validando...' : 'Validar'}
                  </button>
                </form>

                {validationResult ? (
                  <div className={validationResult.valid
                    ? 'document-template-validation-result document-template-validation-ok'
                    : 'document-template-validation-result document-template-validation-error'}
                  >
                    <strong>
                      {validationResult.valid
                        ? 'Contexto válido'
                        : 'Contexto incompleto'}
                    </strong>
                    {validationResult.issues.length > 0 ? (
                      <ul>
                        {validationResult.issues.map((issue) => (
                          <li key={`${issue.field}-${issue.message}`}>
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>La plantilla puede generar documento.</p>
                    )}
                  </div>
                ) : null}
              </section>

              <section className="document-template-generation">
                <h4>Generar documento</h4>
                <p>
                  El archivo generado quedará guardado en el historial documental.
                </p>
                <form onSubmit={(event) => {
                  void handleGenerationSubmit(event);
                }}>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isGenerating}
                  >
                    {isGenerating
                      ? 'Generando...'
                      : `Generar ${FORMAT_LABELS[validationFormat]}`}
                  </button>
                </form>

                {generationResult ? (
                  <div className="document-template-generation-result">
                    <strong>Documento generado</strong>
                    <p>{generationResult.fileName}</p>
                    <p>
                      Tamaño: {generationResult.fileSizeBytes} bytes · ID: {generationResult.documentId}
                    </p>
                    <a
                      className="button button-primary document-template-download-link"
                      href={generationResult.downloadUrl}
                    >
                      Descargar documento
                    </a>
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <p className="document-templates-empty">
              Selecciona una plantilla para ver el detalle.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}

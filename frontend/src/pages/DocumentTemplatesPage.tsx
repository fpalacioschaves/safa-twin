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
  group: 'Grupo',
  work_placement: 'Formación en empresa',
  statistics: 'Estadísticas',
  incidents: 'Incidencias',
};

const SCOPE_LABELS: Record<DocumentTemplateScope, string> = {
  academic_year: 'Curso académico',
  programme: 'Ciclo',
  level: 'Nivel',
  group: 'Grupo',
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

function buildInitialInputValues(
  requiredInputs: DocumentTemplateInputDefinition[],
): Record<string, string> {
  return requiredInputs.reduce<Record<string, string>>(
    (values, input) => ({
      ...values,
      [input.key]: '',
    }),
    {},
  );
}

function isDateInputKey(key: string): boolean {
  return key.toLowerCase().includes('date')
    || key.toLowerCase().endsWith('from')
    || key.toLowerCase().endsWith('to');
}

function buildContextWithLabels(
  inputValues: Record<string, string>,
  contextOptions: Record<string, DocumentTemplateContextOption[]>,
): Record<string, unknown> {
  const context: Record<string, unknown> = {};

  Object.entries(inputValues).forEach(([key, value]) => {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return;
    }

    context[key] = trimmedValue;

    const selectedOption = contextOptions[key]?.find(
      (option) => option.value === trimmedValue,
    );

    if (selectedOption) {
      context[`${key}Label`] = selectedOption.description
        ? `${selectedOption.label} · ${selectedOption.description}`
        : selectedOption.label;
    }
  });

  return context;
}

function getSelectedOptionDescription(
  inputKey: string,
  value: string,
  contextOptions: Record<string, DocumentTemplateContextOption[]>,
): string | null {
  const selectedOption = contextOptions[inputKey]?.find(
    (option) => option.value === value,
  );

  return selectedOption?.description ?? null;
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

  async function loadTemplateDetail(
    code: string,
  ): Promise<void> {
    setIsLoadingDetail(true);
    setError(null);
    setValidationResult(null);
    setGenerationResult(null);

    try {
      const [
        template,
        variables,
        requiredInputsResponse,
        contextOptionsResponse,
      ] = await Promise.all([
        getDocumentTemplate(code),
        getDocumentTemplateVariables(code),
        getDocumentTemplateRequiredInputs(code),
        getDocumentTemplateContextOptions(code),
      ]);

      setSelectedCode(code);
      setSelectedTemplate(template);
      setVariablesData(variables);
      setRequiredInputs(requiredInputsResponse.requiredInputs);
      setContextOptions(contextOptionsResponse.options);
      setInputValues(
        buildInitialInputValues(
          requiredInputsResponse.requiredInputs,
        ),
      );
      setValidationFormat(
        template.outputFormats[0] ?? 'docx',
      );
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
        setVariablesData(null);
        setRequiredInputs([]);
        setContextOptions({});
        setInputValues({});
        setGenerationResult(null);
        return;
      }

      const nextSelectedCode =
        selectedCode
        && result.items.some((template) => template.code === selectedCode)
          ? selectedCode
          : result.items[0].code;

      await loadTemplateDetail(nextSelectedCode);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    void loadTemplates(DEFAULT_FILTERS);
  }, []);

  function handleFilterSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    void loadTemplates(filters);
  }

  function handleFilterReset(): void {
    setFilters(DEFAULT_FILTERS);
    void loadTemplates(DEFAULT_FILTERS);
  }

  async function handleValidationSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedTemplate) {
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setGenerationResult(null);
    setError(null);

    try {
      const result = await validateDocumentTemplateContext(
        selectedTemplate.code,
        {
          outputFormat: validationFormat,
          context: buildContextWithLabels(
            inputValues,
            contextOptions,
          ),
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
    setGenerationResult(null);
    setError(null);

    try {
      const result = await generateDocumentFromTemplate(
        selectedTemplate.code,
        {
          outputFormat: validationFormat,
          context: buildContextWithLabels(
            inputValues,
            contextOptions,
          ),
        },
      );

      setGenerationResult(result);
    } catch (generationError: unknown) {
      setError(getErrorMessage(generationError));
    } finally {
      setIsGenerating(false);
    }
  }

  function renderContextInput(
    input: DocumentTemplateInputDefinition,
  ) {
    const options = contextOptions[input.key] ?? [];
    const selectedDescription = getSelectedOptionDescription(
      input.key,
      inputValues[input.key] ?? '',
      contextOptions,
    );

    if (options.length > 0) {
      return (
        <label key={input.key}>
          {input.label}
          <select
            value={inputValues[input.key] ?? ''}
            required={input.required}
            onChange={(event) => {
              setInputValues((current) => ({
                ...current,
                [input.key]: event.target.value,
              }));
              setValidationResult(null);
              setGenerationResult(null);
            }}
          >
            <option value="">
              {input.required
                ? 'Selecciona una opción'
                : 'Sin seleccionar'}
            </option>
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
          {selectedDescription ? (
            <small className="document-template-input-help">
              {selectedDescription}
            </small>
          ) : null}
        </label>
      );
    }

    if (isDateInputKey(input.key)) {
      return (
        <label key={input.key}>
          {input.label}
          <input
            type="date"
            value={inputValues[input.key] ?? ''}
            required={input.required}
            onChange={(event) => {
              setInputValues((current) => ({
                ...current,
                [input.key]: event.target.value,
              }));
              setValidationResult(null);
              setGenerationResult(null);
            }}
          />
        </label>
      );
    }

    return (
      <label key={input.key}>
        {input.label}
        <input
          type="text"
          value={inputValues[input.key] ?? ''}
          required={input.required}
          placeholder={input.description}
          onChange={(event) => {
            setInputValues((current) => ({
              ...current,
              [input.key]: event.target.value,
            }));
            setValidationResult(null);
            setGenerationResult(null);
          }}
        />
      </label>
    );
  }

  return (
    <main className="dashboard-content document-templates-page">
      <section className="document-templates-hero">
        <div>
          <p className="eyebrow">
            Plantillas documentales
          </p>
          <h2>Catálogo base de documentos académicos</h2>
          <p>
            Consulta las plantillas disponibles, revisa sus variables,
            comprueba los datos obligatorios y genera documentos reales
            que quedan registrados en el historial documental.
          </p>
        </div>

        <span className="document-templates-status">
          {templates.length} plantillas
        </span>
      </section>

      {error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : null}

      <section className="document-templates-card">
        <div className="document-templates-card-header">
          <div>
            <p className="eyebrow">Filtros</p>
            <h3>Buscar plantillas</h3>
            <p>
              Filtra por categoría, ámbito, formato de salida o texto libre.
            </p>
          </div>
        </div>

        <form
          className="document-templates-filters"
          onSubmit={handleFilterSubmit}
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
                <option
                  key={category}
                  value={category}
                >
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
                <option
                  key={scope}
                  value={scope}
                >
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
                <option
                  key={format}
                  value={format}
                >
                  {FORMAT_LABELS[format]}
                </option>
              ))}
            </select>
          </label>

          <label className="document-templates-checkbox">
            <input
              type="checkbox"
              checked={filters.activeOnly ?? true}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  activeOnly: event.target.checked,
                }));
              }}
            />
            Solo activas
          </label>

          <div className="document-templates-filter-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={isLoadingList}
            >
              {isLoadingList ? 'Buscando...' : 'Buscar'}
            </button>

            <button
              className="button button-secondary"
              type="button"
              disabled={isLoadingList}
              onClick={handleFilterReset}
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

          {templates.length === 0 ? (
            <p className="document-templates-empty">
              No hay plantillas que coincidan con los filtros actuales.
            </p>
          ) : (
            <div className="document-templates-list">
              {templates.map((template) => (
                <button
                  className={
                    selectedCode === template.code
                      ? 'document-template-list-item document-template-list-item-active'
                      : 'document-template-list-item'
                  }
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
          )}
        </article>

        <article className="document-templates-card document-templates-detail-card">
          {isLoadingDetail ? (
            <p className="document-templates-empty">
              Cargando detalle de la plantilla...
            </p>
          ) : selectedTemplate ? (
            <>
              <div className="document-templates-card-header">
                <div>
                  <p className="eyebrow">
                    {CATEGORY_LABELS[selectedTemplate.category]}
                  </p>
                  <h3>{selectedTemplate.name}</h3>
                  <p>{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="document-template-badges">
                {selectedTemplate.outputFormats.map((format) => (
                  <span key={format}>
                    {FORMAT_LABELS[format]}
                  </span>
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
                  {requiredInputs.length === 0 ? (
                    <p>No requiere datos de contexto.</p>
                  ) : (
                    <ul>
                      {requiredInputs.map((input) => (
                        <li key={input.key}>
                          <strong>{input.label}</strong>
                          <span>{input.description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="document-template-sections">
                <h4>Secciones</h4>
                <div className="document-template-section-list">
                  {selectedTemplate.sections
                    .slice()
                    .sort((first, second) => first.order - second.order)
                    .map((section) => (
                      <article key={section.key}>
                        <strong>{section.title}</strong>
                        <p>{section.description}</p>
                        <span>
                          {section.required ? 'Obligatoria' : 'Opcional'}
                        </span>
                      </article>
                    ))}
                </div>
              </section>

              <section className="document-template-variables">
                <h4>Variables disponibles</h4>
                <div className="document-template-variable-list">
                  {(variablesData?.variables ?? selectedTemplate.variables).map((variable) => (
                    <article key={variable.key}>
                      <strong>{variable.key}</strong>
                      <span>{variable.label}</span>
                      <small>
                        {variable.type}
                        {variable.required ? ' · obligatoria' : ' · opcional'}
                      </small>
                      <p>{variable.description}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="document-template-validation">
                <h4>Validar contexto</h4>
                <p>
                  Selecciona los datos académicos desde los desplegables.
                  La aplicación enviará internamente los identificadores necesarios.
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
                        setValidationResult(null);
                        setGenerationResult(null);
                      }}
                    >
                      {selectedTemplate.outputFormats.map((format) => (
                        <option
                          key={format}
                          value={format}
                        >
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
                  <div
                    className={
                      validationResult.valid
                        ? 'document-template-validation-result document-template-validation-ok'
                        : 'document-template-validation-result document-template-validation-error'
                    }
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
                      <p>
                        La plantilla puede generar documento en el formato seleccionado.
                      </p>
                    )}
                  </div>
                ) : null}
              </section>

              <section className="document-template-generation">
                <h4>Generar documento</h4>
                <p>
                  Genera un archivo real desde la plantilla seleccionada.
                  El documento quedará guardado en el historial documental.
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
                    <p>
                      {generationResult.fileName}
                    </p>
                    <p>
                      Tamaño: {generationResult.fileSizeBytes} bytes · ID:
                      {' '}{generationResult.documentId}
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

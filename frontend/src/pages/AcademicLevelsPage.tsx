import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  archiveAcademicLevel,
  createAcademicLevel,
  getAcademicLevel,
  getAcademicLevels,
  restoreAcademicLevel,
  updateAcademicLevel,
} from '../services/academic-levels.service';

import type {
  AcademicLevel,
  AcademicLevelMutationResponse,
  AcademicLevelStatusFilter,
  CreateAcademicLevelInput,
  ListAcademicLevelsResponse,
  UpdateAcademicLevelInput,
} from '../types/academic-levels';

import './AcademicLevelsPage.css';

const PAGE_SIZE = 10;

interface AcademicLevelsPageProps {
  canCreateAcademicLevels: boolean;
  canEditAcademicLevels: boolean;
  canArchiveAcademicLevels: boolean;
}

interface AcademicLevelFormState {
  number: string;
  name: string;
  description: string;
  isActive: boolean;
}

type AcademicLevelFormMode =
  | 'create'
  | 'edit';

type AcademicLevelTextField =
  | 'number'
  | 'name'
  | 'description';

type FieldErrors = Record<string, string>;

function createEmptyAcademicLevelForm(): AcademicLevelFormState {
  return {
    number: '',
    name: '',
    description: '',
    isActive: true,
  };
}

function isAcademicLevelStatusFilter(
  value: string,
): value is AcademicLevelStatusFilter {
  return (
    value === 'all'
    || value === 'active'
    || value === 'inactive'
    || value === 'archived'
  );
}

function normalizeOptionalValue(
  value: string,
): string | undefined {
  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function parseOptionalNumber(
  value: string,
): number | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return Number.parseInt(
    normalizedValue,
    10,
  );
}

function validateIntegerText(
  value: string,
): boolean {
  return /^\d+$/.test(
    value.trim(),
  );
}

function validateAcademicLevelForm(
  form: AcademicLevelFormState,
): FieldErrors {
  const errors: FieldErrors = {};

  const number = form.number.trim();
  const name = form.name.trim();
  const description = form.description.trim();

  if (!validateIntegerText(number)) {
    errors.number =
      'El número del nivel debe ser un número entero.';
  } else {
    const numericValue = Number.parseInt(
      number,
      10,
    );

    if (numericValue < 1) {
      errors.number =
        'El número del nivel debe ser mayor o igual que 1.';
    } else if (numericValue > 99) {
      errors.number =
        'El número del nivel no puede superar 99.';
    }
  }

  if (name.length < 2) {
    errors.name =
      'El nombre debe tener al menos 2 caracteres.';
  } else if (name.length > 50) {
    errors.name =
      'El nombre no puede superar los 50 caracteres.';
  }

  if (description.length > 255) {
    errors.description =
      'La descripción no puede superar los 255 caracteres.';
  }

  return errors;
}

function validateNumberFilter(
  value: string,
): string | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (!validateIntegerText(normalizedValue)) {
    return 'El filtro de número debe ser un entero.';
  }

  const numericValue = Number.parseInt(
    normalizedValue,
    10,
  );

  if (numericValue < 1 || numericValue > 99) {
    return 'El filtro de número debe estar entre 1 y 99.';
  }

  return null;
}

function getApiFieldErrors(
  error: ApiError,
): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const detail of error.details) {
    fieldErrors[detail.field] =
      detail.message;
  }

  return fieldErrors;
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(date);
}

function getAcademicLevelStatus(
  academicLevel: AcademicLevel,
): {
  label: string;
  className: string;
} {
  if (academicLevel.deletedAt) {
    return {
      label: 'Archivado',
      className: 'academic-level-status-archived',
    };
  }

  if (!academicLevel.isActive) {
    return {
      label: 'Inactivo',
      className: 'academic-level-status-inactive',
    };
  }

  return {
    label: 'Activo',
    className: 'academic-level-status-active',
  };
}

export function AcademicLevelsPage({
  canCreateAcademicLevels,
  canEditAcademicLevels,
  canArchiveAcademicLevels,
}: AcademicLevelsPageProps) {
  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [numberInput, setNumberInput] =
    useState('');

  const [numberFilter, setNumberFilter] =
    useState<number | undefined>(undefined);

  const [status, setStatus] =
    useState<AcademicLevelStatusFilter>('all');

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState<ListAcademicLevelsResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const [formMode, setFormMode] =
    useState<AcademicLevelFormMode | null>(null);

  const [selectedAcademicLevelId, setSelectedAcademicLevelId] =
    useState<number | null>(null);

  const [selectedAcademicLevel, setSelectedAcademicLevel] =
    useState<AcademicLevel | null>(null);

  const [form, setForm] =
    useState<AcademicLevelFormState>(
      createEmptyAcademicLevelForm,
    );

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [formErrorMessage, setFormErrorMessage] =
    useState<string | null>(null);

  const [isLoadingAcademicLevel, setIsLoadingAcademicLevel] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [actionKey, setActionKey] =
    useState<string | null>(null);

  const modalIsOpen = formMode !== null;

  const showActions =
    canEditAcademicLevels
    || canArchiveAcademicLevels;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadAcademicLevels(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const academicLevelsResult =
          await getAcademicLevels({
            search: search || undefined,
            number: numberFilter,
            page,
            pageSize: PAGE_SIZE,
            status,
          });

        if (!requestWasCancelled) {
          setResult(academicLevelsResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de niveles académicos.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAcademicLevels();

    return () => {
      requestWasCancelled = true;
    };
  }, [
    numberFilter,
    page,
    refreshVersion,
    search,
    status,
  ]);

  useEffect(() => {
    if (
      result
      && result.pagination.totalPages > 0
      && page > result.pagination.totalPages
    ) {
      setPage(result.pagination.totalPages);
    }
  }, [page, result]);

  useEffect(() => {
    const academicLevelId = selectedAcademicLevelId;

    if (
      formMode !== 'edit'
      || typeof academicLevelId !== 'number'
    ) {
      return;
    }

    let requestWasCancelled = false;

    async function loadAcademicLevel(
      id: number,
    ): Promise<void> {
      setIsLoadingAcademicLevel(true);
      setFormErrorMessage(null);

      try {
        const response = await getAcademicLevel(id);

        if (requestWasCancelled) {
          return;
        }

        setSelectedAcademicLevel(response.academicLevel);

        setForm({
          number: response.academicLevel.number.toString(),
          name: response.academicLevel.name,
          description: response.academicLevel.description ?? '',
          isActive: response.academicLevel.isActive,
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(error.message);
        } else {
          setFormErrorMessage(
            'No se han podido cargar los datos del nivel académico.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingAcademicLevel(false);
        }
      }
    }

    void loadAcademicLevel(academicLevelId);

    return () => {
      requestWasCancelled = true;
    };
  }, [formMode, selectedAcademicLevelId]);

  useEffect(() => {
    if (!modalIsOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (event.key === 'Escape' && !isSubmitting) {
        closeForm();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, modalIsOpen]);

  function closeForm(): void {
    setFormMode(null);
    setSelectedAcademicLevelId(null);
    setSelectedAcademicLevel(null);
    setForm(createEmptyAcademicLevelForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingAcademicLevel(false);
  }

  function openCreateForm(): void {
    setFormMode('create');
    setSelectedAcademicLevelId(null);
    setSelectedAcademicLevel(null);
    setForm(createEmptyAcademicLevelForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function openEditForm(
    academicLevelId: number,
  ): void {
    setFormMode('edit');
    setSelectedAcademicLevelId(academicLevelId);
    setSelectedAcademicLevel(null);
    setForm(createEmptyAcademicLevelForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    const numberFilterError =
      validateNumberFilter(numberInput);

    if (numberFilterError) {
      setErrorMessage(numberFilterError);
      return;
    }

    setPage(1);
    setErrorMessage(null);
    setSearch(searchInput.trim());
    setNumberFilter(parseOptionalNumber(numberInput));
  }

  function clearFilters(): void {
    setSearchInput('');
    setSearch('');
    setNumberInput('');
    setNumberFilter(undefined);
    setStatus('all');
    setPage(1);
  }

  function updateTextField(
    field: AcademicLevelTextField,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => {
      const nextErrors = {
        ...currentErrors,
      };

      delete nextErrors[field];

      return nextErrors;
    });
  }

  async function handleFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!formMode) {
      return;
    }

    const validationErrors =
      validateAcademicLevelForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormErrorMessage('Revisa los campos señalados.');
      return;
    }

    const input:
      CreateAcademicLevelInput
      | UpdateAcademicLevelInput = {
        number: Number.parseInt(form.number.trim(), 10),
        name: form.name.trim(),
        description: normalizeOptionalValue(form.description),
        isActive: form.isActive,
      };

    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response: AcademicLevelMutationResponse;

      if (formMode === 'create') {
        response = await createAcademicLevel(input);
        setPage(1);
      } else {
        const academicLevelId = selectedAcademicLevelId;

        if (typeof academicLevelId !== 'number') {
          setFormErrorMessage(
            'No se ha podido identificar el nivel académico que se quiere editar.',
          );
          return;
        }

        response = await updateAcademicLevel(
          academicLevelId,
          input,
        );
      }

      setSuccessMessage(response.message);
      closeForm();
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
        setFieldErrors(getApiFieldErrors(error));
      } else {
        setFormErrorMessage(
          'No se ha podido guardar el nivel académico.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(
    academicLevel: AcademicLevel,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar el nivel ${academicLevel.name}? El historial se conservará.`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `archive-${academicLevel.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await archiveAcademicLevel(
        academicLevel.id,
      );

      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido archivar el nivel académico.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleRestore(
    academicLevel: AcademicLevel,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar el nivel ${academicLevel.name}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `restore-${academicLevel.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await restoreAcademicLevel(
        academicLevel.id,
      );

      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido restaurar el nivel académico.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  const totalPages = Math.max(
    1,
    result?.pagination.totalPages ?? 1,
  );

  return (
    <main className="academic-levels-page">
      <section className="academic-levels-header">
        <div>
          <p className="eyebrow">
            Estructura académica
          </p>

          <h2>Niveles académicos</h2>

          <p>
            Gestiona los niveles de los ciclos, como
            primer curso y segundo curso, para vincularlos
            después con módulos y ofertas académicas.
          </p>
        </div>

        {canCreateAcademicLevels && (
          <button
            className="button button-primary"
            type="button"
            onClick={openCreateForm}
          >
            Nuevo nivel
          </button>
        )}
      </section>

      <section className="academic-levels-panel">
        {successMessage && (
          <div className="alert alert-success" role="status">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form
          className="academic-levels-filters"
          onSubmit={handleSearchSubmit}
        >
          <div className="academic-levels-filter-field">
            <label htmlFor="academic-level-search">
              Buscar
            </label>

            <input
              id="academic-level-search"
              type="search"
              value={searchInput}
              placeholder="Nombre o descripción..."
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
            />
          </div>

          <div className="academic-levels-filter-field">
            <label htmlFor="academic-level-number-filter">
              Número
            </label>

            <input
              id="academic-level-number-filter"
              type="number"
              min="1"
              max="99"
              step="1"
              value={numberInput}
              placeholder="1, 2..."
              onChange={(event) => {
                setNumberInput(event.target.value);
              }}
            />
          </div>

          <div className="academic-levels-filter-field">
            <label htmlFor="academic-level-status">
              Estado
            </label>

            <select
              id="academic-level-status"
              value={status}
              onChange={(event) => {
                if (isAcademicLevelStatusFilter(event.target.value)) {
                  setStatus(event.target.value);
                  setPage(1);
                }
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="archived">Archivados</option>
            </select>
          </div>

          <div className="academic-levels-filter-actions">
            <button className="button button-primary" type="submit">
              Buscar
            </button>

            <button
              className="button button-secondary"
              type="button"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="academic-levels-loading">
            <div className="spinner" />
            <p>Cargando niveles académicos...</p>
          </div>
        ) : result && result.items.length > 0 ? (
          <>
            <div className="academic-levels-table-wrapper">
              <table className="academic-levels-table">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th>Uso</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    {showActions && <th>Acciones</th>}
                  </tr>
                </thead>

                <tbody>
                  {result.items.map((academicLevel) => {
                    const academicLevelStatus =
                      getAcademicLevelStatus(academicLevel);

                    const rowActionRunning =
                      actionKey?.endsWith(`-${academicLevel.id}`) ?? false;

                    return (
                      <tr key={academicLevel.id}>
                        <td>
                          <div className="academic-level-identity">
                            <span className="academic-level-number-badge">
                              Nivel {academicLevel.number}
                            </span>

                            <strong>{academicLevel.name}</strong>

                            <span>
                              {academicLevel.description
                                || 'Sin descripción'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="academic-level-summary">
                            <strong>
                              {academicLevel.summary.totalModuleCount} módulo(s)
                            </strong>

                            <span>
                              {academicLevel.summary.totalOfferingCount}{' '}
                              oferta(s) académica(s)
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`academic-level-status ${academicLevelStatus.className}`}
                          >
                            {academicLevelStatus.label}
                          </span>
                        </td>

                        <td>{formatDateTime(academicLevel.createdAt)}</td>

                        {showActions && (
                          <td>
                            <div className="academic-level-actions">
                              {canEditAcademicLevels
                                && !academicLevel.deletedAt
                                && (
                                  <button
                                    className="academic-level-action-button academic-level-action-edit"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      openEditForm(academicLevel.id);
                                    }}
                                  >
                                    Editar
                                  </button>
                                )}

                              {canArchiveAcademicLevels
                                && !academicLevel.deletedAt
                                && (
                                  <button
                                    className="academic-level-action-button academic-level-action-archive"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      void handleArchive(academicLevel);
                                    }}
                                  >
                                    Archivar
                                  </button>
                                )}

                              {canArchiveAcademicLevels
                                && academicLevel.deletedAt
                                && (
                                  <button
                                    className="academic-level-action-button academic-level-action-restore"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      void handleRestore(academicLevel);
                                    }}
                                  >
                                    Restaurar
                                  </button>
                                )}

                              {rowActionRunning && (
                                <span className="academic-level-action-running">
                                  Procesando...
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="academic-levels-pagination">
              <p>
                {result.pagination.total}{' '}
                nivel o niveles encontrados
              </p>

              <div className="academic-levels-pagination-controls">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => {
                    setPage((currentPage) =>
                      Math.max(1, currentPage - 1),
                    );
                  }}
                >
                  Anterior
                </button>

                <span>
                  Página {page} de {totalPages}
                </span>

                <button
                  className="button button-secondary"
                  type="button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => {
                    setPage((currentPage) => currentPage + 1);
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="academic-levels-empty">
            <h3>No se han encontrado niveles</h3>
            <p>Modifica los filtros o crea un nuevo nivel académico.</p>
          </div>
        )}
      </section>

      {modalIsOpen && (
        <div
          className="academic-levels-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeForm();
            }
          }}
        >
          <section
            className="academic-levels-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-level-modal-title"
          >
            <header className="academic-levels-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create' ? 'Nuevo registro' : 'Edición'}
                </p>

                <h2 id="academic-level-modal-title">
                  {formMode === 'create'
                    ? 'Crear nivel académico'
                    : 'Editar nivel académico'}
                </h2>

                <p>
                  Define el número, nombre y descripción del nivel.
                </p>
              </div>

              <button
                className="academic-levels-modal-close"
                type="button"
                aria-label="Cerrar"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            {isLoadingAcademicLevel ? (
              <div className="academic-levels-modal-loading">
                <div className="spinner" />
                <p>Cargando nivel académico...</p>
              </div>
            ) : (
              <form
                className="academic-level-form"
                onSubmit={(event) => {
                  void handleFormSubmit(event);
                }}
              >
                {formErrorMessage && (
                  <div className="alert alert-error" role="alert">
                    {formErrorMessage}
                  </div>
                )}

                {selectedAcademicLevel?.deletedAt && (
                  <div className="alert alert-information">
                    Este nivel está archivado y no puede modificarse hasta que
                    se restaure.
                  </div>
                )}

                <div className="academic-level-form-grid">
                  <div className="academic-level-form-field">
                    <label htmlFor="academic-level-number">
                      Número
                    </label>

                    <input
                      id="academic-level-number"
                      type="number"
                      min="1"
                      max="99"
                      step="1"
                      value={form.number}
                      placeholder="1"
                      aria-invalid={Boolean(fieldErrors.number)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('number', event.target.value);
                      }}
                    />

                    {fieldErrors.number && (
                      <span className="academic-level-field-error">
                        {fieldErrors.number}
                      </span>
                    )}
                  </div>

                  <div className="academic-level-form-field">
                    <label htmlFor="academic-level-name">
                      Nombre
                    </label>

                    <input
                      id="academic-level-name"
                      type="text"
                      value={form.name}
                      placeholder="Primer curso"
                      aria-invalid={Boolean(fieldErrors.name)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('name', event.target.value);
                      }}
                    />

                    {fieldErrors.name && (
                      <span className="academic-level-field-error">
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  <div className="academic-level-form-field academic-level-form-field-wide">
                    <label htmlFor="academic-level-description">
                      Descripción
                    </label>

                    <textarea
                      id="academic-level-description"
                      value={form.description}
                      placeholder="Descripción interna opcional del nivel."
                      aria-invalid={Boolean(fieldErrors.description)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('description', event.target.value);
                      }}
                    />

                    <span className="academic-level-field-help">
                      Campo opcional. Máximo 255 caracteres.
                    </span>

                    {fieldErrors.description && (
                      <span className="academic-level-field-error">
                        {fieldErrors.description}
                      </span>
                    )}
                  </div>
                </div>

                <label className="academic-level-active-option">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setForm((currentForm) => ({
                        ...currentForm,
                        isActive: event.target.checked,
                      }));
                    }}
                  />

                  <span>
                    <strong>Nivel activo</strong>

                    <small>
                      Un nivel inactivo se conserva, pero no debe usarse para
                      nuevas ofertas académicas.
                    </small>
                  </span>
                </label>

                <footer className="academic-level-form-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={isSubmitting}
                    onClick={closeForm}
                  >
                    Cancelar
                  </button>

                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isSubmitting || isLoadingAcademicLevel}
                  >
                    {isSubmitting
                      ? 'Guardando...'
                      : formMode === 'create'
                        ? 'Crear nivel'
                        : 'Guardar cambios'}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

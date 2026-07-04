import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../services/api.service';
import {
  archiveAcademicYear,
  createAcademicYear,
  getAcademicYear,
  getAcademicYears,
  restoreAcademicYear,
  setCurrentAcademicYear,
  updateAcademicYear,
} from '../services/academic-years.service';
import type {
  AcademicYear,
  AcademicYearCurrentFilter,
  AcademicYearMutationResponse,
  AcademicYearStatusFilter,
  CreateAcademicYearInput,
  ListAcademicYearsResponse,
  UpdateAcademicYearInput,
} from '../types/academic-years';
import './AcademicYearsPage.css';

const PAGE_SIZE = 10;

interface AcademicYearsPageProps {
  canCreateAcademicYears: boolean;
  canEditAcademicYears: boolean;
  canSetCurrentAcademicYear: boolean;
  canArchiveAcademicYears: boolean;
}

interface AcademicYearFormState {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

type AcademicYearFormMode = 'create' | 'edit';
type AcademicYearTextField = 'name' | 'startDate' | 'endDate';
type FieldErrors = Record<string, string>;

function createEmptyAcademicYearForm(): AcademicYearFormState {
  return {
    name: '',
    startDate: '',
    endDate: '',
    isActive: true,
  };
}

function isAcademicYearStatusFilter(
  value: string,
): value is AcademicYearStatusFilter {
  return (
    value === 'all' ||
    value === 'active' ||
    value === 'inactive' ||
    value === 'archived'
  );
}

function isAcademicYearCurrentFilter(
  value: string,
): value is AcademicYearCurrentFilter {
  return value === 'all' || value === 'current' || value === 'not-current';
}

function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number.parseInt(match[1] ?? '', 10);
  const month = Number.parseInt(match[2] ?? '', 10);
  const day = Number.parseInt(match[3] ?? '', 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getAcademicYearNumbers(
  name: string,
): { startYear: number; endYear: number } | null {
  const match = /^(\d{4})\/(\d{4})$/.exec(name);

  if (!match) {
    return null;
  }

  return {
    startYear: Number.parseInt(match[1] ?? '', 10),
    endYear: Number.parseInt(match[2] ?? '', 10),
  };
}

function validateAcademicYearForm(form: AcademicYearFormState): FieldErrors {
  const errors: FieldErrors = {};
  const academicYearNumbers = getAcademicYearNumbers(form.name.trim());

  if (!academicYearNumbers) {
    errors.name = 'El nombre debe tener el formato 2025/2026.';
  } else if (
    academicYearNumbers.endYear !==
    academicYearNumbers.startYear + 1
  ) {
    errors.name = 'Los años del curso deben ser consecutivos.';
  }

  const startDateIsValid = isValidDateString(form.startDate);
  const endDateIsValid = isValidDateString(form.endDate);

  if (!startDateIsValid) {
    errors.startDate = 'La fecha de inicio no es válida.';
  }

  if (!endDateIsValid) {
    errors.endDate = 'La fecha de finalización no es válida.';
  }

  if (startDateIsValid && endDateIsValid && form.startDate >= form.endDate) {
    errors.endDate =
      'La fecha de finalización debe ser posterior a la fecha de inicio.';
  }

  if (academicYearNumbers && startDateIsValid) {
    const startDateYear = Number.parseInt(form.startDate.slice(0, 4), 10);

    if (startDateYear !== academicYearNumbers.startYear) {
      errors.startDate =
        'El año de inicio no coincide con el nombre del curso.';
    }
  }

  if (academicYearNumbers && endDateIsValid) {
    const endDateYear = Number.parseInt(form.endDate.slice(0, 4), 10);

    if (endDateYear !== academicYearNumbers.endYear) {
      errors.endDate =
        'El año de finalización no coincide con el nombre del curso.';
    }
  }

  return errors;
}

function getApiFieldErrors(error: ApiError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const detail of error.details) {
    fieldErrors[detail.field] = detail.message;
  }

  return fieldErrors;
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return 'Fecha no disponible';
  }

  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function getAcademicYearStatus(academicYear: AcademicYear): {
  label: string;
  className: string;
} {
  if (academicYear.deletedAt) {
    return {
      label: 'Archivado',
      className: 'academic-year-status-archived',
    };
  }

  if (!academicYear.isActive) {
    return {
      label: 'Inactivo',
      className: 'academic-year-status-inactive',
    };
  }

  return {
    label: 'Activo',
    className: 'academic-year-status-active',
  };
}

export function AcademicYearsPage({
  canCreateAcademicYears,
  canEditAcademicYears,
  canSetCurrentAcademicYear,
  canArchiveAcademicYears,
}: AcademicYearsPageProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AcademicYearStatusFilter>('all');
  const [current, setCurrent] = useState<AcademicYearCurrentFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListAcademicYearsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [formMode, setFormMode] = useState<AcademicYearFormMode | null>(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<
    number | null
  >(null);
  const [selectedAcademicYear, setSelectedAcademicYear] =
    useState<AcademicYear | null>(null);
  const [form, setForm] = useState<AcademicYearFormState>(
    createEmptyAcademicYearForm,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isLoadingAcademicYear, setIsLoadingAcademicYear] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const modalIsOpen = formMode !== null;
  const isEditingCurrentAcademicYear =
    formMode === 'edit' && selectedAcademicYear?.isCurrent === true;
  const showActions =
    canEditAcademicYears ||
    canSetCurrentAcademicYear ||
    canArchiveAcademicYears;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadAcademicYears(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const academicYearsResult = await getAcademicYears({
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
          status,
          current,
        });

        if (!requestWasCancelled) {
          setResult(academicYearsResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de cursos académicos.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAcademicYears();

    return () => {
      requestWasCancelled = true;
    };
  }, [current, page, refreshVersion, search, status]);

  useEffect(() => {
    if (
      result &&
      result.pagination.totalPages > 0 &&
      page > result.pagination.totalPages
    ) {
      setPage(result.pagination.totalPages);
    }
  }, [page, result]);

  useEffect(() => {
    const academicYearId = selectedAcademicYearId;

    if (formMode !== 'edit' || typeof academicYearId !== 'number') {
      return;
    }

    let requestWasCancelled = false;

    async function loadAcademicYear(id: number): Promise<void> {
      setIsLoadingAcademicYear(true);
      setFormErrorMessage(null);

      try {
        const response = await getAcademicYear(id);

        if (requestWasCancelled) {
          return;
        }

        setSelectedAcademicYear(response.academicYear);
        setForm({
          name: response.academicYear.name,
          startDate: response.academicYear.startDate,
          endDate: response.academicYear.endDate,
          isActive: response.academicYear.isActive,
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(error.message);
        } else {
          setFormErrorMessage(
            'No se han podido cargar los datos del curso académico.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingAcademicYear(false);
        }
      }
    }

    void loadAcademicYear(academicYearId);

    return () => {
      requestWasCancelled = true;
    };
  }, [formMode, selectedAcademicYearId]);

  useEffect(() => {
    if (!modalIsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent): void {
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
    setSelectedAcademicYearId(null);
    setSelectedAcademicYear(null);
    setForm(createEmptyAcademicYearForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingAcademicYear(false);
  }

  function openCreateForm(): void {
    setFormMode('create');
    setSelectedAcademicYearId(null);
    setSelectedAcademicYear(null);
    setForm(createEmptyAcademicYearForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function openEditForm(academicYearId: number): void {
    setFormMode('edit');
    setSelectedAcademicYearId(academicYearId);
    setSelectedAcademicYear(null);
    setForm(createEmptyAcademicYearForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters(): void {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setCurrent('all');
    setPage(1);
  }

  function updateTextField(field: AcademicYearTextField, value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
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

    const validationErrors = validateAcademicYearForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormErrorMessage('Revisa los campos señalados.');
      return;
    }

    const input: CreateAcademicYearInput | UpdateAcademicYearInput = {
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      isActive: form.isActive,
    };

    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response: AcademicYearMutationResponse;

      if (formMode === 'create') {
        response = await createAcademicYear(input);
        setPage(1);
      } else {
        const academicYearId = selectedAcademicYearId;

        if (typeof academicYearId !== 'number') {
          setFormErrorMessage(
            'No se ha podido identificar el curso académico que se quiere editar.',
          );
          return;
        }

        response = await updateAcademicYear(academicYearId, input);
      }

      setSuccessMessage(response.message);
      closeForm();
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
        setFieldErrors(getApiFieldErrors(error));
      } else {
        setFormErrorMessage('No se ha podido guardar el curso académico.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetCurrent(academicYear: AcademicYear): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres establecer ${academicYear.name} como curso académico actual?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `set-current-${academicYear.id}`;
    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await setCurrentAcademicYear(academicYear.id);
      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido establecer el curso académico actual.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleArchive(academicYear: AcademicYear): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar el curso ${academicYear.name}? El historial se conservará.`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `archive-${academicYear.id}`;
    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await archiveAcademicYear(academicYear.id);
      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se ha podido archivar el curso académico.');
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleRestore(academicYear: AcademicYear): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar el curso ${academicYear.name}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `restore-${academicYear.id}`;
    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await restoreAcademicYear(academicYear.id);
      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se ha podido restaurar el curso académico.');
      }
    } finally {
      setActionKey(null);
    }
  }

  const totalPages = Math.max(1, result?.pagination.totalPages ?? 1);

  return (
    <main className="academic-years-page">
      <section className="academic-years-header">
        <div>
          <p className="eyebrow">Estructura académica</p>
          <h2>Cursos académicos</h2>
          <p>
            Gestiona los periodos académicos y establece cuál utiliza la
            aplicación como curso actual.
          </p>
        </div>

        {canCreateAcademicYears && (
          <button
            className="button button-primary"
            type="button"
            onClick={openCreateForm}
          >
            Nuevo curso
          </button>
        )}
      </section>

      <section className="academic-years-panel">
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

        <form className="academic-years-filters" onSubmit={handleSearchSubmit}>
          <div className="academic-years-filter-field">
            <label htmlFor="academic-year-search">Buscar</label>
            <input
              id="academic-year-search"
              type="search"
              value={searchInput}
              placeholder="Ejemplo: 2025/2026"
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="academic-years-filter-field">
            <label htmlFor="academic-year-status">Estado</label>
            <select
              id="academic-year-status"
              value={status}
              onChange={(event) => {
                if (isAcademicYearStatusFilter(event.target.value)) {
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

          <div className="academic-years-filter-field">
            <label htmlFor="academic-year-current">Curso actual</label>
            <select
              id="academic-year-current"
              value={current}
              onChange={(event) => {
                if (isAcademicYearCurrentFilter(event.target.value)) {
                  setCurrent(event.target.value);
                  setPage(1);
                }
              }}
            >
              <option value="all">Todos</option>
              <option value="current">Solo el actual</option>
              <option value="not-current">No actuales</option>
            </select>
          </div>

          <div className="academic-years-filter-actions">
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
          <div className="academic-years-loading">
            <div className="spinner" />
            <p>Cargando cursos académicos...</p>
          </div>
        ) : result && result.items.length > 0 ? (
          <>
            <div className="academic-years-table-wrapper">
              <table className="academic-years-table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Periodo</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    {showActions && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((academicYear) => {
                    const academicYearStatus =
                      getAcademicYearStatus(academicYear);
                    const rowActionRunning =
                      actionKey?.endsWith(`-${academicYear.id}`) ?? false;

                    return (
                      <tr key={academicYear.id}>
                        <td>
                          <div className="academic-year-identity">
                            <strong>
                              {academicYear.name}
                              {academicYear.isCurrent && (
                                <span className="academic-year-current-badge">
                                  Actual
                                </span>
                              )}
                            </strong>
                            <span>Identificador: {academicYear.id}</span>
                          </div>
                        </td>
                        <td>
                          <div className="academic-year-period">
                            <span>{formatDateOnly(academicYear.startDate)}</span>
                            <span aria-hidden="true">→</span>
                            <span>{formatDateOnly(academicYear.endDate)}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`academic-year-status ${academicYearStatus.className}`}
                          >
                            {academicYearStatus.label}
                          </span>
                        </td>
                        <td>{formatDateTime(academicYear.createdAt)}</td>
                        {showActions && (
                          <td>
                            <div className="academic-year-actions">
                              {canEditAcademicYears &&
                                !academicYear.deletedAt && (
                                  <button
                                    className="academic-year-action-button academic-year-action-edit"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => openEditForm(academicYear.id)}
                                  >
                                    Editar
                                  </button>
                                )}

                              {canSetCurrentAcademicYear &&
                                !academicYear.deletedAt &&
                                !academicYear.isCurrent && (
                                  <button
                                    className="academic-year-action-button academic-year-action-current"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      void handleSetCurrent(academicYear);
                                    }}
                                  >
                                    Establecer actual
                                  </button>
                                )}

                              {canArchiveAcademicYears &&
                                !academicYear.deletedAt && (
                                  <button
                                    className="academic-year-action-button academic-year-action-archive"
                                    type="button"
                                    title={
                                      academicYear.isCurrent
                                        ? 'Establece primero otro curso como actual.'
                                        : undefined
                                    }
                                    disabled={
                                      rowActionRunning || academicYear.isCurrent
                                    }
                                    onClick={() => {
                                      void handleArchive(academicYear);
                                    }}
                                  >
                                    Archivar
                                  </button>
                                )}

                              {canArchiveAcademicYears &&
                                academicYear.deletedAt && (
                                  <button
                                    className="academic-year-action-button academic-year-action-restore"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      void handleRestore(academicYear);
                                    }}
                                  >
                                    Restaurar
                                  </button>
                                )}

                              {rowActionRunning && (
                                <span className="academic-year-action-running">
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

            <div className="academic-years-pagination">
              <p>{result.pagination.total} curso o cursos encontrados</p>
              <div className="academic-years-pagination-controls">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => {
                    setPage((currentPage) => Math.max(1, currentPage - 1));
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
          <div className="academic-years-empty">
            <h3>No se han encontrado cursos</h3>
            <p>Modifica los filtros o crea un nuevo curso académico.</p>
          </div>
        )}
      </section>

      {modalIsOpen && (
        <div
          className="academic-years-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeForm();
            }
          }}
        >
          <section
            className="academic-years-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-year-modal-title"
          >
            <header className="academic-years-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create' ? 'Nuevo registro' : 'Edición'}
                </p>
                <h2 id="academic-year-modal-title">
                  {formMode === 'create'
                    ? 'Crear curso académico'
                    : 'Editar curso académico'}
                </h2>
                <p>
                  Define el nombre, las fechas y el estado del periodo
                  académico.
                </p>
              </div>
              <button
                className="academic-years-modal-close"
                type="button"
                aria-label="Cerrar"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            {isLoadingAcademicYear ? (
              <div className="academic-years-modal-loading">
                <div className="spinner" />
                <p>Cargando curso académico...</p>
              </div>
            ) : (
              <form
                className="academic-year-form"
                onSubmit={(event) => {
                  void handleFormSubmit(event);
                }}
              >
                {formErrorMessage && (
                  <div className="alert alert-error" role="alert">
                    {formErrorMessage}
                  </div>
                )}

                {isEditingCurrentAcademicYear && (
                  <div className="alert alert-information">
                    Este es el curso académico actual. No puede desactivarse
                    hasta establecer otro curso como actual.
                  </div>
                )}

                <div className="academic-year-form-grid">
                  <div className="academic-year-form-field academic-year-form-field-wide">
                    <label htmlFor="academic-year-name">Nombre del curso</label>
                    <input
                      id="academic-year-name"
                      type="text"
                      value={form.name}
                      placeholder="2025/2026"
                      aria-invalid={Boolean(fieldErrors.name)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('name', event.target.value);
                      }}
                    />
                    <span className="academic-year-field-help">
                      Utiliza dos años consecutivos, separados por una barra.
                    </span>
                    {fieldErrors.name && (
                      <span className="academic-year-field-error">
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  <div className="academic-year-form-field">
                    <label htmlFor="academic-year-start-date">
                      Fecha de inicio
                    </label>
                    <input
                      id="academic-year-start-date"
                      type="date"
                      value={form.startDate}
                      aria-invalid={Boolean(fieldErrors.startDate)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('startDate', event.target.value);
                      }}
                    />
                    {fieldErrors.startDate && (
                      <span className="academic-year-field-error">
                        {fieldErrors.startDate}
                      </span>
                    )}
                  </div>

                  <div className="academic-year-form-field">
                    <label htmlFor="academic-year-end-date">
                      Fecha de finalización
                    </label>
                    <input
                      id="academic-year-end-date"
                      type="date"
                      value={form.endDate}
                      aria-invalid={Boolean(fieldErrors.endDate)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('endDate', event.target.value);
                      }}
                    />
                    {fieldErrors.endDate && (
                      <span className="academic-year-field-error">
                        {fieldErrors.endDate}
                      </span>
                    )}
                  </div>
                </div>

                <label className="academic-year-active-option">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    disabled={isSubmitting || isEditingCurrentAcademicYear}
                    onChange={(event) => {
                      setForm((currentForm) => ({
                        ...currentForm,
                        isActive: event.target.checked,
                      }));
                    }}
                  />
                  <span>
                    <strong>Curso activo</strong>
                    <small>
                      Los cursos inactivos se conservan, pero no pueden
                      utilizarse para nuevas ofertas académicas.
                    </small>
                  </span>
                </label>

                <footer className="academic-year-form-actions">
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
                    disabled={isSubmitting || isLoadingAcademicYear}
                  >
                    {isSubmitting
                      ? 'Guardando...'
                      : formMode === 'create'
                        ? 'Crear curso'
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

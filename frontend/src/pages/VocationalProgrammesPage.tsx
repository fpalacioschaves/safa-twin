import { useEffect, useState, type FormEvent } from 'react';

import { ApiError } from '../services/api.service';

import {
  archiveVocationalProgramme,
  createVocationalProgramme,
  getVocationalProgramme,
  getVocationalProgrammes,
  restoreVocationalProgramme,
  updateVocationalProgramme,
} from '../services/vocational-programmes.service';

import type {
  CreateVocationalProgrammeInput,
  ListVocationalProgrammesResponse,
  ProgrammeType,
  ProgrammeTypeFilter,
  UpdateVocationalProgrammeInput,
  VocationalProgramme,
  VocationalProgrammeMutationResponse,
  VocationalProgrammeStatusFilter,
} from '../types/vocational-programmes';

import './VocationalProgrammesPage.css';

const PAGE_SIZE = 10;

interface VocationalProgrammesPageProps {
  canCreateVocationalProgrammes: boolean;
  canEditVocationalProgrammes: boolean;
  canArchiveVocationalProgrammes: boolean;
}

interface VocationalProgrammeFormState {
  code: string;
  name: string;
  acronym: string;
  family: string;
  type: ProgrammeType;
  totalHours: string;
  description: string;
  isActive: boolean;
}

type VocationalProgrammeFormMode = 'create' | 'edit';

type VocationalProgrammeTextField =
  | 'code'
  | 'name'
  | 'acronym'
  | 'family'
  | 'totalHours'
  | 'description';

type FieldErrors = Record<string, string>;

function createEmptyVocationalProgrammeForm(): VocationalProgrammeFormState {
  return {
    code: '',
    name: '',
    acronym: '',
    family: 'Informática y Comunicaciones',
    type: 'HIGHER',
    totalHours: '2000',
    description: '',
    isActive: true,
  };
}

function isVocationalProgrammeStatusFilter(
  value: string,
): value is VocationalProgrammeStatusFilter {
  return (
    value === 'all'
    || value === 'active'
    || value === 'inactive'
    || value === 'archived'
  );
}

function isProgrammeTypeFilter(value: string): value is ProgrammeTypeFilter {
  return (
    value === 'all'
    || value === 'BASIC'
    || value === 'INTERMEDIATE'
    || value === 'HIGHER'
    || value === 'SPECIALIZATION'
  );
}

function isProgrammeType(value: string): value is ProgrammeType {
  return (
    value === 'BASIC'
    || value === 'INTERMEDIATE'
    || value === 'HIGHER'
    || value === 'SPECIALIZATION'
  );
}

function normalizeOptionalValue(value: string): string | undefined {
  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function normalizeOptionalNumber(value: string): number | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return Number.parseInt(normalizedValue, 10);
}

function validateVocationalProgrammeForm(
  form: VocationalProgrammeFormState,
): FieldErrors {
  const errors: FieldErrors = {};
  const code = form.code.trim();
  const name = form.name.trim();
  const acronym = form.acronym.trim();
  const family = form.family.trim();
  const totalHours = form.totalHours.trim();
  const description = form.description.trim();

  const codePattern = /^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/;
  const acronymPattern = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;

  if (code.length < 2) {
    errors.code = 'El código debe tener al menos 2 caracteres.';
  } else if (code.length > 50) {
    errors.code = 'El código no puede superar los 50 caracteres.';
  } else if (!codePattern.test(code)) {
    errors.code =
      'El código solo puede contener letras, números, puntos, guiones y guiones bajos.';
  }

  if (name.length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres.';
  } else if (name.length > 191) {
    errors.name = 'El nombre no puede superar los 191 caracteres.';
  }

  if (acronym.length < 2) {
    errors.acronym = 'Las siglas deben tener al menos 2 caracteres.';
  } else if (acronym.length > 20) {
    errors.acronym = 'Las siglas no pueden superar los 20 caracteres.';
  } else if (!acronymPattern.test(acronym)) {
    errors.acronym =
      'Las siglas solo pueden contener letras, números, guiones y guiones bajos.';
  }

  if (family.length > 150) {
    errors.family =
      'La familia profesional no puede superar los 150 caracteres.';
  }

  if (totalHours) {
    const totalHoursNumber = Number.parseInt(totalHours, 10);

    if (
      !Number.isInteger(totalHoursNumber)
      || totalHoursNumber.toString() !== totalHours
    ) {
      errors.totalHours = 'Las horas totales deben ser un número entero.';
    } else if (totalHoursNumber < 1) {
      errors.totalHours = 'Las horas totales deben ser mayores que cero.';
    } else if (totalHoursNumber > 10000) {
      errors.totalHours = 'Las horas totales no pueden superar 10000.';
    }
  }

  if (description.length > 5000) {
    errors.description = 'La descripción no puede superar los 5000 caracteres.';
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

function formatProgrammeType(type: ProgrammeType): string {
  const labels: Record<ProgrammeType, string> = {
    BASIC: 'Grado Básico',
    INTERMEDIATE: 'Grado Medio',
    HIGHER: 'Grado Superior',
    SPECIALIZATION: 'Curso de Especialización',
  };

  return labels[type];
}

function getVocationalProgrammeStatus(vocationalProgramme: VocationalProgramme): {
  label: string;
  className: string;
} {
  if (vocationalProgramme.deletedAt) {
    return {
      label: 'Archivado',
      className: 'vocational-programme-status-archived',
    };
  }

  if (!vocationalProgramme.isActive) {
    return {
      label: 'Inactivo',
      className: 'vocational-programme-status-inactive',
    };
  }

  return {
    label: 'Activo',
    className: 'vocational-programme-status-active',
  };
}

export function VocationalProgrammesPage({
  canCreateVocationalProgrammes,
  canEditVocationalProgrammes,
  canArchiveVocationalProgrammes,
}: VocationalProgrammesPageProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VocationalProgrammeStatusFilter>('all');
  const [type, setType] = useState<ProgrammeTypeFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] =
    useState<ListVocationalProgrammesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [formMode, setFormMode] =
    useState<VocationalProgrammeFormMode | null>(null);
  const [selectedVocationalProgrammeId, setSelectedVocationalProgrammeId] =
    useState<number | null>(null);
  const [selectedVocationalProgramme, setSelectedVocationalProgramme] =
    useState<VocationalProgramme | null>(null);
  const [form, setForm] = useState<VocationalProgrammeFormState>(
    createEmptyVocationalProgrammeForm,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isLoadingVocationalProgramme, setIsLoadingVocationalProgramme] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const modalIsOpen = formMode !== null;
  const showActions =
    canEditVocationalProgrammes || canArchiveVocationalProgrammes;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadVocationalProgrammes(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const vocationalProgrammesResult = await getVocationalProgrammes({
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
          status,
          type,
        });

        if (!requestWasCancelled) {
          setResult(vocationalProgrammesResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de ciclos formativos.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadVocationalProgrammes();

    return () => {
      requestWasCancelled = true;
    };
  }, [page, refreshVersion, search, status, type]);

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
    const vocationalProgrammeId = selectedVocationalProgrammeId;

    if (formMode !== 'edit' || typeof vocationalProgrammeId !== 'number') {
      return;
    }

    let requestWasCancelled = false;

    async function loadVocationalProgramme(id: number): Promise<void> {
      setIsLoadingVocationalProgramme(true);
      setFormErrorMessage(null);

      try {
        const response = await getVocationalProgramme(id);

        if (requestWasCancelled) {
          return;
        }

        setSelectedVocationalProgramme(response.vocationalProgramme);

        setForm({
          code: response.vocationalProgramme.code,
          name: response.vocationalProgramme.name,
          acronym: response.vocationalProgramme.acronym,
          family: response.vocationalProgramme.family ?? '',
          type: response.vocationalProgramme.type,
          totalHours: response.vocationalProgramme.totalHours?.toString() ?? '',
          description: response.vocationalProgramme.description ?? '',
          isActive: response.vocationalProgramme.isActive,
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(error.message);
        } else {
          setFormErrorMessage(
            'No se han podido cargar los datos del ciclo formativo.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingVocationalProgramme(false);
        }
      }
    }

    void loadVocationalProgramme(vocationalProgrammeId);

    return () => {
      requestWasCancelled = true;
    };
  }, [formMode, selectedVocationalProgrammeId]);

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
    setSelectedVocationalProgrammeId(null);
    setSelectedVocationalProgramme(null);
    setForm(createEmptyVocationalProgrammeForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingVocationalProgramme(false);
  }

  function openCreateForm(): void {
    setFormMode('create');
    setSelectedVocationalProgrammeId(null);
    setSelectedVocationalProgramme(null);
    setForm(createEmptyVocationalProgrammeForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function openEditForm(vocationalProgrammeId: number): void {
    setFormMode('edit');
    setSelectedVocationalProgrammeId(vocationalProgrammeId);
    setSelectedVocationalProgramme(null);
    setForm(createEmptyVocationalProgrammeForm());
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
    setType('all');
    setPage(1);
  }

  function updateTextField(
    field: VocationalProgrammeTextField,
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

    const validationErrors = validateVocationalProgrammeForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormErrorMessage('Revisa los campos señalados.');
      return;
    }

    const input: CreateVocationalProgrammeInput | UpdateVocationalProgrammeInput = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      acronym: form.acronym.trim().toUpperCase(),
      family: normalizeOptionalValue(form.family),
      type: form.type,
      totalHours: normalizeOptionalNumber(form.totalHours),
      description: normalizeOptionalValue(form.description),
      isActive: form.isActive,
    };

    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response: VocationalProgrammeMutationResponse;

      if (formMode === 'create') {
        response = await createVocationalProgramme(input);
        setPage(1);
      } else {
        const vocationalProgrammeId = selectedVocationalProgrammeId;

        if (typeof vocationalProgrammeId !== 'number') {
          setFormErrorMessage(
            'No se ha podido identificar el ciclo formativo que se quiere editar.',
          );
          return;
        }

        response = await updateVocationalProgramme(vocationalProgrammeId, input);
      }

      setSuccessMessage(response.message);
      closeForm();
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
        setFieldErrors(getApiFieldErrors(error));
      } else {
        setFormErrorMessage('No se ha podido guardar el ciclo formativo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(
    vocationalProgramme: VocationalProgramme,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar el ciclo ${vocationalProgramme.acronym}? El historial se conservará.`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `archive-${vocationalProgramme.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await archiveVocationalProgramme(vocationalProgramme.id);
      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se ha podido archivar el ciclo formativo.');
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleRestore(
    vocationalProgramme: VocationalProgramme,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar el ciclo ${vocationalProgramme.acronym}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `restore-${vocationalProgramme.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await restoreVocationalProgramme(vocationalProgramme.id);
      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se ha podido restaurar el ciclo formativo.');
      }
    } finally {
      setActionKey(null);
    }
  }

  const totalPages = Math.max(1, result?.pagination.totalPages ?? 1);

  return (
    <main className="vocational-programmes-page">
      <section className="vocational-programmes-header">
        <div>
          <p className="eyebrow">Estructura académica</p>
          <h2>Ciclos formativos</h2>
          <p>
            Gestiona DAW, DAM y el resto de ciclos, sus códigos oficiales,
            familia profesional, tipo y horas totales.
          </p>
        </div>

        {canCreateVocationalProgrammes && (
          <button
            className="button button-primary"
            type="button"
            onClick={openCreateForm}
          >
            Nuevo ciclo
          </button>
        )}
      </section>

      <section className="vocational-programmes-panel">
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
          className="vocational-programmes-filters"
          onSubmit={handleSearchSubmit}
        >
          <div className="vocational-programmes-filter-field">
            <label htmlFor="vocational-programme-search">Buscar</label>
            <input
              id="vocational-programme-search"
              type="search"
              value={searchInput}
              placeholder="Código, siglas, nombre o familia..."
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
            />
          </div>

          <div className="vocational-programmes-filter-field">
            <label htmlFor="vocational-programme-status">Estado</label>
            <select
              id="vocational-programme-status"
              value={status}
              onChange={(event) => {
                if (isVocationalProgrammeStatusFilter(event.target.value)) {
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

          <div className="vocational-programmes-filter-field">
            <label htmlFor="vocational-programme-type">Tipo</label>
            <select
              id="vocational-programme-type"
              value={type}
              onChange={(event) => {
                if (isProgrammeTypeFilter(event.target.value)) {
                  setType(event.target.value);
                  setPage(1);
                }
              }}
            >
              <option value="all">Todos</option>
              <option value="BASIC">Grado Básico</option>
              <option value="INTERMEDIATE">Grado Medio</option>
              <option value="HIGHER">Grado Superior</option>
              <option value="SPECIALIZATION">Especialización</option>
            </select>
          </div>

          <div className="vocational-programmes-filter-actions">
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
          <div className="vocational-programmes-loading">
            <div className="spinner" />
            <p>Cargando ciclos formativos...</p>
          </div>
        ) : result && result.items.length > 0 ? (
          <>
            <div className="vocational-programmes-table-wrapper">
              <table className="vocational-programmes-table">
                <thead>
                  <tr>
                    <th>Ciclo</th>
                    <th>Familia y tipo</th>
                    <th>Horas</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    {showActions && <th>Acciones</th>}
                  </tr>
                </thead>

                <tbody>
                  {result.items.map((vocationalProgramme) => {
                    const vocationalProgrammeStatus =
                      getVocationalProgrammeStatus(vocationalProgramme);

                    const rowActionRunning =
                      actionKey?.endsWith(`-${vocationalProgramme.id}`) ?? false;

                    return (
                      <tr key={vocationalProgramme.id}>
                        <td>
                          <div className="vocational-programme-identity">
                            <strong>{vocationalProgramme.name}</strong>
                            <span className="vocational-programme-acronym">
                              {vocationalProgramme.acronym}
                            </span>
                            <span>Código: {vocationalProgramme.code}</span>
                          </div>
                        </td>

                        <td>
                          <div className="vocational-programme-metadata">
                            <strong>
                              {formatProgrammeType(vocationalProgramme.type)}
                            </strong>
                            <span>
                              {vocationalProgramme.family
                                || 'Sin familia profesional'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="vocational-programme-hours">
                            <strong>
                              {vocationalProgramme.totalHours
                                ? `${vocationalProgramme.totalHours} h`
                                : 'Sin horas'}
                            </strong>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`vocational-programme-status ${vocationalProgrammeStatus.className}`}
                          >
                            {vocationalProgrammeStatus.label}
                          </span>
                        </td>

                        <td>{formatDateTime(vocationalProgramme.createdAt)}</td>

                        {showActions && (
                          <td>
                            <div className="vocational-programme-actions">
                              {canEditVocationalProgrammes
                                && !vocationalProgramme.deletedAt && (
                                  <button
                                    className="vocational-programme-action-button vocational-programme-action-edit"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      openEditForm(vocationalProgramme.id);
                                    }}
                                  >
                                    Editar
                                  </button>
                                )}

                              {canArchiveVocationalProgrammes
                                && !vocationalProgramme.deletedAt && (
                                  <button
                                    className="vocational-programme-action-button vocational-programme-action-archive"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      void handleArchive(vocationalProgramme);
                                    }}
                                  >
                                    Archivar
                                  </button>
                                )}

                              {canArchiveVocationalProgrammes
                                && vocationalProgramme.deletedAt && (
                                  <button
                                    className="vocational-programme-action-button vocational-programme-action-restore"
                                    type="button"
                                    disabled={rowActionRunning}
                                    onClick={() => {
                                      void handleRestore(vocationalProgramme);
                                    }}
                                  >
                                    Restaurar
                                  </button>
                                )}

                              {rowActionRunning && (
                                <span className="vocational-programme-action-running">
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

            <div className="vocational-programmes-pagination">
              <p>{result.pagination.total} ciclo o ciclos encontrados</p>

              <div className="vocational-programmes-pagination-controls">
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
          <div className="vocational-programmes-empty">
            <h3>No se han encontrado ciclos</h3>
            <p>Modifica los filtros o crea un nuevo ciclo formativo.</p>
          </div>
        )}
      </section>

      {modalIsOpen && (
        <div
          className="vocational-programmes-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeForm();
            }
          }}
        >
          <section
            className="vocational-programmes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vocational-programme-modal-title"
          >
            <header className="vocational-programmes-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create' ? 'Nuevo registro' : 'Edición'}
                </p>
                <h2 id="vocational-programme-modal-title">
                  {formMode === 'create'
                    ? 'Crear ciclo formativo'
                    : 'Editar ciclo formativo'}
                </h2>
                <p>
                  Define el código, siglas, nombre, familia, tipo y horas
                  oficiales.
                </p>
              </div>

              <button
                className="vocational-programmes-modal-close"
                type="button"
                aria-label="Cerrar"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            {isLoadingVocationalProgramme ? (
              <div className="vocational-programmes-modal-loading">
                <div className="spinner" />
                <p>Cargando ciclo formativo...</p>
              </div>
            ) : (
              <form
                className="vocational-programme-form"
                onSubmit={(event) => {
                  void handleFormSubmit(event);
                }}
              >
                {formErrorMessage && (
                  <div className="alert alert-error" role="alert">
                    {formErrorMessage}
                  </div>
                )}

                {selectedVocationalProgramme?.deletedAt && (
                  <div className="alert alert-information">
                    Este ciclo está archivado y no puede modificarse hasta que se
                    restaure.
                  </div>
                )}

                <div className="vocational-programme-form-grid">
                  <div className="vocational-programme-form-field">
                    <label htmlFor="vocational-programme-code">
                      Código oficial
                    </label>
                    <input
                      id="vocational-programme-code"
                      type="text"
                      value={form.code}
                      placeholder="IFC-303"
                      aria-invalid={Boolean(fieldErrors.code)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('code', event.target.value);
                      }}
                    />
                    {fieldErrors.code && (
                      <span className="vocational-programme-field-error">
                        {fieldErrors.code}
                      </span>
                    )}
                  </div>

                  <div className="vocational-programme-form-field">
                    <label htmlFor="vocational-programme-acronym">Siglas</label>
                    <input
                      id="vocational-programme-acronym"
                      type="text"
                      value={form.acronym}
                      placeholder="DAW"
                      aria-invalid={Boolean(fieldErrors.acronym)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('acronym', event.target.value);
                      }}
                    />
                    {fieldErrors.acronym && (
                      <span className="vocational-programme-field-error">
                        {fieldErrors.acronym}
                      </span>
                    )}
                  </div>

                  <div className="vocational-programme-form-field vocational-programme-form-field-wide">
                    <label htmlFor="vocational-programme-name">
                      Nombre del ciclo
                    </label>
                    <input
                      id="vocational-programme-name"
                      type="text"
                      value={form.name}
                      placeholder="Desarrollo de Aplicaciones Web"
                      aria-invalid={Boolean(fieldErrors.name)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('name', event.target.value);
                      }}
                    />
                    {fieldErrors.name && (
                      <span className="vocational-programme-field-error">
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  <div className="vocational-programme-form-field">
                    <label htmlFor="vocational-programme-family">
                      Familia profesional
                    </label>
                    <input
                      id="vocational-programme-family"
                      type="text"
                      value={form.family}
                      placeholder="Informática y Comunicaciones"
                      aria-invalid={Boolean(fieldErrors.family)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('family', event.target.value);
                      }}
                    />
                    {fieldErrors.family && (
                      <span className="vocational-programme-field-error">
                        {fieldErrors.family}
                      </span>
                    )}
                  </div>

                  <div className="vocational-programme-form-field">
                    <label htmlFor="vocational-programme-form-type">
                      Tipo de enseñanza
                    </label>
                    <select
                      id="vocational-programme-form-type"
                      value={form.type}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        const selectedProgrammeType = event.target.value;

                        if (!isProgrammeType(selectedProgrammeType)) {
                          return;
                        }

                        const programmeType: ProgrammeType = selectedProgrammeType;

                        setForm((currentForm) => ({
                          ...currentForm,
                          type: programmeType,
                        }));
                      }}
                    >
                      <option value="BASIC">Grado Básico</option>
                      <option value="INTERMEDIATE">Grado Medio</option>
                      <option value="HIGHER">Grado Superior</option>
                      <option value="SPECIALIZATION">Especialización</option>
                    </select>
                  </div>

                  <div className="vocational-programme-form-field">
                    <label htmlFor="vocational-programme-total-hours">
                      Horas totales
                    </label>
                    <input
                      id="vocational-programme-total-hours"
                      type="number"
                      min="1"
                      max="10000"
                      step="1"
                      value={form.totalHours}
                      placeholder="2000"
                      aria-invalid={Boolean(fieldErrors.totalHours)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('totalHours', event.target.value);
                      }}
                    />
                    {fieldErrors.totalHours && (
                      <span className="vocational-programme-field-error">
                        {fieldErrors.totalHours}
                      </span>
                    )}
                  </div>

                  <div className="vocational-programme-form-field vocational-programme-form-field-wide">
                    <label htmlFor="vocational-programme-description">
                      Descripción
                    </label>
                    <textarea
                      id="vocational-programme-description"
                      value={form.description}
                      placeholder="Descripción interna opcional del ciclo."
                      aria-invalid={Boolean(fieldErrors.description)}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        updateTextField('description', event.target.value);
                      }}
                    />
                    <span className="vocational-programme-field-help">
                      Campo opcional para observaciones internas.
                    </span>
                    {fieldErrors.description && (
                      <span className="vocational-programme-field-error">
                        {fieldErrors.description}
                      </span>
                    )}
                  </div>
                </div>

                <label className="vocational-programme-active-option">
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
                    <strong>Ciclo activo</strong>
                    <small>
                      Un ciclo inactivo se conserva, pero no debe usarse para
                      nuevas ofertas académicas.
                    </small>
                  </span>
                </label>

                <footer className="vocational-programme-form-actions">
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
                    disabled={isSubmitting || isLoadingVocationalProgramme}
                  >
                    {isSubmitting
                      ? 'Guardando...'
                      : formMode === 'create'
                        ? 'Crear ciclo'
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

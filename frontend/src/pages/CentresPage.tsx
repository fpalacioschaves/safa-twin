import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../services/api.service';
import {
  archiveCentre,
  createCentre,
  getCentre,
  getCentres,
  restoreCentre,
  updateCentre,
} from '../services/centres.service';
import type {
  Centre,
  CentreMutationResponse,
  CentreStatusFilter,
  CreateCentreInput,
  ListCentresResponse,
  UpdateCentreInput,
} from '../types/centres';
import './CentresPage.css';

const PAGE_SIZE = 10;

interface CentresPageProps {
  canCreateCentres: boolean;
  canEditCentres: boolean;
  canArchiveCentres: boolean;
}

interface CentreFormState {
  code: string;
  name: string;
  shortName: string;
  taxId: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  isActive: boolean;
}

type CentreFormMode = 'create' | 'edit';

type CentreTextField =
  | 'code'
  | 'name'
  | 'shortName'
  | 'taxId'
  | 'address'
  | 'postalCode'
  | 'city'
  | 'province'
  | 'phone'
  | 'email';

type FieldErrors = Record<string, string>;

function createEmptyCentreForm(): CentreFormState {
  return {
    code: '',
    name: '',
    shortName: '',
    taxId: '',
    address: '',
    postalCode: '',
    city: '',
    province: '',
    phone: '',
    email: '',
    isActive: true,
  };
}

function isCentreStatusFilter(value: string): value is CentreStatusFilter {
  return (
    value === 'all' ||
    value === 'active' ||
    value === 'inactive' ||
    value === 'archived'
  );
}

function normalizeOptionalValue(value: string): string | undefined {
  const normalizedValue = value.trim();
  return normalizedValue || undefined;
}

function validateCentreForm(form: CentreFormState): FieldErrors {
  const errors: FieldErrors = {};
  const code = form.code.trim();
  const name = form.name.trim();
  const shortName = form.shortName.trim();
  const taxId = form.taxId.trim();
  const address = form.address.trim();
  const postalCode = form.postalCode.trim();
  const city = form.city.trim();
  const province = form.province.trim();
  const phone = form.phone.trim();
  const email = form.email.trim();

  const codePattern = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (code.length < 2) {
    errors.code = 'El código debe tener al menos 2 caracteres.';
  } else if (code.length > 50) {
    errors.code = 'El código no puede superar los 50 caracteres.';
  } else if (!codePattern.test(code)) {
    errors.code =
      'El código solo puede contener letras, números, guiones y guiones bajos.';
  }

  if (name.length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres.';
  } else if (name.length > 191) {
    errors.name = 'El nombre no puede superar los 191 caracteres.';
  }

  if (shortName.length > 100) {
    errors.shortName = 'El nombre corto no puede superar los 100 caracteres.';
  }

  if (taxId.length > 20) {
    errors.taxId = 'El CIF o NIF no puede superar los 20 caracteres.';
  }

  if (address.length > 255) {
    errors.address = 'La dirección no puede superar los 255 caracteres.';
  }

  if (postalCode.length > 10) {
    errors.postalCode = 'El código postal no puede superar los 10 caracteres.';
  }

  if (city.length > 100) {
    errors.city = 'La ciudad no puede superar los 100 caracteres.';
  }

  if (province.length > 100) {
    errors.province = 'La provincia no puede superar los 100 caracteres.';
  }

  if (phone.length > 30) {
    errors.phone = 'El teléfono no puede superar los 30 caracteres.';
  }

  if (email) {
    if (email.length > 191) {
      errors.email =
        'El correo electrónico no puede superar los 191 caracteres.';
    } else if (!emailPattern.test(email)) {
      errors.email = 'El correo electrónico no tiene un formato válido.';
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

function getCentreStatus(centre: Centre): {
  label: string;
  className: string;
} {
  if (centre.deletedAt) {
    return {
      label: 'Archivado',
      className: 'centre-status-archived',
    };
  }

  if (!centre.isActive) {
    return {
      label: 'Inactivo',
      className: 'centre-status-inactive',
    };
  }

  return {
    label: 'Activo',
    className: 'centre-status-active',
  };
}

function getCentreLocation(centre: Centre): string {
  const locationParts = [
    centre.postalCode,
    centre.city,
    centre.province,
  ].filter((value): value is string => Boolean(value));

  if (locationParts.length === 0) {
    return 'Sin ubicación';
  }

  return locationParts.join(', ');
}

export function CentresPage({
  canCreateCentres,
  canEditCentres,
  canArchiveCentres,
}: CentresPageProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CentreStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListCentresResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [formMode, setFormMode] = useState<CentreFormMode | null>(null);
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [form, setForm] = useState<CentreFormState>(createEmptyCentreForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isLoadingCentre, setIsLoadingCentre] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const modalIsOpen = formMode !== null;
  const showActions = canEditCentres || canArchiveCentres;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadCentres(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const centresResult = await getCentres({
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
          status,
        });

        if (!requestWasCancelled) {
          setResult(centresResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('No se ha podido cargar el listado de centros.');
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCentres();

    return () => {
      requestWasCancelled = true;
    };
  }, [page, refreshVersion, search, status]);

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
    const centreId = selectedCentreId;

    if (formMode !== 'edit' || typeof centreId !== 'number') {
      return;
    }

    let requestWasCancelled = false;

    async function loadCentre(id: number): Promise<void> {
      setIsLoadingCentre(true);
      setFormErrorMessage(null);

      try {
        const response = await getCentre(id);

        if (requestWasCancelled) {
          return;
        }

        setForm({
          code: response.centre.code,
          name: response.centre.name,
          shortName: response.centre.shortName ?? '',
          taxId: response.centre.taxId ?? '',
          address: response.centre.address ?? '',
          postalCode: response.centre.postalCode ?? '',
          city: response.centre.city ?? '',
          province: response.centre.province ?? '',
          phone: response.centre.phone ?? '',
          email: response.centre.email ?? '',
          isActive: response.centre.isActive,
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(error.message);
        } else {
          setFormErrorMessage('No se han podido cargar los datos del centro.');
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingCentre(false);
        }
      }
    }

    void loadCentre(centreId);

    return () => {
      requestWasCancelled = true;
    };
  }, [formMode, selectedCentreId]);

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
    setSelectedCentreId(null);
    setForm(createEmptyCentreForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingCentre(false);
  }

  function openCreateForm(): void {
    setFormMode('create');
    setSelectedCentreId(null);
    setForm(createEmptyCentreForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function openEditForm(centreId: number): void {
    setFormMode('edit');
    setSelectedCentreId(centreId);
    setForm(createEmptyCentreForm());
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
    setPage(1);
  }

  function updateTextField(field: CentreTextField, value: string): void {
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

    const validationErrors = validateCentreForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormErrorMessage('Revisa los campos señalados.');
      return;
    }

    const input: CreateCentreInput | UpdateCentreInput = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      shortName: normalizeOptionalValue(form.shortName),
      taxId: normalizeOptionalValue(form.taxId)?.toUpperCase(),
      address: normalizeOptionalValue(form.address),
      postalCode: normalizeOptionalValue(form.postalCode),
      city: normalizeOptionalValue(form.city),
      province: normalizeOptionalValue(form.province),
      phone: normalizeOptionalValue(form.phone),
      email: normalizeOptionalValue(form.email)?.toLowerCase(),
      isActive: form.isActive,
    };

    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response: CentreMutationResponse;

      if (formMode === 'create') {
        response = await createCentre(input);
        setPage(1);
      } else {
        const centreId = selectedCentreId;

        if (typeof centreId !== 'number') {
          setFormErrorMessage(
            'No se ha podido identificar el centro que se quiere editar.',
          );
          return;
        }

        response = await updateCentre(centreId, input);
      }

      setSuccessMessage(response.message);
      closeForm();
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
        setFieldErrors(getApiFieldErrors(error));
      } else {
        setFormErrorMessage('No se ha podido guardar el centro.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(centre: Centre): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar el centro ${centre.name}? El historial y sus asociaciones se conservarán.`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `archive-${centre.id}`;
    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await archiveCentre(centre.id);
      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se ha podido archivar el centro.');
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleRestore(centre: Centre): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar el centro ${centre.name}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey = `restore-${centre.id}`;
    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await restoreCentre(centre.id);
      setSuccessMessage(response.message);
      setRefreshVersion((version) => version + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se ha podido restaurar el centro.');
      }
    } finally {
      setActionKey(null);
    }
  }

  const totalPages = Math.max(1, result?.pagination.totalPages ?? 1);

  return (
    <main className="centres-page">
      <section className="centres-header">
        <div>
          <p className="eyebrow">Estructura académica</p>
          <h2>Centros</h2>
          <p>
            Gestiona los centros educativos, sus datos de identificación,
            localización y contacto.
          </p>
        </div>

        {canCreateCentres && (
          <button
            className="button button-primary"
            type="button"
            onClick={openCreateForm}
          >
            Nuevo centro
          </button>
        )}
      </section>

      <section className="centres-panel">
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

        <form className="centres-filters" onSubmit={handleSearchSubmit}>
          <div className="centres-filter-field">
            <label htmlFor="centre-search">Buscar</label>
            <input
              id="centre-search"
              type="search"
              value={searchInput}
              placeholder="Código, nombre, ciudad, provincia..."
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="centres-filter-field">
            <label htmlFor="centre-status">Estado</label>
            <select
              id="centre-status"
              value={status}
              onChange={(event) => {
                if (isCentreStatusFilter(event.target.value)) {
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

          <div className="centres-filter-actions">
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
          <div className="centres-loading">
            <div className="spinner" />
            <p>Cargando centros...</p>
          </div>
        ) : result && result.items.length > 0 ? (
          <>
            <div className="centres-table-wrapper">
              <table className="centres-table">
                <thead>
                  <tr>
                    <th>Centro</th>
                    <th>Ubicación</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    {showActions && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((centre) => {
                    const centreStatus = getCentreStatus(centre);
                    const rowActionRunning =
                      actionKey?.endsWith(`-${centre.id}`) ?? false;

                    return (
                      <tr key={centre.id}>
                        <td>
                          <div className="centre-identity">
                            <strong>{centre.shortName || centre.name}</strong>
                            {centre.shortName && <span>{centre.name}</span>}
                            <span className="centre-code">{centre.code}</span>
                          </div>
                        </td>
                        <td>
                          <div className="centre-location">
                            <strong>{getCentreLocation(centre)}</strong>
                            <span>{centre.address || 'Sin dirección'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="centre-contact">
                            <span>{centre.email || 'Sin correo'}</span>
                            <span>{centre.phone || 'Sin teléfono'}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`centre-status ${centreStatus.className}`}
                          >
                            {centreStatus.label}
                          </span>
                        </td>
                        <td>{formatDateTime(centre.createdAt)}</td>
                        {showActions && (
                          <td>
                            <div className="centre-actions">
                              {canEditCentres && !centre.deletedAt && (
                                <button
                                  className="centre-action-button centre-action-edit"
                                  type="button"
                                  disabled={rowActionRunning}
                                  onClick={() => openEditForm(centre.id)}
                                >
                                  Editar
                                </button>
                              )}

                              {canArchiveCentres && !centre.deletedAt && (
                                <button
                                  className="centre-action-button centre-action-archive"
                                  type="button"
                                  disabled={rowActionRunning}
                                  onClick={() => {
                                    void handleArchive(centre);
                                  }}
                                >
                                  Archivar
                                </button>
                              )}

                              {canArchiveCentres && centre.deletedAt && (
                                <button
                                  className="centre-action-button centre-action-restore"
                                  type="button"
                                  disabled={rowActionRunning}
                                  onClick={() => {
                                    void handleRestore(centre);
                                  }}
                                >
                                  Restaurar
                                </button>
                              )}

                              {rowActionRunning && (
                                <span className="centre-action-running">
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

            <div className="centres-pagination">
              <p>{result.pagination.total} centro o centros encontrados</p>
              <div className="centres-pagination-controls">
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
          <div className="centres-empty">
            <h3>No se han encontrado centros</h3>
            <p>Modifica los filtros o crea un nuevo centro.</p>
          </div>
        )}
      </section>

      {modalIsOpen && (
        <div
          className="centres-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeForm();
            }
          }}
        >
          <section
            className="centres-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="centre-modal-title"
          >
            <header className="centres-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create' ? 'Nuevo registro' : 'Edición'}
                </p>
                <h2 id="centre-modal-title">
                  {formMode === 'create' ? 'Crear centro' : 'Editar centro'}
                </h2>
                <p>
                  Introduce los datos identificativos, administrativos y de
                  contacto.
                </p>
              </div>
              <button
                className="centres-modal-close"
                type="button"
                aria-label="Cerrar"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            {isLoadingCentre ? (
              <div className="centres-modal-loading">
                <div className="spinner" />
                <p>Cargando datos del centro...</p>
              </div>
            ) : (
              <form
                className="centre-form"
                onSubmit={(event) => {
                  void handleFormSubmit(event);
                }}
              >
                {formErrorMessage && (
                  <div className="alert alert-error" role="alert">
                    {formErrorMessage}
                  </div>
                )}

                <fieldset className="centre-form-section">
                  <legend>Identificación</legend>
                  <div className="centre-form-grid">
                    <div className="centre-form-field">
                      <label htmlFor="centre-code">Código</label>
                      <input
                        id="centre-code"
                        type="text"
                        value={form.code}
                        placeholder="SAFA-MALAGA"
                        aria-invalid={Boolean(fieldErrors.code)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('code', event.target.value);
                        }}
                      />
                      {fieldErrors.code && (
                        <span className="centre-field-error">
                          {fieldErrors.code}
                        </span>
                      )}
                    </div>

                    <div className="centre-form-field">
                      <label htmlFor="centre-tax-id">CIF o NIF</label>
                      <input
                        id="centre-tax-id"
                        type="text"
                        value={form.taxId}
                        aria-invalid={Boolean(fieldErrors.taxId)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('taxId', event.target.value);
                        }}
                      />
                      {fieldErrors.taxId && (
                        <span className="centre-field-error">
                          {fieldErrors.taxId}
                        </span>
                      )}
                    </div>

                    <div className="centre-form-field centre-form-field-wide">
                      <label htmlFor="centre-name">Nombre completo</label>
                      <input
                        id="centre-name"
                        type="text"
                        value={form.name}
                        aria-invalid={Boolean(fieldErrors.name)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('name', event.target.value);
                        }}
                      />
                      {fieldErrors.name && (
                        <span className="centre-field-error">
                          {fieldErrors.name}
                        </span>
                      )}
                    </div>

                    <div className="centre-form-field centre-form-field-wide">
                      <label htmlFor="centre-short-name">Nombre corto</label>
                      <input
                        id="centre-short-name"
                        type="text"
                        value={form.shortName}
                        placeholder="SAFA Málaga"
                        aria-invalid={Boolean(fieldErrors.shortName)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('shortName', event.target.value);
                        }}
                      />
                      {fieldErrors.shortName && (
                        <span className="centre-field-error">
                          {fieldErrors.shortName}
                        </span>
                      )}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="centre-form-section">
                  <legend>Ubicación</legend>
                  <div className="centre-form-grid">
                    <div className="centre-form-field centre-form-field-wide">
                      <label htmlFor="centre-address">Dirección</label>
                      <input
                        id="centre-address"
                        type="text"
                        value={form.address}
                        aria-invalid={Boolean(fieldErrors.address)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('address', event.target.value);
                        }}
                      />
                      {fieldErrors.address && (
                        <span className="centre-field-error">
                          {fieldErrors.address}
                        </span>
                      )}
                    </div>

                    <div className="centre-form-field">
                      <label htmlFor="centre-postal-code">Código postal</label>
                      <input
                        id="centre-postal-code"
                        type="text"
                        value={form.postalCode}
                        aria-invalid={Boolean(fieldErrors.postalCode)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('postalCode', event.target.value);
                        }}
                      />
                      {fieldErrors.postalCode && (
                        <span className="centre-field-error">
                          {fieldErrors.postalCode}
                        </span>
                      )}
                    </div>

                    <div className="centre-form-field">
                      <label htmlFor="centre-city">Ciudad</label>
                      <input
                        id="centre-city"
                        type="text"
                        value={form.city}
                        aria-invalid={Boolean(fieldErrors.city)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('city', event.target.value);
                        }}
                      />
                      {fieldErrors.city && (
                        <span className="centre-field-error">
                          {fieldErrors.city}
                        </span>
                      )}
                    </div>

                    <div className="centre-form-field centre-form-field-wide">
                      <label htmlFor="centre-province">Provincia</label>
                      <input
                        id="centre-province"
                        type="text"
                        value={form.province}
                        aria-invalid={Boolean(fieldErrors.province)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('province', event.target.value);
                        }}
                      />
                      {fieldErrors.province && (
                        <span className="centre-field-error">
                          {fieldErrors.province}
                        </span>
                      )}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="centre-form-section">
                  <legend>Contacto</legend>
                  <div className="centre-form-grid">
                    <div className="centre-form-field">
                      <label htmlFor="centre-phone">Teléfono</label>
                      <input
                        id="centre-phone"
                        type="tel"
                        value={form.phone}
                        aria-invalid={Boolean(fieldErrors.phone)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('phone', event.target.value);
                        }}
                      />
                      {fieldErrors.phone && (
                        <span className="centre-field-error">
                          {fieldErrors.phone}
                        </span>
                      )}
                    </div>

                    <div className="centre-form-field">
                      <label htmlFor="centre-email">Correo electrónico</label>
                      <input
                        id="centre-email"
                        type="email"
                        value={form.email}
                        aria-invalid={Boolean(fieldErrors.email)}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField('email', event.target.value);
                        }}
                      />
                      {fieldErrors.email && (
                        <span className="centre-field-error">
                          {fieldErrors.email}
                        </span>
                      )}
                    </div>
                  </div>
                </fieldset>

                <label className="centre-active-option">
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
                    <strong>Centro activo</strong>
                    <small>
                      Un centro inactivo se conserva, pero no podrá utilizarse
                      para crear nuevas ofertas académicas.
                    </small>
                  </span>
                </label>

                <footer className="centre-form-actions">
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
                    disabled={isSubmitting || isLoadingCentre}
                  >
                    {isSubmitting
                      ? 'Guardando...'
                      : formMode === 'create'
                        ? 'Crear centro'
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

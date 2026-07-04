import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  getAcademicLevels,
} from '../services/academic-levels.service';

import {
  archiveModule,
  createModule,
  getModule,
  getModules,
  restoreModule,
  updateModule,
} from '../services/modules.service';

import {
  getVocationalProgrammes,
} from '../services/vocational-programmes.service';

import type {
  AcademicLevel,
} from '../types/academic-levels';

import type {
  CreateModuleInput,
  ListModulesResponse,
  ModuleMutationResponse,
  ModuleStatusFilter,
  ProfessionalModule,
  UpdateModuleInput,
} from '../types/modules';

import type {
  VocationalProgramme,
} from '../types/vocational-programmes';

import './ModulesPage.css';

const PAGE_SIZE = 10;
const SELECT_PAGE_SIZE = 50;

interface ModulesPageProps {
  canCreateModules: boolean;
  canEditModules: boolean;
  canArchiveModules: boolean;
}

interface ModuleFormState {
  vocationalProgrammeId: string;
  academicLevelId: string;
  code: string;
  name: string;
  acronym: string;
  totalHours: string;
  weeklyHours: string;
  sortOrder: string;
  isActive: boolean;
}

type ModuleFormMode =
  | 'create'
  | 'edit';

type ModuleTextField =
  | 'vocationalProgrammeId'
  | 'academicLevelId'
  | 'code'
  | 'name'
  | 'acronym'
  | 'totalHours'
  | 'weeklyHours'
  | 'sortOrder';

type FieldErrors = Record<string, string>;

function createEmptyModuleForm(): ModuleFormState {
  return {
    vocationalProgrammeId: '',
    academicLevelId: '',
    code: '',
    name: '',
    acronym: '',
    totalHours: '',
    weeklyHours: '',
    sortOrder: '0',
    isActive: true,
  };
}

function isModuleStatusFilter(
  value: string,
): value is ModuleStatusFilter {
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

function normalizeOptionalInteger(
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

function normalizeOptionalDecimal(
  value: string,
): number | undefined {
  const normalizedValue =
    value.trim().replace(',', '.');

  if (!normalizedValue) {
    return undefined;
  }

  return Number.parseFloat(
    normalizedValue,
  );
}

function parseRequiredPositiveInteger(
  value: string,
): number | null {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue =
    Number.parseInt(
      normalizedValue,
      10,
    );

  if (parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parseRequiredNonNegativeInteger(
  value: string,
): number | null {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue =
    Number.parseInt(
      normalizedValue,
      10,
    );

  if (parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function validateModuleForm(
  form: ModuleFormState,
): FieldErrors {
  const errors: FieldErrors = {};

  const vocationalProgrammeId =
    parseRequiredPositiveInteger(
      form.vocationalProgrammeId,
    );

  const academicLevelId =
    parseRequiredPositiveInteger(
      form.academicLevelId,
    );

  const code = form.code.trim();
  const name = form.name.trim();
  const acronym = form.acronym.trim();
  const totalHours = form.totalHours.trim();
  const weeklyHours =
    form.weeklyHours.trim().replace(',', '.');

  const sortOrder =
    parseRequiredNonNegativeInteger(
      form.sortOrder,
    );

  const codePattern =
    /^[A-Za-z0-9]+(?:[-_./][A-Za-z0-9]+)*$/;

  const acronymPattern =
    /^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/;

  if (vocationalProgrammeId === null) {
    errors.vocationalProgrammeId =
      'Selecciona un ciclo formativo.';
  }

  if (academicLevelId === null) {
    errors.academicLevelId =
      'Selecciona un nivel académico.';
  }

  if (code.length < 2) {
    errors.code =
      'El código debe tener al menos 2 caracteres.';
  } else if (code.length > 50) {
    errors.code =
      'El código no puede superar los 50 caracteres.';
  } else if (!codePattern.test(code)) {
    errors.code =
      'El código solo puede contener letras, números, puntos, barras, guiones y guiones bajos.';
  }

  if (name.length < 3) {
    errors.name =
      'El nombre debe tener al menos 3 caracteres.';
  } else if (name.length > 191) {
    errors.name =
      'El nombre no puede superar los 191 caracteres.';
  }

  if (acronym) {
    if (acronym.length > 30) {
      errors.acronym =
        'Las siglas no pueden superar los 30 caracteres.';
    } else if (!acronymPattern.test(acronym)) {
      errors.acronym =
        'Las siglas solo pueden contener letras, números, puntos, guiones y guiones bajos.';
    }
  }

  if (totalHours) {
    if (!/^\d+$/.test(totalHours)) {
      errors.totalHours =
        'Las horas totales deben ser un número entero.';
    } else {
      const totalHoursNumber =
        Number.parseInt(
          totalHours,
          10,
        );

      if (totalHoursNumber < 1) {
        errors.totalHours =
          'Las horas totales deben ser mayores que cero.';
      } else if (totalHoursNumber > 10000) {
        errors.totalHours =
          'Las horas totales no pueden superar 10000.';
      }
    }
  }

  if (weeklyHours) {
    const weeklyHoursNumber =
      Number.parseFloat(weeklyHours);

    if (
      Number.isNaN(weeklyHoursNumber)
      || weeklyHoursNumber <= 0
    ) {
      errors.weeklyHours =
        'Las horas semanales deben ser mayores que cero.';
    } else if (weeklyHoursNumber > 99.99) {
      errors.weeklyHours =
        'Las horas semanales no pueden superar 99,99.';
    } else if (
      !/^\d+(?:\.\d{1,2})?$/.test(weeklyHours)
    ) {
      errors.weeklyHours =
        'Las horas semanales no pueden tener más de dos decimales.';
    }
  }

  if (sortOrder === null) {
    errors.sortOrder =
      'El orden debe ser un número entero igual o mayor que cero.';
  } else if (sortOrder > 9999) {
    errors.sortOrder =
      'El orden no puede superar 9999.';
  }

  return errors;
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

function getModuleStatus(
  module: ProfessionalModule,
): {
  label: string;
  className: string;
} {
  if (module.deletedAt) {
    return {
      label: 'Archivado',
      className: 'module-status-archived',
    };
  }

  if (!module.isActive) {
    return {
      label: 'Inactivo',
      className: 'module-status-inactive',
    };
  }

  return {
    label: 'Activo',
    className: 'module-status-active',
  };
}

function getProgrammeLabel(
  programme: VocationalProgramme,
): string {
  return `${programme.acronym} · ${programme.name}`;
}

function getLevelLabel(
  level: AcademicLevel,
): string {
  return `${level.number}.º · ${level.name}`;
}

export function ModulesPage({
  canCreateModules,
  canEditModules,
  canArchiveModules,
}: ModulesPageProps) {
  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState<ModuleStatusFilter>('all');

  const [
    vocationalProgrammeFilter,
    setVocationalProgrammeFilter,
  ] = useState('');

  const [
    academicLevelFilter,
    setAcademicLevelFilter,
  ] = useState('');

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState<ListModulesResponse | null>(null);

  const [
    vocationalProgrammes,
    setVocationalProgrammes,
  ] = useState<VocationalProgramme[]>([]);

  const [
    academicLevels,
    setAcademicLevels,
  ] = useState<AcademicLevel[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingSelectors,
    setIsLoadingSelectors,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  const [formMode, setFormMode] =
    useState<ModuleFormMode | null>(null);

  const [
    selectedModuleId,
    setSelectedModuleId,
  ] = useState<number | null>(null);

  const [
    selectedModule,
    setSelectedModule,
  ] = useState<ProfessionalModule | null>(null);

  const [form, setForm] =
    useState<ModuleFormState>(
      createEmptyModuleForm,
    );

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<FieldErrors>({});

  const [
    formErrorMessage,
    setFormErrorMessage,
  ] = useState<string | null>(null);

  const [
    isLoadingModule,
    setIsLoadingModule,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    actionKey,
    setActionKey,
  ] = useState<string | null>(null);

  const modalIsOpen =
    formMode !== null;

  const showActions =
    canEditModules
    || canArchiveModules;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadSelectors():
    Promise<void> {
      setIsLoadingSelectors(true);

      try {
        const [
          programmesResult,
          levelsResult,
        ] = await Promise.all([
          getVocationalProgrammes({
            search: undefined,
            page: 1,
            pageSize: SELECT_PAGE_SIZE,
            status: 'active',
            type: 'all',
          }),

          getAcademicLevels({
            search: undefined,
            page: 1,
            pageSize: SELECT_PAGE_SIZE,
            status: 'active',
          }),
        ]);

        if (requestWasCancelled) {
          return;
        }

        setVocationalProgrammes(
          programmesResult.items,
        );

        setAcademicLevels(
          levelsResult.items,
        );
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se han podido cargar los ciclos o niveles para el formulario.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingSelectors(false);
        }
      }
    }

    void loadSelectors();

    return () => {
      requestWasCancelled = true;
    };
  }, []);

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadModules():
    Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      const vocationalProgrammeId =
        vocationalProgrammeFilter
          ? Number.parseInt(
              vocationalProgrammeFilter,
              10,
            )
          : undefined;

      const academicLevelId =
        academicLevelFilter
          ? Number.parseInt(
              academicLevelFilter,
              10,
            )
          : undefined;

      try {
        const modulesResult =
          await getModules({
            search: search || undefined,
            page,
            pageSize: PAGE_SIZE,
            status,
            vocationalProgrammeId,
            academicLevelId,
          });

        if (!requestWasCancelled) {
          setResult(modulesResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de módulos.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadModules();

    return () => {
      requestWasCancelled = true;
    };
  }, [
    academicLevelFilter,
    page,
    refreshVersion,
    search,
    status,
    vocationalProgrammeFilter,
  ]);

  useEffect(() => {
    if (
      result
      && result.pagination.totalPages > 0
      && page > result.pagination.totalPages
    ) {
      setPage(
        result.pagination.totalPages,
      );
    }
  }, [
    page,
    result,
  ]);

  useEffect(() => {
    const moduleId = selectedModuleId;

    if (
      formMode !== 'edit'
      || typeof moduleId !== 'number'
    ) {
      return;
    }

    let requestWasCancelled = false;

    async function loadModule(
      id: number,
    ): Promise<void> {
      setIsLoadingModule(true);
      setFormErrorMessage(null);

      try {
        const response =
          await getModule(id);

        if (requestWasCancelled) {
          return;
        }

        setSelectedModule(response.module);

        setForm({
          vocationalProgrammeId:
            response.module.vocationalProgrammeId
              .toString(),

          academicLevelId:
            response.module.academicLevelId
              .toString(),

          code:
            response.module.code,

          name:
            response.module.name,

          acronym:
            response.module.acronym ?? '',

          totalHours:
            response.module.totalHours
              ?.toString() ?? '',

          weeklyHours:
            response.module.weeklyHours
              ?.toString() ?? '',

          sortOrder:
            response.module.sortOrder.toString(),

          isActive:
            response.module.isActive,
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(error.message);
        } else {
          setFormErrorMessage(
            'No se han podido cargar los datos del módulo.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingModule(false);
        }
      }
    }

    void loadModule(moduleId);

    return () => {
      requestWasCancelled = true;
    };
  }, [
    formMode,
    selectedModuleId,
  ]);

  useEffect(() => {
    if (!modalIsOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (
        event.key === 'Escape'
        && !isSubmitting
      ) {
        closeForm();
      }
    }

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    isSubmitting,
    modalIsOpen,
  ]);

  function closeForm(): void {
    setFormMode(null);
    setSelectedModuleId(null);
    setSelectedModule(null);

    setForm(
      createEmptyModuleForm(),
    );

    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingModule(false);
  }

  function openCreateForm(): void {
    const initialForm =
      createEmptyModuleForm();

    if (vocationalProgrammes.length > 0) {
      initialForm.vocationalProgrammeId =
        vocationalProgrammes[0].id.toString();
    }

    if (academicLevels.length > 0) {
      initialForm.academicLevelId =
        academicLevels[0].id.toString();
    }

    setFormMode('create');
    setSelectedModuleId(null);
    setSelectedModule(null);
    setForm(initialForm);
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function openEditForm(
    moduleId: number,
  ): void {
    setFormMode('edit');
    setSelectedModuleId(moduleId);
    setSelectedModule(null);

    setForm(
      createEmptyModuleForm(),
    );

    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters(): void {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setVocationalProgrammeFilter('');
    setAcademicLevelFilter('');
    setPage(1);
  }

  function updateTextField(
    field: ModuleTextField,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setFieldErrors(
      (currentErrors) => {
        const nextErrors = {
          ...currentErrors,
        };

        delete nextErrors[field];

        return nextErrors;
      },
    );
  }

  async function handleFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!formMode) {
      return;
    }

    const validationErrors =
      validateModuleForm(form);

    if (
      Object.keys(validationErrors)
        .length > 0
    ) {
      setFieldErrors(
        validationErrors,
      );

      setFormErrorMessage(
        'Revisa los campos señalados.',
      );

      return;
    }

    const vocationalProgrammeId =
      parseRequiredPositiveInteger(
        form.vocationalProgrammeId,
      );

    const academicLevelId =
      parseRequiredPositiveInteger(
        form.academicLevelId,
      );

    const sortOrder =
      parseRequiredNonNegativeInteger(
        form.sortOrder,
      );

    if (
      vocationalProgrammeId === null
      || academicLevelId === null
      || sortOrder === null
    ) {
      setFormErrorMessage(
        'No se han podido convertir correctamente los identificadores del formulario.',
      );

      return;
    }

    const input:
      CreateModuleInput
      | UpdateModuleInput = {
        vocationalProgrammeId,
        academicLevelId,

        code:
          form.code.trim().toUpperCase(),

        name:
          form.name.trim(),

        acronym:
          normalizeOptionalValue(
            form.acronym,
          )?.toUpperCase(),

        totalHours:
          normalizeOptionalInteger(
            form.totalHours,
          ),

        weeklyHours:
          normalizeOptionalDecimal(
            form.weeklyHours,
          ),

        sortOrder,

        isActive:
          form.isActive,
      };

    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response:
        ModuleMutationResponse;

      if (formMode === 'create') {
        response =
          await createModule(input);

        setPage(1);
      } else {
        const moduleId =
          selectedModuleId;

        if (typeof moduleId !== 'number') {
          setFormErrorMessage(
            'No se ha podido identificar el módulo que se quiere editar.',
          );

          return;
        }

        response =
          await updateModule(
            moduleId,
            input,
          );
      }

      setSuccessMessage(
        response.message,
      );

      closeForm();

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(
          error.message,
        );

        setFieldErrors(
          getApiFieldErrors(error),
        );
      } else {
        setFormErrorMessage(
          'No se ha podido guardar el módulo.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(
    module: ProfessionalModule,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar el módulo ${module.code} - ${module.name}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey =
      `archive-${module.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await archiveModule(module.id);

      setSuccessMessage(
        response.message,
      );

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido archivar el módulo.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleRestore(
    module: ProfessionalModule,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar el módulo ${module.code} - ${module.name}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey =
      `restore-${module.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await restoreModule(module.id);

      setSuccessMessage(
        response.message,
      );

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido restaurar el módulo.',
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
    <main className="modules-page">
      <section className="modules-header">
        <div>
          <p className="eyebrow">
            Estructura académica
          </p>

          <h2>Módulos profesionales</h2>

          <p>
            Gestiona los módulos de cada ciclo y
            nivel, evitando duplicidades dentro
            del mismo plan de estudios.
          </p>
        </div>

        {canCreateModules && (
          <button
            className="button button-primary"
            type="button"
            disabled={isLoadingSelectors}
            onClick={openCreateForm}
          >
            Nuevo módulo
          </button>
        )}
      </section>

      <section className="modules-panel">
        {successMessage && (
          <div
            className="alert alert-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            className="alert alert-error"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form
          className="modules-filters"
          onSubmit={handleSearchSubmit}
        >
          <div className="modules-filter-field">
            <label htmlFor="module-search">
              Buscar
            </label>

            <input
              id="module-search"
              type="search"
              value={searchInput}
              placeholder="Código, siglas o nombre..."
              onChange={(event) => {
                setSearchInput(
                  event.target.value,
                );
              }}
            />
          </div>

          <div className="modules-filter-field">
            <label htmlFor="module-status">
              Estado
            </label>

            <select
              id="module-status"
              value={status}
              onChange={(event) => {
                if (
                  isModuleStatusFilter(
                    event.target.value,
                  )
                ) {
                  setStatus(
                    event.target.value,
                  );

                  setPage(1);
                }
              }}
            >
              <option value="all">
                Todos
              </option>

              <option value="active">
                Activos
              </option>

              <option value="inactive">
                Inactivos
              </option>

              <option value="archived">
                Archivados
              </option>
            </select>
          </div>

          <div className="modules-filter-field">
            <label htmlFor="module-programme-filter">
              Ciclo
            </label>

            <select
              id="module-programme-filter"
              value={vocationalProgrammeFilter}
              disabled={isLoadingSelectors}
              onChange={(event) => {
                setVocationalProgrammeFilter(
                  event.target.value,
                );

                setPage(1);
              }}
            >
              <option value="">
                Todos
              </option>

              {vocationalProgrammes.map(
                (programme) => (
                  <option
                    key={programme.id}
                    value={programme.id}
                  >
                    {programme.acronym}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="modules-filter-field">
            <label htmlFor="module-level-filter">
              Nivel
            </label>

            <select
              id="module-level-filter"
              value={academicLevelFilter}
              disabled={isLoadingSelectors}
              onChange={(event) => {
                setAcademicLevelFilter(
                  event.target.value,
                );

                setPage(1);
              }}
            >
              <option value="">
                Todos
              </option>

              {academicLevels.map((level) => (
                <option
                  key={level.id}
                  value={level.id}
                >
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modules-filter-actions">
            <button
              className="button button-primary"
              type="submit"
            >
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

        {isLoading
          ? (
            <div className="modules-loading">
              <div className="spinner" />

              <p>
                Cargando módulos...
              </p>
            </div>
          )
          : result
            && result.items.length > 0
            ? (
              <>
                <div className="modules-table-wrapper">
                  <table className="modules-table">
                    <thead>
                      <tr>
                        <th>Módulo</th>
                        <th>Ciclo y nivel</th>
                        <th>Horas</th>
                        <th>Orden</th>
                        <th>Estado</th>
                        <th>Creado</th>

                        {showActions && (
                          <th>Acciones</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {result.items.map((module) => {
                        const moduleStatus =
                          getModuleStatus(module);

                        const rowActionRunning =
                          actionKey?.endsWith(
                            `-${module.id}`,
                          ) ?? false;

                        return (
                          <tr key={module.id}>
                            <td>
                              <div className="module-identity">
                                <strong>
                                  {module.name}
                                </strong>

                                <span className="module-code">
                                  {module.code}
                                </span>

                                <span>
                                  Siglas:
                                  {' '}
                                  {module.acronym || 'Sin siglas'}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="module-programme">
                                <strong>
                                  {module.vocationalProgramme.acronym}
                                  {' '}
                                  ·
                                  {' '}
                                  {module.academicLevel.name}
                                </strong>

                                <span>
                                  {module.vocationalProgramme.name}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="module-hours">
                                <strong>
                                  {module.totalHours
                                    ? `${module.totalHours} h totales`
                                    : 'Sin horas totales'}
                                </strong>

                                <span>
                                  {module.weeklyHours
                                    ? `${module.weeklyHours} h/semana`
                                    : 'Sin horas semanales'}
                                </span>
                              </div>
                            </td>

                            <td>
                              {module.sortOrder}
                            </td>

                            <td>
                              <span
                                className={
                                  `module-status ${moduleStatus.className}`
                                }
                              >
                                {moduleStatus.label}
                              </span>
                            </td>

                            <td>
                              {formatDateTime(
                                module.createdAt,
                              )}
                            </td>

                            {showActions && (
                              <td>
                                <div className="module-actions">
                                  {canEditModules
                                    && !module.deletedAt
                                    && (
                                      <button
                                        className="module-action-button module-action-edit"
                                        type="button"
                                        disabled={
                                          rowActionRunning
                                        }
                                        onClick={() => {
                                          openEditForm(
                                            module.id,
                                          );
                                        }}
                                      >
                                        Editar
                                      </button>
                                    )}

                                  {canArchiveModules
                                    && !module.deletedAt
                                    && (
                                      <button
                                        className="module-action-button module-action-archive"
                                        type="button"
                                        disabled={
                                          rowActionRunning
                                        }
                                        onClick={() => {
                                          void handleArchive(
                                            module,
                                          );
                                        }}
                                      >
                                        Archivar
                                      </button>
                                    )}

                                  {canArchiveModules
                                    && module.deletedAt
                                    && (
                                      <button
                                        className="module-action-button module-action-restore"
                                        type="button"
                                        disabled={
                                          rowActionRunning
                                        }
                                        onClick={() => {
                                          void handleRestore(
                                            module,
                                          );
                                        }}
                                      >
                                        Restaurar
                                      </button>
                                    )}

                                  {rowActionRunning && (
                                    <span className="module-action-running">
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

                <div className="modules-pagination">
                  <p>
                    {result.pagination.total}
                    {' '}
                    módulo o módulos encontrados
                  </p>

                  <div className="modules-pagination-controls">
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={
                        page <= 1
                        || isLoading
                      }
                      onClick={() => {
                        setPage(
                          (currentPage) =>
                            Math.max(
                              1,
                              currentPage - 1,
                            ),
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
                      disabled={
                        page >= totalPages
                        || isLoading
                      }
                      onClick={() => {
                        setPage(
                          (currentPage) =>
                            currentPage + 1,
                        );
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )
            : (
              <div className="modules-empty">
                <h3>
                  No se han encontrado módulos
                </h3>

                <p>
                  Modifica los filtros o crea un
                  nuevo módulo profesional.
                </p>
              </div>
            )}
      </section>

      {modalIsOpen && (
        <div
          className="modules-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
              && !isSubmitting
            ) {
              closeForm();
            }
          }}
        >
          <section
            className="modules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-modal-title"
          >
            <header className="modules-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create'
                    ? 'Nuevo registro'
                    : 'Edición'}
                </p>

                <h2 id="module-modal-title">
                  {formMode === 'create'
                    ? 'Crear módulo profesional'
                    : 'Editar módulo profesional'}
                </h2>

                <p>
                  Asigna el módulo al ciclo y nivel
                  correctos. El código no puede
                  repetirse dentro del mismo ciclo.
                </p>
              </div>

              <button
                className="modules-modal-close"
                type="button"
                aria-label="Cerrar"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            {isLoadingModule
              ? (
                <div className="modules-modal-loading">
                  <div className="spinner" />

                  <p>
                    Cargando módulo...
                  </p>
                </div>
              )
              : (
                <form
                  className="module-form"
                  onSubmit={(event) => {
                    void handleFormSubmit(
                      event,
                    );
                  }}
                >
                  {formErrorMessage && (
                    <div
                      className="alert alert-error"
                      role="alert"
                    >
                      {formErrorMessage}
                    </div>
                  )}

                  {selectedModule
                    ?.isActive && (
                    <div className="alert alert-information">
                      Si el módulo está activo, el
                      backend no permite cambiar su
                      ciclo o nivel. Desactívalo
                      primero y guarda antes de
                      modificar esa asignación.
                    </div>
                  )}

                  <div className="module-form-grid">
                    <div className="module-form-field">
                      <label htmlFor="module-form-programme">
                        Ciclo formativo
                      </label>

                      <select
                        id="module-form-programme"
                        value={form.vocationalProgrammeId}
                        aria-invalid={
                          Boolean(
                            fieldErrors.vocationalProgrammeId,
                          )
                        }
                        disabled={
                          isSubmitting
                          || isLoadingSelectors
                        }
                        onChange={(event) => {
                          updateTextField(
                            'vocationalProgrammeId',
                            event.target.value,
                          );
                        }}
                      >
                        <option value="">
                          Selecciona ciclo
                        </option>

                        {vocationalProgrammes.map(
                          (programme) => (
                            <option
                              key={programme.id}
                              value={programme.id}
                            >
                              {getProgrammeLabel(
                                programme,
                              )}
                            </option>
                          ),
                        )}
                      </select>

                      {fieldErrors.vocationalProgrammeId && (
                        <span className="module-field-error">
                          {fieldErrors.vocationalProgrammeId}
                        </span>
                      )}
                    </div>

                    <div className="module-form-field">
                      <label htmlFor="module-form-level">
                        Nivel académico
                      </label>

                      <select
                        id="module-form-level"
                        value={form.academicLevelId}
                        aria-invalid={
                          Boolean(
                            fieldErrors.academicLevelId,
                          )
                        }
                        disabled={
                          isSubmitting
                          || isLoadingSelectors
                        }
                        onChange={(event) => {
                          updateTextField(
                            'academicLevelId',
                            event.target.value,
                          );
                        }}
                      >
                        <option value="">
                          Selecciona nivel
                        </option>

                        {academicLevels.map(
                          (level) => (
                            <option
                              key={level.id}
                              value={level.id}
                            >
                              {getLevelLabel(level)}
                            </option>
                          ),
                        )}
                      </select>

                      {fieldErrors.academicLevelId && (
                        <span className="module-field-error">
                          {fieldErrors.academicLevelId}
                        </span>
                      )}
                    </div>

                    <div className="module-form-field">
                      <label htmlFor="module-code">
                        Código oficial
                      </label>

                      <input
                        id="module-code"
                        type="text"
                        value={form.code}
                        placeholder="0483"
                        aria-invalid={
                          Boolean(fieldErrors.code)
                        }
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField(
                            'code',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.code && (
                        <span className="module-field-error">
                          {fieldErrors.code}
                        </span>
                      )}
                    </div>

                    <div className="module-form-field">
                      <label htmlFor="module-acronym">
                        Siglas
                      </label>

                      <input
                        id="module-acronym"
                        type="text"
                        value={form.acronym}
                        placeholder="BD"
                        aria-invalid={
                          Boolean(fieldErrors.acronym)
                        }
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField(
                            'acronym',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.acronym && (
                        <span className="module-field-error">
                          {fieldErrors.acronym}
                        </span>
                      )}
                    </div>

                    <div className="module-form-field module-form-field-wide">
                      <label htmlFor="module-name">
                        Nombre del módulo
                      </label>

                      <input
                        id="module-name"
                        type="text"
                        value={form.name}
                        placeholder="Bases de Datos"
                        aria-invalid={
                          Boolean(fieldErrors.name)
                        }
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField(
                            'name',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.name && (
                        <span className="module-field-error">
                          {fieldErrors.name}
                        </span>
                      )}
                    </div>

                    <div className="module-form-field">
                      <label htmlFor="module-total-hours">
                        Horas totales
                      </label>

                      <input
                        id="module-total-hours"
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        value={form.totalHours}
                        placeholder="192"
                        aria-invalid={
                          Boolean(
                            fieldErrors.totalHours,
                          )
                        }
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField(
                            'totalHours',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.totalHours && (
                        <span className="module-field-error">
                          {fieldErrors.totalHours}
                        </span>
                      )}
                    </div>

                    <div className="module-form-field">
                      <label htmlFor="module-weekly-hours">
                        Horas semanales
                      </label>

                      <input
                        id="module-weekly-hours"
                        type="number"
                        min="0.01"
                        max="99.99"
                        step="0.01"
                        value={form.weeklyHours}
                        placeholder="6"
                        aria-invalid={
                          Boolean(
                            fieldErrors.weeklyHours,
                          )
                        }
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField(
                            'weeklyHours',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.weeklyHours && (
                        <span className="module-field-error">
                          {fieldErrors.weeklyHours}
                        </span>
                      )}
                    </div>

                    <div className="module-form-field">
                      <label htmlFor="module-sort-order">
                        Orden
                      </label>

                      <input
                        id="module-sort-order"
                        type="number"
                        min="0"
                        max="9999"
                        step="1"
                        value={form.sortOrder}
                        aria-invalid={
                          Boolean(
                            fieldErrors.sortOrder,
                          )
                        }
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField(
                            'sortOrder',
                            event.target.value,
                          );
                        }}
                      />

                      <span className="module-field-help">
                        Sirve para ordenar los módulos
                        dentro del ciclo y nivel.
                      </span>

                      {fieldErrors.sortOrder && (
                        <span className="module-field-error">
                          {fieldErrors.sortOrder}
                        </span>
                      )}
                    </div>
                  </div>

                  <label className="module-active-option">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setForm(
                          (currentForm) => ({
                            ...currentForm,
                            isActive:
                              event.target.checked,
                          }),
                        );
                      }}
                    />

                    <span>
                      <strong>
                        Módulo activo
                      </strong>

                      <small>
                        Un módulo inactivo se
                        conserva, pero no debe
                        utilizarse para nuevas
                        asignaciones docentes.
                      </small>
                    </span>
                  </label>

                  <footer className="module-form-actions">
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
                      disabled={
                        isSubmitting
                        || isLoadingModule
                        || isLoadingSelectors
                      }
                    >
                      {isSubmitting
                        ? 'Guardando...'
                        : formMode === 'create'
                          ? 'Crear módulo'
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

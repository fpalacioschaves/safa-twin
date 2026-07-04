import {
  useEffect,
  useMemo,
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
  getAcademicYears,
} from '../services/academic-years.service';

import {
  getCentres,
} from '../services/centres.service';

import {
  archiveEnrolment,
  createEnrolment,
  getEnrolment,
  getEnrolments,
  restoreEnrolment,
  updateEnrolment,
} from '../services/enrolments.service';

import {
  getModules,
} from '../services/modules.service';

import {
  getStudents,
} from '../services/students.service';

import {
  getVocationalProgrammes,
} from '../services/vocational-programmes.service';

import type {
  AcademicLevel,
} from '../types/academic-levels';

import type {
  AcademicYear,
} from '../types/academic-years';

import type {
  Centre,
} from '../types/centres';

import type {
  CreateEnrolmentInput,
  Enrolment,
  EnrolmentStatus,
  EnrolmentStatusFilter,
  ListEnrolmentsResponse,
  UpdateEnrolmentInput,
} from '../types/enrolments';

import type {
  ProfessionalModule,
} from '../types/modules';

import type {
  Student,
} from '../types/students';

import type {
  VocationalProgramme,
} from '../types/vocational-programmes';

import './EnrolmentsPage.css';

const PAGE_SIZE = 10;

const ENROLMENT_STATUS_OPTIONS: {
  value: EnrolmentStatus;
  label: string;
}[] = [
  {
    value: 'ENROLLED',
    label: 'Matriculado',
  },
  {
    value: 'WITHDRAWN',
    label: 'Baja',
  },
  {
    value: 'CONVALIDATED',
    label: 'Convalidado',
  },
  {
    value: 'EXEMPT',
    label: 'Exento',
  },
  {
    value: 'PENDING',
    label: 'Pendiente',
  },
  {
    value: 'COMPLETED',
    label: 'Finalizado',
  },
];

interface EnrolmentsPageProps {
  canCreateEnrolments: boolean;
  canEditEnrolments: boolean;
  canArchiveEnrolments: boolean;
}

interface EnrolmentFormState {
  studentId: string;
  academicYearId: string;
  centreId: string;
  moduleId: string;
  status: EnrolmentStatus;
  enrolledAt: string;
  cancelledAt: string;
  remarks: string;
}

type EnrolmentFormMode =
  | 'create'
  | 'edit';

type FieldErrors = Record<string, string>;

function todayAsInputDate(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function createEmptyForm(): EnrolmentFormState {
  return {
    studentId: '',
    academicYearId: '',
    centreId: '',
    moduleId: '',
    status: 'ENROLLED',
    enrolledAt: todayAsInputDate(),
    cancelledAt: '',
    remarks: '',
  };
}

function isStatusFilter(
  value: string,
): value is EnrolmentStatusFilter {
  return (
    value === 'all'
    || value === 'ENROLLED'
    || value === 'WITHDRAWN'
    || value === 'CONVALIDATED'
    || value === 'EXEMPT'
    || value === 'PENDING'
    || value === 'COMPLETED'
  );
}

function isStatus(
  value: string,
): value is EnrolmentStatus {
  return value !== 'all'
    && isStatusFilter(value);
}

function numberFromSelect(
  value: string,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedValue =
    Number(value);

  return Number.isInteger(parsedValue)
    && parsedValue > 0
    ? parsedValue
    : undefined;
}

function requiredNumberFromSelect(
  value: string,
): number | null {
  return numberFromSelect(value) ?? null;
}

function getStatusLabel(
  status: EnrolmentStatus,
): string {
  return ENROLMENT_STATUS_OPTIONS
    .find((option) => option.value === status)
    ?.label ?? status;
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      dateStyle: 'short',
    },
  ).format(date);
}

function getEnrolmentVisualStatus(
  enrolment: Enrolment,
): {
  label: string;
  className: string;
} {
  if (enrolment.deletedAt) {
    return {
      label: 'Archivada',
      className: 'enrolment-status-archived',
    };
  }

  return {
    label: getStatusLabel(enrolment.status),
    className:
      `enrolment-status-${enrolment.status.toLowerCase()}`,
  };
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

function validateForm(
  form: EnrolmentFormState,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!requiredNumberFromSelect(form.studentId)) {
    errors.studentId =
      'Selecciona un alumno.';
  }

  if (!requiredNumberFromSelect(form.academicYearId)) {
    errors.academicYearId =
      'Selecciona un curso académico.';
  }

  if (!requiredNumberFromSelect(form.centreId)) {
    errors.centreId =
      'Selecciona un centro.';
  }

  if (!requiredNumberFromSelect(form.moduleId)) {
    errors.moduleId =
      'Selecciona un módulo.';
  }

  if (!isStatus(form.status)) {
    errors.status =
      'Selecciona un estado válido.';
  }

  if (!form.enrolledAt) {
    errors.enrolledAt =
      'Indica la fecha de matrícula.';
  }

  if (
    form.cancelledAt
    && form.cancelledAt < form.enrolledAt
  ) {
    errors.cancelledAt =
      'La fecha de baja no puede ser anterior a la matrícula.';
  }

  if (form.remarks.trim().length > 5000) {
    errors.remarks =
      'Las observaciones no pueden superar los 5000 caracteres.';
  }

  return errors;
}

function buildPayload(
  form: EnrolmentFormState,
): CreateEnrolmentInput | UpdateEnrolmentInput {
  const studentId =
    requiredNumberFromSelect(form.studentId);

  const academicYearId =
    requiredNumberFromSelect(form.academicYearId);

  const centreId =
    requiredNumberFromSelect(form.centreId);

  const moduleId =
    requiredNumberFromSelect(form.moduleId);

  if (
    studentId === null
    || academicYearId === null
    || centreId === null
    || moduleId === null
  ) {
    throw new Error(
      'La matrícula no tiene todos los identificadores requeridos.',
    );
  }

  const payload:
    CreateEnrolmentInput = {
      studentId,
      academicYearId,
      centreId,
      moduleId,
      status: form.status,
      enrolledAt: form.enrolledAt,
    };

  if (
    form.status === 'WITHDRAWN'
    && form.cancelledAt
  ) {
    payload.cancelledAt =
      form.cancelledAt;
  }

  if (form.remarks.trim()) {
    payload.remarks =
      form.remarks.trim();
  }

  return payload;
}

export function EnrolmentsPage({
  canCreateEnrolments,
  canEditEnrolments,
  canArchiveEnrolments,
}: EnrolmentsPageProps) {
  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState<EnrolmentStatusFilter>('all');

  const [
    academicYearId,
    setAcademicYearId,
  ] = useState('');

  const [centreId, setCentreId] =
    useState('');

  const [
    vocationalProgrammeId,
    setVocationalProgrammeId,
  ] = useState('');

  const [
    academicLevelId,
    setAcademicLevelId,
  ] = useState('');

  const [moduleId, setModuleId] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState<ListEnrolmentsResponse | null>(null);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [academicYears, setAcademicYears] =
    useState<AcademicYear[]>([]);

  const [centres, setCentres] =
    useState<Centre[]>([]);

  const [programmes, setProgrammes] =
    useState<VocationalProgramme[]>([]);

  const [levels, setLevels] =
    useState<AcademicLevel[]>([]);

  const [modules, setModules] =
    useState<ProfessionalModule[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    selectorsAreLoading,
    setSelectorsAreLoading,
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
    useState<EnrolmentFormMode | null>(null);

  const [
    selectedEnrolmentId,
    setSelectedEnrolmentId,
  ] = useState<number | null>(null);

  const [form, setForm] =
    useState<EnrolmentFormState>(
      createEmptyForm,
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
    isLoadingEnrolment,
    setIsLoadingEnrolment,
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
    canEditEnrolments
    || canArchiveEnrolments;

  const filteredModulesForForm =
    useMemo(
      () => modules,
      [modules],
    );

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadSelectors():
    Promise<void> {
      setSelectorsAreLoading(true);

      try {
        const [
          studentsResult,
          academicYearsResult,
          centresResult,
          programmesResult,
          levelsResult,
          modulesResult,
        ] = await Promise.all([
          getStudents({
            page: 1,
            pageSize: 50,
            status: 'active',
            documentType: 'all',
          }),
          getAcademicYears({
            page: 1,
            pageSize: 50,
            status: 'active',
            current: 'all',
          }),
          getCentres({
            page: 1,
            pageSize: 50,
            status: 'active',
          }),
          getVocationalProgrammes({
            page: 1,
            pageSize: 50,
            status: 'active',
            type: 'all',
          }),
          getAcademicLevels({
            page: 1,
            pageSize: 50,
            status: 'active',
          }),
          getModules({
            page: 1,
            pageSize: 50,
            status: 'active',
          }),
        ]);

        if (requestWasCancelled) {
          return;
        }

        setStudents(studentsResult.items);
        setAcademicYears(academicYearsResult.items);
        setCentres(centresResult.items);
        setProgrammes(programmesResult.items);
        setLevels(levelsResult.items);
        setModules(modulesResult.items);
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se han podido cargar los datos auxiliares de matrícula.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setSelectorsAreLoading(false);
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

    async function loadEnrolments():
    Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const enrolmentsResult =
          await getEnrolments({
            search: search || undefined,
            page,
            pageSize: PAGE_SIZE,
            status,

            academicYearId:
              numberFromSelect(
                academicYearId,
              ),

            centreId:
              numberFromSelect(
                centreId,
              ),

            vocationalProgrammeId:
              numberFromSelect(
                vocationalProgrammeId,
              ),

            academicLevelId:
              numberFromSelect(
                academicLevelId,
              ),

            moduleId:
              numberFromSelect(
                moduleId,
              ),
          });

        if (!requestWasCancelled) {
          setResult(enrolmentsResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de matrículas.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEnrolments();

    return () => {
      requestWasCancelled = true;
    };
  }, [
    academicLevelId,
    academicYearId,
    centreId,
    moduleId,
    page,
    refreshVersion,
    search,
    status,
    vocationalProgrammeId,
  ]);

  useEffect(() => {
    if (
      result
      && result.pagination.totalPages > 0
      && page > result.pagination.totalPages
    ) {
      setPage(result.pagination.totalPages);
    }
  }, [
    page,
    result,
  ]);

  useEffect(() => {
    const enrolmentId =
      selectedEnrolmentId;

    if (
      formMode !== 'edit'
      || typeof enrolmentId !== 'number'
    ) {
      return;
    }

    let requestWasCancelled = false;

    async function loadEnrolment(
      id: number,
    ): Promise<void> {
      setIsLoadingEnrolment(true);
      setFormErrorMessage(null);

      try {
        const response =
          await getEnrolment(id);

        if (requestWasCancelled) {
          return;
        }

        setForm({
          studentId:
            response.enrolment.studentId.toString(),

          academicYearId:
            response.enrolment.academicYearId.toString(),

          centreId:
            response.enrolment.centreId.toString(),

          moduleId:
            response.enrolment.moduleId.toString(),

          status:
            response.enrolment.status,

          enrolledAt:
            response.enrolment.enrolledAt,

          cancelledAt:
            response.enrolment.cancelledAt ?? '',

          remarks:
            response.enrolment.remarks ?? '',
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(error.message);
        } else {
          setFormErrorMessage(
            'No se han podido cargar los datos de la matrícula.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingEnrolment(false);
        }
      }
    }

    void loadEnrolment(enrolmentId);

    return () => {
      requestWasCancelled = true;
    };
  }, [
    formMode,
    selectedEnrolmentId,
  ]);

  function resetPageAndSet(
    setter: (value: string) => void,
    value: string,
  ): void {
    setter(value);
    setPage(1);
  }

  function openCreateForm(): void {
    setFormMode('create');
    setSelectedEnrolmentId(null);
    setForm(createEmptyForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function openEditForm(
    enrolmentId: number,
  ): void {
    setFormMode('edit');
    setSelectedEnrolmentId(enrolmentId);
    setForm(createEmptyForm());
    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function closeForm(): void {
    setFormMode(null);
    setSelectedEnrolmentId(null);
    setForm(createEmptyForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingEnrolment(false);
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
    setAcademicYearId('');
    setCentreId('');
    setVocationalProgrammeId('');
    setAcademicLevelId('');
    setModuleId('');
    setPage(1);
  }

  function updateFormField(
    field: keyof EnrolmentFormState,
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
      validateForm(form);

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setFieldErrors(validationErrors);
      setFormErrorMessage(
        'Revisa los campos señalados.',
      );
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      const input =
        buildPayload(form);

      const response =
        formMode === 'create'
          ? await createEnrolment(input)
          : await updateEnrolment(
              selectedEnrolmentId as number,
              input,
            );

      setSuccessMessage(response.message);
      closeForm();
      setRefreshVersion(
        (version) => version + 1,
      );

      if (formMode === 'create') {
        setPage(1);
      }
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
        setFieldErrors(
          getApiFieldErrors(error),
        );
      } else {
        setFormErrorMessage(
          'No se ha podido guardar la matrícula.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(
    enrolment: Enrolment,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar la matrícula de ${enrolment.student.fullName} en ${enrolment.module.code}?`,
    );

    if (!confirmed) {
      return;
    }

    setActionKey(`archive-${enrolment.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await archiveEnrolment(enrolment.id);

      setSuccessMessage(response.message);
      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido archivar la matrícula.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleRestore(
    enrolment: Enrolment,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar la matrícula de ${enrolment.student.fullName} en ${enrolment.module.code}?`,
    );

    if (!confirmed) {
      return;
    }

    setActionKey(`restore-${enrolment.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await restoreEnrolment(enrolment.id);

      setSuccessMessage(response.message);
      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido restaurar la matrícula.',
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
    <main className="enrolments-page">
      <section className="enrolments-header">
        <div>
          <p className="eyebrow">
            Gestión académica
          </p>

          <h2>Matrículas modulares</h2>

          <p>
            Matricula alumnos en módulos concretos
            por curso académico y centro. El ciclo
            y el nivel se obtienen del módulo.
          </p>
        </div>

        {canCreateEnrolments && (
          <button
            className="button button-primary"
            type="button"
            disabled={selectorsAreLoading}
            onClick={openCreateForm}
          >
            Nueva matrícula
          </button>
        )}
      </section>

      <section className="enrolments-panel">
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
          className="enrolments-filters"
          onSubmit={handleSearchSubmit}
        >
          <div className="enrolments-filter-field enrolments-filter-field-wide">
            <label htmlFor="enrolment-search">
              Buscar
            </label>

            <input
              id="enrolment-search"
              type="search"
              value={searchInput}
              placeholder="Alumno, documento, módulo, curso..."
              onChange={(event) => {
                setSearchInput(
                  event.target.value,
                );
              }}
            />
          </div>

          <div className="enrolments-filter-field">
            <label htmlFor="enrolment-status">
              Estado
            </label>

            <select
              id="enrolment-status"
              value={status}
              onChange={(event) => {
                if (
                  isStatusFilter(
                    event.target.value,
                  )
                ) {
                  setStatus(event.target.value);
                  setPage(1);
                }
              }}
            >
              <option value="all">
                Todos
              </option>

              {ENROLMENT_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="enrolments-filter-field">
            <label htmlFor="filter-academic-year">
              Curso
            </label>

            <select
              id="filter-academic-year"
              value={academicYearId}
              onChange={(event) => {
                resetPageAndSet(
                  setAcademicYearId,
                  event.target.value,
                );
              }}
            >
              <option value="">
                Todos
              </option>

              {academicYears.map((year) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          <div className="enrolments-filter-field">
            <label htmlFor="filter-centre">
              Centro
            </label>

            <select
              id="filter-centre"
              value={centreId}
              onChange={(event) => {
                resetPageAndSet(
                  setCentreId,
                  event.target.value,
                );
              }}
            >
              <option value="">
                Todos
              </option>

              {centres.map((centre) => (
                <option
                  key={centre.id}
                  value={centre.id}
                >
                  {centre.shortName || centre.name}
                </option>
              ))}
            </select>
          </div>

          <div className="enrolments-filter-field">
            <label htmlFor="filter-programme">
              Ciclo
            </label>

            <select
              id="filter-programme"
              value={vocationalProgrammeId}
              onChange={(event) => {
                resetPageAndSet(
                  setVocationalProgrammeId,
                  event.target.value,
                );
              }}
            >
              <option value="">
                Todos
              </option>

              {programmes.map((programme) => (
                <option
                  key={programme.id}
                  value={programme.id}
                >
                  {programme.acronym}
                </option>
              ))}
            </select>
          </div>

          <div className="enrolments-filter-field">
            <label htmlFor="filter-level">
              Nivel
            </label>

            <select
              id="filter-level"
              value={academicLevelId}
              onChange={(event) => {
                resetPageAndSet(
                  setAcademicLevelId,
                  event.target.value,
                );
              }}
            >
              <option value="">
                Todos
              </option>

              {levels.map((level) => (
                <option
                  key={level.id}
                  value={level.id}
                >
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          <div className="enrolments-filter-field">
            <label htmlFor="filter-module">
              Módulo
            </label>

            <select
              id="filter-module"
              value={moduleId}
              onChange={(event) => {
                resetPageAndSet(
                  setModuleId,
                  event.target.value,
                );
              }}
            >
              <option value="">
                Todos
              </option>

              {modules.map((module) => (
                <option
                  key={module.id}
                  value={module.id}
                >
                  {module.code} · {module.name}
                </option>
              ))}
            </select>
          </div>

          <div className="enrolments-filter-actions">
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
            <div className="enrolments-loading">
              <div className="spinner" />

              <p>
                Cargando matrículas...
              </p>
            </div>
          )
          : result
            && result.items.length > 0
            ? (
              <>
                <div className="enrolments-table-wrapper">
                  <table className="enrolments-table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Módulo</th>
                        <th>Curso y centro</th>
                        <th>Estado</th>
                        <th>Fechas</th>

                        {showActions && (
                          <th>Acciones</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {result.items.map((enrolment) => {
                        const visualStatus =
                          getEnrolmentVisualStatus(
                            enrolment,
                          );

                        const actionIsRunning =
                          actionKey?.endsWith(
                            `-${enrolment.id}`,
                          ) ?? false;

                        return (
                          <tr key={enrolment.id}>
                            <td>
                              <div className="enrolment-main-cell">
                                <strong>
                                  {enrolment.student.fullName}
                                </strong>

                                <span>
                                  {enrolment.student.studentCode
                                    || enrolment.student.documentNumber
                                    || `ID ${enrolment.student.id}`}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="enrolment-main-cell">
                                <strong>
                                  {enrolment.module.code}
                                  {' · '}
                                  {enrolment.module.name}
                                </strong>

                                <span>
                                  {enrolment.module.vocationalProgramme.acronym}
                                  {' · '}
                                  {enrolment.module.academicLevel.name}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="enrolment-main-cell">
                                <strong>
                                  {enrolment.academicYear.name}
                                </strong>

                                <span>
                                  {enrolment.centre.shortName
                                    || enrolment.centre.name}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span
                                className={
                                  `enrolment-status ${visualStatus.className}`
                                }
                              >
                                {visualStatus.label}
                              </span>
                            </td>

                            <td>
                              <div className="enrolment-main-cell">
                                <span>
                                  Matrícula:
                                  {' '}
                                  {formatDate(
                                    enrolment.enrolledAt,
                                  )}
                                </span>

                                <span>
                                  Baja:
                                  {' '}
                                  {formatDate(
                                    enrolment.cancelledAt,
                                  )}
                                </span>
                              </div>
                            </td>

                            {showActions && (
                              <td>
                                <div className="enrolment-actions">
                                  {canEditEnrolments
                                    && !enrolment.deletedAt
                                    && (
                                      <button
                                        className="enrolment-action-button enrolment-action-edit"
                                        type="button"
                                        disabled={actionIsRunning}
                                        onClick={() => {
                                          openEditForm(
                                            enrolment.id,
                                          );
                                        }}
                                      >
                                        Editar
                                      </button>
                                    )}

                                  {canArchiveEnrolments
                                    && !enrolment.deletedAt
                                    && (
                                      <button
                                        className="enrolment-action-button enrolment-action-archive"
                                        type="button"
                                        disabled={actionIsRunning}
                                        onClick={() => {
                                          void handleArchive(
                                            enrolment,
                                          );
                                        }}
                                      >
                                        Archivar
                                      </button>
                                    )}

                                  {canArchiveEnrolments
                                    && enrolment.deletedAt
                                    && (
                                      <button
                                        className="enrolment-action-button enrolment-action-restore"
                                        type="button"
                                        disabled={actionIsRunning}
                                        onClick={() => {
                                          void handleRestore(
                                            enrolment,
                                          );
                                        }}
                                      >
                                        Restaurar
                                      </button>
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

                <div className="enrolments-pagination">
                  <p>
                    {result.pagination.total}
                    {' '}
                    matrícula o matrículas encontradas
                  </p>

                  <div className="enrolments-pagination-controls">
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
              <div className="enrolments-empty">
                <h3>
                  No hay matrículas registradas
                </h3>

                <p>
                  Crea matrículas seleccionando alumno,
                  curso académico, centro y módulo.
                </p>
              </div>
            )}
      </section>

      {modalIsOpen && (
        <div
          className="enrolments-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
              && !isSubmitting
            ) {
              closeForm();
            }
          }}
        >
          <section
            className="enrolments-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrolment-modal-title"
          >
            <header className="enrolments-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create'
                    ? 'Nueva matrícula'
                    : 'Edición'}
                </p>

                <h2 id="enrolment-modal-title">
                  {formMode === 'create'
                    ? 'Crear matrícula modular'
                    : 'Editar matrícula modular'}
                </h2>

                <p>
                  No se asigna grupo. Se matricula
                  al alumno en un módulo concreto.
                </p>
              </div>

              <button
                className="enrolments-modal-close"
                type="button"
                aria-label="Cerrar"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            {isLoadingEnrolment
              ? (
                <div className="enrolments-loading">
                  <div className="spinner" />

                  <p>
                    Cargando matrícula...
                  </p>
                </div>
              )
              : (
                <form
                  className="enrolment-form"
                  onSubmit={(event) => {
                    void handleFormSubmit(event);
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

                  <div className="enrolment-form-grid">
                    <div className="enrolment-form-field enrolment-form-field-wide">
                      <label htmlFor="enrolment-student">
                        Alumno
                      </label>

                      <select
                        id="enrolment-student"
                        value={form.studentId}
                        disabled={isSubmitting}
                        aria-invalid={
                          Boolean(fieldErrors.studentId)
                        }
                        onChange={(event) => {
                          updateFormField(
                            'studentId',
                            event.target.value,
                          );
                        }}
                      >
                        <option value="">
                          Selecciona un alumno
                        </option>

                        {students.map((student) => (
                          <option
                            key={student.id}
                            value={student.id}
                          >
                            {student.fullName}
                            {student.studentCode
                              ? ` · ${student.studentCode}`
                              : ''}
                          </option>
                        ))}
                      </select>

                      {fieldErrors.studentId && (
                        <span className="enrolment-field-error">
                          {fieldErrors.studentId}
                        </span>
                      )}
                    </div>

                    <div className="enrolment-form-field">
                      <label htmlFor="enrolment-year">
                        Curso académico
                      </label>

                      <select
                        id="enrolment-year"
                        value={form.academicYearId}
                        disabled={isSubmitting}
                        aria-invalid={
                          Boolean(fieldErrors.academicYearId)
                        }
                        onChange={(event) => {
                          updateFormField(
                            'academicYearId',
                            event.target.value,
                          );
                        }}
                      >
                        <option value="">
                          Selecciona un curso
                        </option>

                        {academicYears.map((year) => (
                          <option
                            key={year.id}
                            value={year.id}
                          >
                            {year.name}
                          </option>
                        ))}
                      </select>

                      {fieldErrors.academicYearId && (
                        <span className="enrolment-field-error">
                          {fieldErrors.academicYearId}
                        </span>
                      )}
                    </div>

                    <div className="enrolment-form-field">
                      <label htmlFor="enrolment-centre">
                        Centro
                      </label>

                      <select
                        id="enrolment-centre"
                        value={form.centreId}
                        disabled={isSubmitting}
                        aria-invalid={
                          Boolean(fieldErrors.centreId)
                        }
                        onChange={(event) => {
                          updateFormField(
                            'centreId',
                            event.target.value,
                          );
                        }}
                      >
                        <option value="">
                          Selecciona un centro
                        </option>

                        {centres.map((centre) => (
                          <option
                            key={centre.id}
                            value={centre.id}
                          >
                            {centre.shortName || centre.name}
                          </option>
                        ))}
                      </select>

                      {fieldErrors.centreId && (
                        <span className="enrolment-field-error">
                          {fieldErrors.centreId}
                        </span>
                      )}
                    </div>

                    <div className="enrolment-form-field enrolment-form-field-wide">
                      <label htmlFor="enrolment-module">
                        Módulo
                      </label>

                      <select
                        id="enrolment-module"
                        value={form.moduleId}
                        disabled={isSubmitting}
                        aria-invalid={
                          Boolean(fieldErrors.moduleId)
                        }
                        onChange={(event) => {
                          updateFormField(
                            'moduleId',
                            event.target.value,
                          );
                        }}
                      >
                        <option value="">
                          Selecciona un módulo
                        </option>

                        {filteredModulesForForm.map((module) => (
                          <option
                            key={module.id}
                            value={module.id}
                          >
                            {module.code}
                            {' · '}
                            {module.name}
                            {' · '}
                            {module.vocationalProgramme.acronym}
                            {' · '}
                            {module.academicLevel.name}
                          </option>
                        ))}
                      </select>

                      <span className="enrolment-field-help">
                        El ciclo y el nivel pertenecen
                        al módulo seleccionado.
                      </span>

                      {fieldErrors.moduleId && (
                        <span className="enrolment-field-error">
                          {fieldErrors.moduleId}
                        </span>
                      )}
                    </div>

                    <div className="enrolment-form-field">
                      <label htmlFor="enrolment-status-modal">
                        Estado
                      </label>

                      <select
                        id="enrolment-status-modal"
                        value={form.status}
                        disabled={isSubmitting}
                        aria-invalid={
                          Boolean(fieldErrors.status)
                        }
                        onChange={(event) => {
                          if (
                            isStatus(event.target.value)
                          ) {
                            updateFormField(
                              'status',
                              event.target.value,
                            );
                          }
                        }}
                      >
                        {ENROLMENT_STATUS_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ),
                        )}
                      </select>

                      {fieldErrors.status && (
                        <span className="enrolment-field-error">
                          {fieldErrors.status}
                        </span>
                      )}
                    </div>

                    <div className="enrolment-form-field">
                      <label htmlFor="enrolment-enrolled-at">
                        Fecha de matrícula
                      </label>

                      <input
                        id="enrolment-enrolled-at"
                        type="date"
                        value={form.enrolledAt}
                        disabled={isSubmitting}
                        aria-invalid={
                          Boolean(fieldErrors.enrolledAt)
                        }
                        onChange={(event) => {
                          updateFormField(
                            'enrolledAt',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.enrolledAt && (
                        <span className="enrolment-field-error">
                          {fieldErrors.enrolledAt}
                        </span>
                      )}
                    </div>

                    <div className="enrolment-form-field">
                      <label htmlFor="enrolment-cancelled-at">
                        Fecha de baja
                      </label>

                      <input
                        id="enrolment-cancelled-at"
                        type="date"
                        value={form.cancelledAt}
                        disabled={
                          isSubmitting
                          || form.status !== 'WITHDRAWN'
                        }
                        aria-invalid={
                          Boolean(fieldErrors.cancelledAt)
                        }
                        onChange={(event) => {
                          updateFormField(
                            'cancelledAt',
                            event.target.value,
                          );
                        }}
                      />

                      <span className="enrolment-field-help">
                        Solo se usa cuando el estado
                        es baja.
                      </span>

                      {fieldErrors.cancelledAt && (
                        <span className="enrolment-field-error">
                          {fieldErrors.cancelledAt}
                        </span>
                      )}
                    </div>

                    <div className="enrolment-form-field enrolment-form-field-wide">
                      <label htmlFor="enrolment-remarks">
                        Observaciones
                      </label>

                      <textarea
                        id="enrolment-remarks"
                        value={form.remarks}
                        disabled={isSubmitting}
                        aria-invalid={
                          Boolean(fieldErrors.remarks)
                        }
                        onChange={(event) => {
                          updateFormField(
                            'remarks',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.remarks && (
                        <span className="enrolment-field-error">
                          {fieldErrors.remarks}
                        </span>
                      )}
                    </div>
                  </div>

                  <footer className="enrolment-form-actions">
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
                        || isLoadingEnrolment
                      }
                    >
                      {isSubmitting
                        ? 'Guardando...'
                        : formMode === 'create'
                          ? 'Crear matrícula'
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

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  getEnrolments,
} from '../services/enrolments.service';

import {
  archiveIncident,
  createIncident,
  getIncident,
  getIncidents,
  getIncidentsSummary,
  updateIncident,
} from '../services/incidents.service';

import {
  getStudents,
} from '../services/students.service';

import type {
  Enrolment,
} from '../types/enrolments';

import type {
  CreateIncidentInput,
  Incident,
  IncidentResolutionFilter,
  IncidentSeverity,
  IncidentSeverityFilter,
  IncidentsSummaryResponse,
  IncidentType,
  IncidentTypeFilter,
  ListIncidentsResponse,
  UpdateIncidentInput,
} from '../types/incidents';

import type {
  Student,
} from '../types/students';

import './IncidentsPage.css';

const PAGE_SIZE = 10;
const SELECTOR_PAGE_SIZE = 100;

const INCIDENT_TYPE_OPTIONS: {
  value: IncidentType;
  label: string;
}[] = [
  { value: 'ACADEMIC', label: 'Académica' },
  { value: 'BEHAVIOUR', label: 'Comportamiento' },
  { value: 'DISCIPLINARY', label: 'Disciplinaria' },
  { value: 'TECHNICAL', label: 'Técnica' },
  { value: 'COMPANY_RELATED', label: 'Relacionada con empresa' },
  { value: 'OTHER', label: 'Otra' },
];

const INCIDENT_SEVERITY_OPTIONS: {
  value: IncidentSeverity;
  label: string;
}[] = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
];

interface IncidentsPageProps {
  canManageIncidents: boolean;
}

interface IncidentFormState {
  studentId: string;
  enrolmentId: string;
  isModuleSpecific: boolean;
  type: IncidentType;
  severity: IncidentSeverity;
  occurredAt: string;
  title: string;
  description: string;
  resolution: string;
  resolvedAt: string;
}

type IncidentFormMode =
  | 'create'
  | 'edit';

type FieldErrors = Record<string, string>;

type IncidentTextField =
  | 'studentId'
  | 'enrolmentId'
  | 'occurredAt'
  | 'title'
  | 'description'
  | 'resolution'
  | 'resolvedAt';

function getCurrentLocalDateTime(): string {
  return toLocalDateTimeInputValue(
    new Date().toISOString(),
  );
}

function createEmptyIncidentForm(): IncidentFormState {
  return {
    studentId: '',
    enrolmentId: '',
    isModuleSpecific: true,
    type: 'ACADEMIC',
    severity: 'MEDIUM',
    occurredAt: getCurrentLocalDateTime(),
    title: '',
    description: '',
    resolution: '',
    resolvedAt: '',
  };
}

function isIncidentTypeFilter(
  value: string,
): value is IncidentTypeFilter {
  return [
    'all',
    'ACADEMIC',
    'BEHAVIOUR',
    'DISCIPLINARY',
    'TECHNICAL',
    'COMPANY_RELATED',
    'OTHER',
  ].includes(value);
}

function isIncidentSeverityFilter(
  value: string,
): value is IncidentSeverityFilter {
  return [
    'all',
    'LOW',
    'MEDIUM',
    'HIGH',
  ].includes(value);
}

function isIncidentResolutionFilter(
  value: string,
): value is IncidentResolutionFilter {
  return [
    'all',
    'resolved',
    'unresolved',
  ].includes(value);
}

function isIncidentType(
  value: string,
): value is IncidentType {
  return INCIDENT_TYPE_OPTIONS.some(
    (item) => item.value === value,
  );
}

function isIncidentSeverity(
  value: string,
): value is IncidentSeverity {
  return INCIDENT_SEVERITY_OPTIONS.some(
    (item) => item.value === value,
  );
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

function parsePositiveId(
  value: string,
): number | null {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
}

function toIsoFromLocalDateTime(
  value: string,
): string {
  return new Date(value).toISOString();
}

function toLocalDateTimeInputValue(
  value: string | null,
): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );

  return offsetDate
    .toISOString()
    .slice(0, 16);
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return 'Sin fecha';
  }

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

function getIncidentTypeLabel(
  value: IncidentType,
): string {
  return INCIDENT_TYPE_OPTIONS.find(
    (item) => item.value === value,
  )?.label ?? value;
}

function getIncidentSeverityLabel(
  value: IncidentSeverity,
): string {
  return INCIDENT_SEVERITY_OPTIONS.find(
    (item) => item.value === value,
  )?.label ?? value;
}

function getSeverityClassName(
  severity: IncidentSeverity,
): string {
  if (severity === 'HIGH') {
    return 'incident-severity-high';
  }

  if (severity === 'MEDIUM') {
    return 'incident-severity-medium';
  }

  return 'incident-severity-low';
}

function getStudentOptionLabel(
  student: Student,
): string {
  const code = student.studentCode
    ? ` · ${student.studentCode}`
    : '';

  const email = student.email
    ? ` · ${student.email}`
    : '';

  return `${student.fullName}${code}${email}`;
}

function getEnrolmentOptionLabel(
  enrolment: Enrolment,
): string {
  const programme = enrolment.module.vocationalProgramme.acronym
    ?? enrolment.module.vocationalProgramme.code;

  const level = `${enrolment.module.academicLevel.number}º`;

  return [
    enrolment.academicYear.name,
    enrolment.centre.name,
    `${programme} ${level}`,
    `${enrolment.module.code} · ${enrolment.module.name}`,
  ].join(' · ');
}

function validateIncidentForm(
  form: IncidentFormState,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!parsePositiveId(form.studentId)) {
    errors.studentId =
      'Selecciona un alumno.';
  }

  if (!parsePositiveId(form.enrolmentId)) {
    errors.enrolmentId =
      'Selecciona una matrícula activa del alumno.';
  }

  if (!form.occurredAt) {
    errors.occurredAt =
      'La fecha de la incidencia es obligatoria.';
  }

  if (form.title.trim().length < 3) {
    errors.title =
      'El título debe tener al menos 3 caracteres.';
  }

  if (form.description.trim().length < 3) {
    errors.description =
      'La descripción debe tener al menos 3 caracteres.';
  }

  if (
    form.resolvedAt
    && !form.resolution.trim()
  ) {
    errors.resolution =
      'Indica una resolución si marcas la incidencia como resuelta.';
  }

  return errors;
}

function createIncidentPayload(
  form: IncidentFormState,
  enrolments: Enrolment[],
): CreateIncidentInput | UpdateIncidentInput {
  const studentId = parsePositiveId(form.studentId);
  const enrolmentId = parsePositiveId(form.enrolmentId);

  if (!studentId || !enrolmentId) {
    throw new Error(
      'Selecciona un alumno y una matrícula activa.',
    );
  }

  const selectedEnrolment = enrolments.find(
    (enrolment) => enrolment.id === enrolmentId,
  );

  if (!selectedEnrolment) {
    throw new Error(
      'La matrícula seleccionada ya no está disponible. Vuelve a cargar las matrículas del alumno.',
    );
  }

  const payload: CreateIncidentInput = {
    studentId,
    academicYearId: selectedEnrolment.academicYearId,
    centreId: selectedEnrolment.centreId,
    moduleId: form.isModuleSpecific
      ? selectedEnrolment.moduleId
      : null,
    type: form.type,
    severity: form.severity,
    occurredAt: toIsoFromLocalDateTime(
      form.occurredAt,
    ),
    title: form.title.trim(),
    description: form.description.trim(),
    resolution: form.resolution.trim() || null,
  };

  if (form.resolvedAt) {
    payload.resolvedAt = toIsoFromLocalDateTime(
      form.resolvedAt,
    );
  }

  return payload;
}

function findMatchingEnrolment(
  incident: Incident,
  enrolments: Enrolment[],
): Enrolment | null {
  if (incident.module) {
    return enrolments.find(
      (enrolment) => (
        enrolment.academicYearId === incident.academicYear.id
        && enrolment.centreId === incident.centre.id
        && enrolment.moduleId === incident.module?.id
      ),
    ) ?? null;
  }

  return enrolments.find(
    (enrolment) => (
      enrolment.academicYearId === incident.academicYear.id
      && enrolment.centreId === incident.centre.id
    ),
  ) ?? null;
}

function getFormFromIncident(
  incident: Incident,
  enrolments: Enrolment[],
): IncidentFormState {
  const matchingEnrolment = findMatchingEnrolment(
    incident,
    enrolments,
  );

  return {
    studentId: incident.student.id.toString(),
    enrolmentId: matchingEnrolment?.id.toString() ?? '',
    isModuleSpecific: incident.module !== null,
    type: incident.type,
    severity: incident.severity,
    occurredAt: toLocalDateTimeInputValue(
      incident.occurredAt,
    ),
    title: incident.title,
    description: incident.description,
    resolution: incident.resolution ?? '',
    resolvedAt: toLocalDateTimeInputValue(
      incident.resolvedAt,
    ),
  };
}

function getSummaryValue(
  summary: IncidentsSummaryResponse | null,
  key: keyof IncidentsSummaryResponse['totals'],
): number {
  return summary?.totals[key] ?? 0;
}

export function IncidentsPage({
  canManageIncidents,
}: IncidentsPageProps) {
  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [type, setType] =
    useState<IncidentTypeFilter>('all');

  const [severity, setSeverity] =
    useState<IncidentSeverityFilter>('all');

  const [resolution, setResolution] =
    useState<IncidentResolutionFilter>('all');

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState<ListIncidentsResponse | null>(null);

  const [summary, setSummary] =
    useState<IncidentsSummaryResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const [formMode, setFormMode] =
    useState<IncidentFormMode | null>(null);

  const [selectedIncidentId, setSelectedIncidentId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<IncidentFormState>(
      createEmptyIncidentForm,
    );

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [formErrorMessage, setFormErrorMessage] =
    useState<string | null>(null);

  const [isLoadingIncident, setIsLoadingIncident] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [actionKey, setActionKey] =
    useState<string | null>(null);

  const [studentSearchInput, setStudentSearchInput] =
    useState('');

  const [studentOptions, setStudentOptions] =
    useState<Student[]>([]);

  const [selectedStudentLabel, setSelectedStudentLabel] =
    useState<string | null>(null);

  const [enrolmentOptions, setEnrolmentOptions] =
    useState<Enrolment[]>([]);

  const [isLoadingStudents, setIsLoadingStudents] =
    useState(false);

  const [isLoadingEnrolments, setIsLoadingEnrolments] =
    useState(false);

  const modalIsOpen = formMode !== null;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadIncidents(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const parameters = {
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
          type,
          severity,
          resolution,
        };

        const [incidentsResult, summaryResult] =
          await Promise.all([
            getIncidents(parameters),
            getIncidentsSummary({
              type,
              severity,
              resolution,
            }),
          ]);

        if (!requestWasCancelled) {
          setResult(incidentsResult);
          setSummary(summaryResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de incidencias.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadIncidents();

    return () => {
      requestWasCancelled = true;
    };
  }, [
    page,
    refreshVersion,
    resolution,
    search,
    severity,
    type,
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

  function resetMessages(): void {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormErrorMessage(null);
    setFieldErrors({});
  }

  async function loadStudentOptions(
    searchText: string,
  ): Promise<void> {
    setIsLoadingStudents(true);

    try {
      const response = await getStudents({
        search: searchText.trim() || undefined,
        page: 1,
        pageSize: SELECTOR_PAGE_SIZE,
        status: 'active',
        documentType: 'all',
      });

      setStudentOptions(response.items);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
      } else {
        setFormErrorMessage(
          'No se ha podido cargar el selector de alumnado.',
        );
      }
    } finally {
      setIsLoadingStudents(false);
    }
  }

  async function loadEnrolmentsForStudent(
    studentId: number,
  ): Promise<Enrolment[]> {
    setIsLoadingEnrolments(true);

    try {
      const response = await getEnrolments({
        search: undefined,
        page: 1,
        pageSize: SELECTOR_PAGE_SIZE,
        status: 'ENROLLED',
        studentId,
      });

      setEnrolmentOptions(response.items);
      return response.items;
    } catch (error: unknown) {
      setEnrolmentOptions([]);

      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
      } else {
        setFormErrorMessage(
          'No se han podido cargar las matrículas activas del alumno.',
        );
      }

      return [];
    } finally {
      setIsLoadingEnrolments(false);
    }
  }

  async function openCreateModal(): Promise<void> {
    resetMessages();
    setSelectedIncidentId(null);
    setSelectedStudentLabel(null);
    setStudentSearchInput('');
    setStudentOptions([]);
    setEnrolmentOptions([]);
    setForm(createEmptyIncidentForm());
    setFormMode('create');
    await loadStudentOptions('');
  }

  async function openEditModal(
    incidentId: number,
  ): Promise<void> {
    resetMessages();
    setSelectedIncidentId(incidentId);
    setFormMode('edit');
    setIsLoadingIncident(true);
    setStudentOptions([]);
    setEnrolmentOptions([]);

    try {
      const response = await getIncident(incidentId);
      const incident = response.incident;

      setSelectedStudentLabel(incident.student.fullName);
      setStudentSearchInput(incident.student.fullName);

      const [studentsResponse, enrolments] = await Promise.all([
        getStudents({
          search: incident.student.fullName,
          page: 1,
          pageSize: SELECTOR_PAGE_SIZE,
          status: 'active',
          documentType: 'all',
        }),
        loadEnrolmentsForStudent(incident.student.id),
      ]);

      const students = studentsResponse.items.some(
        (student) => student.id === incident.student.id,
      )
        ? studentsResponse.items
        : [
            {
              id: incident.student.id,
              studentCode: incident.student.code,
              firstName: incident.student.fullName,
              lastName1: '',
              lastName2: null,
              fullName: incident.student.fullName,
              documentType: null,
              documentNumber: null,
              email: null,
              phone: null,
              birthDate: null,
              address: null,
              postalCode: null,
              city: null,
              province: null,
              emergencyContactName: null,
              emergencyContactPhone: null,
              notes: null,
              isActive: true,
              createdAt: incident.createdAt,
              updatedAt: incident.updatedAt,
              deletedAt: null,
            },
            ...studentsResponse.items,
          ];

      setStudentOptions(students);
      setForm(getFormFromIncident(incident, enrolments));
    } catch (error: unknown) {
      setFormMode(null);

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido cargar la incidencia seleccionada.',
        );
      }
    } finally {
      setIsLoadingIncident(false);
    }
  }

  function closeModal(): void {
    if (isSubmitting) {
      return;
    }

    setFormMode(null);
    setSelectedIncidentId(null);
    setForm(createEmptyIncidentForm());
    setStudentSearchInput('');
    setStudentOptions([]);
    setSelectedStudentLabel(null);
    setEnrolmentOptions([]);
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
    setType('all');
    setSeverity('all');
    setResolution('all');
    setPage(1);
  }

  function updateTextField(
    field: IncidentTextField,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleStudentChange(
    value: string,
  ): Promise<void> {
    updateTextField('studentId', value);
    setForm((currentForm) => ({
      ...currentForm,
      studentId: value,
      enrolmentId: '',
    }));
    setEnrolmentOptions([]);

    const studentId = parsePositiveId(value);

    if (!studentId) {
      setSelectedStudentLabel(null);
      return;
    }

    const selectedStudent = studentOptions.find(
      (student) => student.id === studentId,
    );

    setSelectedStudentLabel(
      selectedStudent?.fullName ?? null,
    );

    const enrolments = await loadEnrolmentsForStudent(studentId);

    if (enrolments.length === 1) {
      setForm((currentForm) => ({
        ...currentForm,
        enrolmentId: enrolments[0].id.toString(),
      }));
    }
  }

  function handleTypeChange(value: string): void {
    if (isIncidentType(value)) {
      setForm((currentForm) => ({
        ...currentForm,
        type: value,
      }));
    }
  }

  function handleSeverityChange(value: string): void {
    if (isIncidentSeverity(value)) {
      setForm((currentForm) => ({
        ...currentForm,
        severity: value,
      }));
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationErrors = validateIncidentForm(form);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrorMessage(
        'Revisa los campos marcados antes de guardar.',
      );
      return;
    }

    setIsSubmitting(true);
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = createIncidentPayload(
        form,
        enrolmentOptions,
      );

      if (formMode === 'create') {
        await createIncident(payload);
        setSuccessMessage(
          'Incidencia creada correctamente.',
        );
      } else if (
        formMode === 'edit'
        && selectedIncidentId !== null
      ) {
        await updateIncident(
          selectedIncidentId,
          payload,
        );
        setSuccessMessage(
          'Incidencia actualizada correctamente.',
        );
      }

      closeModal();
      setRefreshVersion((value) => value + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(error.message);
        setFieldErrors(getApiFieldErrors(error));
      } else if (error instanceof Error) {
        setFormErrorMessage(error.message);
      } else {
        setFormErrorMessage(
          'No se ha podido guardar la incidencia.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(
    incident: Incident,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Archivar la incidencia "${incident.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionKey(`archive-${incident.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await archiveIncident(incident.id);
      setSuccessMessage(
        'Incidencia archivada correctamente.',
      );
      setRefreshVersion((value) => value + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido archivar la incidencia.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  const incidents = result?.items ?? [];
  const pagination = result?.pagination;

  return (
    <main className="dashboard-content incidents-page">
      <section className="incidents-header">
        <div>
          <p className="eyebrow">Seguimiento online</p>
          <h2>Incidencias académicas</h2>
          <p>
            Registra incidencias académicas, técnicas, disciplinarias o de
            seguimiento, sin mezclar este módulo con asistencia presencial.
          </p>
        </div>

        {canManageIncidents && (
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void openCreateModal();
            }}
          >
            Nueva incidencia
          </button>
        )}
      </section>

      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      <section className="incidents-summary-grid">
        <article className="incidents-summary-card">
          <span>Total</span>
          <strong>
            {getSummaryValue(summary, 'totalIncidents')}
          </strong>
        </article>
        <article className="incidents-summary-card">
          <span>Graves</span>
          <strong>
            {getSummaryValue(summary, 'highIncidents')}
          </strong>
        </article>
        <article className="incidents-summary-card">
          <span>Sin resolver</span>
          <strong>
            {getSummaryValue(summary, 'unresolvedIncidents')}
          </strong>
        </article>
        <article className="incidents-summary-card">
          <span>Técnicas</span>
          <strong>
            {getSummaryValue(summary, 'technicalIncidents')}
          </strong>
        </article>
      </section>

      <section className="incidents-panel">
        <form
          className="incidents-filters"
          onSubmit={handleSearchSubmit}
        >
          <div className="incidents-filter-field">
            <label htmlFor="incidents-search">
              Buscar
            </label>
            <input
              id="incidents-search"
              type="search"
              placeholder="Alumno, módulo, título o descripción"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
            />
          </div>

          <div className="incidents-filter-field">
            <label htmlFor="incidents-type">
              Tipo
            </label>
            <select
              id="incidents-type"
              value={type}
              onChange={(event) => {
                if (isIncidentTypeFilter(event.target.value)) {
                  setType(event.target.value);
                  setPage(1);
                }
              }}
            >
              <option value="all">Todos</option>
              {INCIDENT_TYPE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="incidents-filter-field">
            <label htmlFor="incidents-severity">
              Gravedad
            </label>
            <select
              id="incidents-severity"
              value={severity}
              onChange={(event) => {
                if (isIncidentSeverityFilter(event.target.value)) {
                  setSeverity(event.target.value);
                  setPage(1);
                }
              }}
            >
              <option value="all">Todas</option>
              {INCIDENT_SEVERITY_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="incidents-filter-field">
            <label htmlFor="incidents-resolution">
              Estado
            </label>
            <select
              id="incidents-resolution"
              value={resolution}
              onChange={(event) => {
                if (isIncidentResolutionFilter(event.target.value)) {
                  setResolution(event.target.value);
                  setPage(1);
                }
              }}
            >
              <option value="all">Todas</option>
              <option value="unresolved">Sin resolver</option>
              <option value="resolved">Resueltas</option>
            </select>
          </div>

          <div className="incidents-filter-actions">
            <button
              className="button button-primary"
              type="submit"
            >
              Filtrar
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
          <div className="incidents-loading">
            Cargando incidencias...
          </div>
        ) : incidents.length === 0 ? (
          <div className="incidents-empty">
            <strong>No hay incidencias con los filtros actuales.</strong>
            <span>
              Crea una incidencia o cambia los filtros de búsqueda.
            </span>
          </div>
        ) : (
          <div className="incidents-table-wrapper">
            <table className="incidents-table">
              <thead>
                <tr>
                  <th>Incidencia</th>
                  <th>Alumno</th>
                  <th>Ámbito</th>
                  <th>Gravedad</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  {canManageIncidents && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <div className="incident-main">
                        <strong>{incident.title}</strong>
                        <span>
                          {getIncidentTypeLabel(incident.type)}
                        </span>
                        <p>{incident.description}</p>
                      </div>
                    </td>
                    <td>
                      <div className="incident-student">
                        <strong>{incident.student.fullName}</strong>
                        <span>
                          {incident.student.code
                            ? `Código ${incident.student.code}`
                            : `ID ${incident.student.id}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="incident-scope">
                        <strong>
                          {incident.module
                            ? incident.module.name
                            : 'General del alumno'}
                        </strong>
                        <span>
                          {incident.vocationalProgramme?.acronym
                            ? `${incident.vocationalProgramme.acronym} · ${incident.academicLevel?.number ?? '-'}º`
                            : 'Sin módulo asociado'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`incident-severity ${getSeverityClassName(incident.severity)}`}
                      >
                        {getIncidentSeverityLabel(incident.severity)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          incident.resolvedAt
                            ? 'incident-status incident-status-resolved'
                            : 'incident-status incident-status-open'
                        }
                      >
                        {incident.resolvedAt
                          ? 'Resuelta'
                          : 'Abierta'}
                      </span>
                      {incident.resolution && (
                        <p className="incident-resolution-note">
                          {incident.resolution}
                        </p>
                      )}
                    </td>
                    <td>{formatDateTime(incident.occurredAt)}</td>
                    {canManageIncidents && (
                      <td>
                        <div className="incident-actions">
                          <button
                            className="incident-action-button incident-action-edit"
                            type="button"
                            disabled={actionKey !== null}
                            onClick={() => {
                              void openEditModal(incident.id);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="incident-action-button incident-action-archive"
                            type="button"
                            disabled={actionKey !== null}
                            onClick={() => {
                              void handleArchive(incident);
                            }}
                          >
                            Archivar
                          </button>
                          {actionKey === `archive-${incident.id}` && (
                            <span className="incident-action-running">
                              Archivando...
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 0 && (
          <div className="incidents-pagination">
            <span>
              Página {pagination.page} de {pagination.totalPages}. Total: {pagination.total}
            </span>
            <div className="incidents-pagination-controls">
              <button
                className="button button-secondary"
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => {
                  setPage((currentPage) => currentPage - 1);
                }}
              >
                Anterior
              </button>
              <button
                className="button button-secondary"
                type="button"
                disabled={
                  page >= pagination.totalPages
                  || isLoading
                }
                onClick={() => {
                  setPage((currentPage) => currentPage + 1);
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      {modalIsOpen && (
        <div
          className="incidents-modal-backdrop"
          role="presentation"
        >
          <section
            className="incidents-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-modal-title"
          >
            <header className="incidents-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create'
                    ? 'Nueva incidencia'
                    : 'Editar incidencia'}
                </p>
                <h2 id="incident-modal-title">
                  {formMode === 'create'
                    ? 'Registrar incidencia académica'
                    : 'Modificar incidencia académica'}
                </h2>
              </div>

              <button
                className="button button-secondary"
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cerrar
              </button>
            </header>

            {isLoadingIncident ? (
              <div className="incidents-modal-loading">
                Cargando incidencia...
              </div>
            ) : (
              <form
                className="incident-form"
                onSubmit={(event) => {
                  void handleSubmit(event);
                }}
              >
                {formErrorMessage && (
                  <div className="alert alert-error">
                    {formErrorMessage}
                  </div>
                )}

                <div className="incident-form-note">
                  <strong>Ámbito de la incidencia:</strong> selecciona primero
                  el alumno y después una matrícula activa. Si la incidencia es
                  general del alumno, se conserva curso y centro, pero no se
                  asocia a un módulo concreto.
                </div>

                <div className="incident-student-search">
                  <div className="incident-form-field">
                    <label htmlFor="incident-student-search">
                      Buscar alumno
                    </label>
                    <input
                      id="incident-student-search"
                      type="search"
                      placeholder="Nombre, apellidos, código o correo"
                      value={studentSearchInput}
                      onChange={(event) => {
                        setStudentSearchInput(event.target.value);
                      }}
                    />
                  </div>

                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={isLoadingStudents}
                    onClick={() => {
                      void loadStudentOptions(studentSearchInput);
                    }}
                  >
                    {isLoadingStudents
                      ? 'Buscando...'
                      : 'Buscar alumno'}
                  </button>
                </div>

                <div className="incident-form-grid incident-form-grid-two">
                  <div className="incident-form-field">
                    <label htmlFor="incident-student-id">
                      Alumno
                    </label>
                    <select
                      id="incident-student-id"
                      value={form.studentId}
                      disabled={isLoadingStudents}
                      onChange={(event) => {
                        void handleStudentChange(event.target.value);
                      }}
                    >
                      <option value="">
                        Selecciona un alumno
                      </option>
                      {selectedStudentLabel
                        && form.studentId
                        && !studentOptions.some(
                          (student) => student.id.toString() === form.studentId,
                        ) && (
                          <option value={form.studentId}>
                            {selectedStudentLabel}
                          </option>
                        )}
                      {studentOptions.map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {getStudentOptionLabel(student)}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.studentId && (
                      <span className="field-error">
                        {fieldErrors.studentId}
                      </span>
                    )}
                  </div>

                  <div className="incident-form-field">
                    <label htmlFor="incident-enrolment-id">
                      Matrícula activa
                    </label>
                    <select
                      id="incident-enrolment-id"
                      value={form.enrolmentId}
                      disabled={
                        !form.studentId
                        || isLoadingEnrolments
                      }
                      onChange={(event) => {
                        updateTextField(
                          'enrolmentId',
                          event.target.value,
                        );
                      }}
                    >
                      <option value="">
                        {isLoadingEnrolments
                          ? 'Cargando matrículas...'
                          : 'Selecciona una matrícula'}
                      </option>
                      {enrolmentOptions.map((enrolment) => (
                        <option
                          key={enrolment.id}
                          value={enrolment.id}
                        >
                          {getEnrolmentOptionLabel(enrolment)}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.enrolmentId && (
                      <span className="field-error">
                        {fieldErrors.enrolmentId}
                      </span>
                    )}
                    {form.studentId
                      && !isLoadingEnrolments
                      && enrolmentOptions.length === 0 && (
                        <span className="field-help">
                          El alumno seleccionado no tiene matrículas activas.
                        </span>
                      )}
                  </div>
                </div>

                <label className="incident-form-checkbox">
                  <input
                    type="checkbox"
                    checked={!form.isModuleSpecific}
                    onChange={(event) => {
                      setForm((currentForm) => ({
                        ...currentForm,
                        isModuleSpecific: !event.target.checked,
                      }));
                    }}
                  />
                  <span>
                    Registrar como incidencia general del alumno, sin módulo concreto.
                  </span>
                </label>

                <div className="incident-form-grid">
                  <div className="incident-form-field">
                    <label htmlFor="incident-type">
                      Tipo
                    </label>
                    <select
                      id="incident-type"
                      value={form.type}
                      onChange={(event) => {
                        handleTypeChange(event.target.value);
                      }}
                    >
                      {INCIDENT_TYPE_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="incident-form-field">
                    <label htmlFor="incident-severity-form">
                      Gravedad
                    </label>
                    <select
                      id="incident-severity-form"
                      value={form.severity}
                      onChange={(event) => {
                        handleSeverityChange(event.target.value);
                      }}
                    >
                      {INCIDENT_SEVERITY_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="incident-form-field">
                    <label htmlFor="incident-occurred-at">
                      Fecha y hora
                    </label>
                    <input
                      id="incident-occurred-at"
                      type="datetime-local"
                      value={form.occurredAt}
                      onChange={(event) => {
                        updateTextField(
                          'occurredAt',
                          event.target.value,
                        );
                      }}
                    />
                    {fieldErrors.occurredAt && (
                      <span className="field-error">
                        {fieldErrors.occurredAt}
                      </span>
                    )}
                  </div>

                  <div className="incident-form-field">
                    <label htmlFor="incident-resolved-at">
                      Fecha de resolución
                    </label>
                    <input
                      id="incident-resolved-at"
                      type="datetime-local"
                      value={form.resolvedAt}
                      onChange={(event) => {
                        updateTextField(
                          'resolvedAt',
                          event.target.value,
                        );
                      }}
                    />
                    {fieldErrors.resolvedAt && (
                      <span className="field-error">
                        {fieldErrors.resolvedAt}
                      </span>
                    )}
                  </div>
                </div>

                <div className="incident-form-field">
                  <label htmlFor="incident-title">
                    Título
                  </label>
                  <input
                    id="incident-title"
                    type="text"
                    value={form.title}
                    onChange={(event) => {
                      updateTextField(
                        'title',
                        event.target.value,
                      );
                    }}
                  />
                  {fieldErrors.title && (
                    <span className="field-error">
                      {fieldErrors.title}
                    </span>
                  )}
                </div>

                <div className="incident-form-field">
                  <label htmlFor="incident-description">
                    Descripción
                  </label>
                  <textarea
                    id="incident-description"
                    value={form.description}
                    onChange={(event) => {
                      updateTextField(
                        'description',
                        event.target.value,
                      );
                    }}
                  />
                  {fieldErrors.description && (
                    <span className="field-error">
                      {fieldErrors.description}
                    </span>
                  )}
                </div>

                <div className="incident-form-field">
                  <label htmlFor="incident-resolution-text">
                    Resolución
                  </label>
                  <textarea
                    id="incident-resolution-text"
                    value={form.resolution}
                    onChange={(event) => {
                      updateTextField(
                        'resolution',
                        event.target.value,
                      );
                    }}
                  />
                  {fieldErrors.resolution && (
                    <span className="field-error">
                      {fieldErrors.resolution}
                    </span>
                  )}
                </div>

                <div className="incident-form-actions">
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Guardando...'
                      : 'Guardar incidencia'}
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

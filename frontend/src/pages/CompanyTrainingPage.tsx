import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  getAcademicYears,
} from '../services/academic-years.service';
import {
  ApiError,
} from '../services/api.service';
import {
  getCentres,
} from '../services/centres.service';
import {
  archiveCompany,
  archiveCompanyTutor,
  archiveWorkPlacement,
  createCompany,
  createCompanyTutor,
  createWorkPlacement,
  getCompanies,
  getCompanyTrainingSummary,
  getCompanyTutors,
  getWorkPlacements,
  restoreCompany,
  updateCompany,
  updateCompanyTutor,
  updateWorkPlacement,
} from '../services/company-training.service';
import {
  getStudents,
} from '../services/students.service';
import {
  getUsers,
} from '../services/users.service';
import {
  CompanyTrainingMonitoringPanel,
} from './CompanyTrainingMonitoringPanel';

import type {
  AcademicYear,
} from '../types/academic-years';
import type {
  Centre,
} from '../types/centres';
import type {
  Company,
  CompanyTrainingSummary,
  CompanyTutor,
  CreateCompanyInput,
  CreateCompanyTutorInput,
  CreateWorkPlacementInput,
  RecordStatusFilter,
  UpdateCompanyInput,
  UpdateCompanyTutorInput,
  UpdateWorkPlacementInput,
  WorkPlacement,
  WorkPlacementStatus,
  WorkPlacementStatusFilter,
} from '../types/company-training';
import type {
  Student,
} from '../types/students';
import type {
  UserListItem,
} from '../types/users';

import './CompanyTrainingPage.css';

const PAGE_SIZE = 10;
const CATALOGUE_PAGE_SIZE = 50;

const EMPTY_SUMMARY: CompanyTrainingSummary = {
  companiesCount: 0,
  activeCompanyTutorsCount: 0,
  activePlacementsCount: 0,
  placementsWithPendingDocumentationCount: 0,
  openIncidentsCount: 0,
  followupsCount: 0,
  placementsByStatus: {
    PENDING: 0,
    ASSIGNED: 0,
    ACTIVE: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  },
};

const WORK_PLACEMENT_STATUS_OPTIONS: {
  value: WorkPlacementStatus;
  label: string;
}[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'ASSIGNED', label: 'Asignada' },
  { value: 'ACTIVE', label: 'En curso' },
  { value: 'COMPLETED', label: 'Finalizada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

type ActiveTab =
  | 'companies'
  | 'placements'
  | 'monitoring';

type FormMode =
  | 'create'
  | 'edit';

interface CompanyTrainingPageProps {
  canManageCompanies: boolean;
  canManageTutors: boolean;
  canManagePlacements: boolean;
  canManageFollowups?: boolean;
  canManageIncidents?: boolean;
}

interface CompanyFormState {
  name: string;
  taxIdentifier: string;
  sector: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  isActive: boolean;
}

interface CompanyTutorFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  notes: string;
  isActive: boolean;
}

interface WorkPlacementFormState {
  studentId: string;
  academicYearId: string;
  centreId: string;
  companyId: string;
  companyTutorId: string;
  academicTutorUserId: string;
  status: WorkPlacementStatus;
  startsAt: string;
  endsAt: string;
  schedule: string;
  totalHours: string;
  completedHours: string;
  activities: string;
  learningOutcomes: string;
  finalEvaluation: string;
  documentationPending: boolean;
  remarks: string;
}

function createEmptyCompanyForm(): CompanyFormState {
  return {
    name: '',
    taxIdentifier: '',
    sector: '',
    address: '',
    postalCode: '',
    city: '',
    province: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    isActive: true,
  };
}

function createEmptyCompanyTutorForm(): CompanyTutorFormState {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    notes: '',
    isActive: true,
  };
}

function createEmptyWorkPlacementForm(): WorkPlacementFormState {
  return {
    studentId: '',
    academicYearId: '',
    centreId: '',
    companyId: '',
    companyTutorId: '',
    academicTutorUserId: '',
    status: 'PENDING',
    startsAt: '',
    endsAt: '',
    schedule: '',
    totalHours: '',
    completedHours: '',
    activities: '',
    learningOutcomes: '',
    finalEvaluation: '',
    documentationPending: false,
    remarks: '',
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Se ha producido un error inesperado.';
}

function optionalString(
  value: string,
): string | undefined {
  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function optionalNumber(
  value: string,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue)
    ? undefined
    : parsedValue;
}

function requiredNumber(
  value: string,
  fieldName: string,
): number {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return parsedValue;
}

function formatNullable(
  value: string | number | null,
): string {
  if (value === null || value === '') {
    return 'No indicado';
  }

  return String(value);
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-ES').format(
    new Date(`${value}T00:00:00`),
  );
}

function getStatusLabel(
  status: WorkPlacementStatus,
): string {
  return WORK_PLACEMENT_STATUS_OPTIONS.find(
    (option) => option.value === status,
  )?.label ?? status;
}

function companyToForm(
  company: Company,
): CompanyFormState {
  return {
    name: company.name,
    taxIdentifier: company.taxIdentifier ?? '',
    sector: company.sector ?? '',
    address: company.address ?? '',
    postalCode: company.postalCode ?? '',
    city: company.city ?? '',
    province: company.province ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
    website: company.website ?? '',
    notes: company.notes ?? '',
    isActive: company.isActive,
  };
}

function companyTutorToForm(
  companyTutor: CompanyTutor,
): CompanyTutorFormState {
  return {
    firstName: companyTutor.firstName,
    lastName: companyTutor.lastName ?? '',
    email: companyTutor.email ?? '',
    phone: companyTutor.phone ?? '',
    position: companyTutor.position ?? '',
    notes: companyTutor.notes ?? '',
    isActive: companyTutor.isActive,
  };
}

function workPlacementToForm(
  workPlacement: WorkPlacement,
): WorkPlacementFormState {
  return {
    studentId: workPlacement.studentId.toString(),
    academicYearId: workPlacement.academicYearId.toString(),
    centreId: workPlacement.centreId.toString(),
    companyId: workPlacement.companyId.toString(),
    companyTutorId: workPlacement.companyTutorId?.toString() ?? '',
    academicTutorUserId:
      workPlacement.academicTutorUserId?.toString() ?? '',
    status: workPlacement.status,
    startsAt: workPlacement.startsAt ?? '',
    endsAt: workPlacement.endsAt ?? '',
    schedule: workPlacement.schedule ?? '',
    totalHours: workPlacement.totalHours?.toString() ?? '',
    completedHours: workPlacement.completedHours?.toString() ?? '',
    activities: workPlacement.activities ?? '',
    learningOutcomes: workPlacement.learningOutcomes ?? '',
    finalEvaluation: workPlacement.finalEvaluation ?? '',
    documentationPending: workPlacement.documentationPending,
    remarks: workPlacement.remarks ?? '',
  };
}

function buildCompanyInput(
  form: CompanyFormState,
): CreateCompanyInput | UpdateCompanyInput {
  if (form.name.trim().length < 2) {
    throw new Error(
      'El nombre de la empresa debe tener al menos 2 caracteres.',
    );
  }

  return {
    name: form.name.trim(),
    taxIdentifier: optionalString(form.taxIdentifier),
    sector: optionalString(form.sector),
    address: optionalString(form.address),
    postalCode: optionalString(form.postalCode),
    city: optionalString(form.city),
    province: optionalString(form.province),
    phone: optionalString(form.phone),
    email: optionalString(form.email),
    website: optionalString(form.website),
    notes: optionalString(form.notes),
    isActive: form.isActive,
  };
}

function buildCompanyTutorInput(
  form: CompanyTutorFormState,
): CreateCompanyTutorInput | UpdateCompanyTutorInput {
  if (form.firstName.trim().length < 2) {
    throw new Error(
      'El nombre del tutor laboral debe tener al menos 2 caracteres.',
    );
  }

  return {
    firstName: form.firstName.trim(),
    lastName: optionalString(form.lastName),
    email: optionalString(form.email),
    phone: optionalString(form.phone),
    position: optionalString(form.position),
    notes: optionalString(form.notes),
    isActive: form.isActive,
  };
}

function buildWorkPlacementInput(
  form: WorkPlacementFormState,
): CreateWorkPlacementInput | UpdateWorkPlacementInput {
  return {
    studentId: requiredNumber(form.studentId, 'El alumno'),
    academicYearId: requiredNumber(form.academicYearId, 'El curso académico'),
    centreId: requiredNumber(form.centreId, 'El centro'),
    companyId: requiredNumber(form.companyId, 'La empresa'),
    companyTutorId: optionalNumber(form.companyTutorId),
    academicTutorUserId: optionalNumber(form.academicTutorUserId),
    status: form.status,
    startsAt: optionalString(form.startsAt),
    endsAt: optionalString(form.endsAt),
    schedule: optionalString(form.schedule),
    totalHours: optionalNumber(form.totalHours),
    completedHours: optionalNumber(form.completedHours),
    activities: optionalString(form.activities),
    learningOutcomes: optionalString(form.learningOutcomes),
    finalEvaluation: optionalString(form.finalEvaluation),
    documentationPending: form.documentationPending,
    remarks: optionalString(form.remarks),
  };
}

export function CompanyTrainingPage({
  canManageCompanies,
  canManageTutors,
  canManagePlacements,
  canManageFollowups = false,
  canManageIncidents = false,
}: CompanyTrainingPageProps) {
  const [activeTab, setActiveTab] =
    useState<ActiveTab>('companies');

  const [summary, setSummary] =
    useState<CompanyTrainingSummary>(EMPTY_SUMMARY);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [companyStatus, setCompanyStatus] =
    useState<RecordStatusFilter>('active');

  const [companySearch, setCompanySearch] =
    useState('');

  const [selectedCompanyId, setSelectedCompanyId] =
    useState<number | null>(null);

  const [companyTutors, setCompanyTutors] =
    useState<CompanyTutor[]>([]);

  const [workPlacements, setWorkPlacements] =
    useState<WorkPlacement[]>([]);

  const [placementStatus, setPlacementStatus] =
    useState<WorkPlacementStatusFilter>('all');

  const [placementSearch, setPlacementSearch] =
    useState('');

  const [students, setStudents] =
    useState<Student[]>([]);

  const [academicYears, setAcademicYears] =
    useState<AcademicYear[]>([]);

  const [centres, setCentres] =
    useState<Centre[]>([]);

  const [users, setUsers] =
    useState<UserListItem[]>([]);

  const [companyForm, setCompanyForm] =
    useState<CompanyFormState>(createEmptyCompanyForm);

  const [companyFormMode, setCompanyFormMode] =
    useState<FormMode>('create');

  const [editingCompanyId, setEditingCompanyId] =
    useState<number | null>(null);

  const [companyTutorForm, setCompanyTutorForm] =
    useState<CompanyTutorFormState>(createEmptyCompanyTutorForm);

  const [companyTutorFormMode, setCompanyTutorFormMode] =
    useState<FormMode>('create');

  const [editingCompanyTutorId, setEditingCompanyTutorId] =
    useState<number | null>(null);

  const [workPlacementForm, setWorkPlacementForm] =
    useState<WorkPlacementFormState>(createEmptyWorkPlacementForm);

  const [workPlacementFormMode, setWorkPlacementFormMode] =
    useState<FormMode>('create');

  const [editingWorkPlacementId, setEditingWorkPlacementId] =
    useState<number | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function loadSummary(): Promise<void> {
    const result = await getCompanyTrainingSummary();
    setSummary(result.summary);
  }

  async function loadCompanies(): Promise<void> {
    const result = await getCompanies({
      page: 1,
      pageSize: CATALOGUE_PAGE_SIZE,
      status: companyStatus,
      search: companySearch,
    });

    setCompanies(result.items);

    if (
      selectedCompanyId !== null
      && !result.items.some(
        (company) => company.id === selectedCompanyId,
      )
    ) {
      setSelectedCompanyId(null);
      setCompanyTutors([]);
    }
  }

  async function loadCompanyTutors(
    companyId: number,
  ): Promise<void> {
    const result = await getCompanyTutors(companyId, {
      status: 'active',
    });

    setCompanyTutors(result.items);
  }

  async function loadWorkPlacements(): Promise<void> {
    const result = await getWorkPlacements({
      page: 1,
      pageSize: PAGE_SIZE,
      recordStatus: 'active',
      status: placementStatus,
      search: placementSearch,
    });

    setWorkPlacements(result.items);
  }

  async function loadCatalogues(): Promise<void> {
    const [
      studentsResult,
      academicYearsResult,
      centresResult,
      usersResult,
    ] = await Promise.all([
      getStudents({
        page: 1,
        pageSize: CATALOGUE_PAGE_SIZE,
        status: 'active',
        documentType: 'all',
      }),
      getAcademicYears({
        page: 1,
        pageSize: CATALOGUE_PAGE_SIZE,
        status: 'active',
        current: 'all',
      }),
      getCentres({
        page: 1,
        pageSize: CATALOGUE_PAGE_SIZE,
        status: 'active',
      }),
      getUsers({
        page: 1,
        pageSize: CATALOGUE_PAGE_SIZE,
        status: 'active',
      }),
    ]);

    setStudents(studentsResult.items);
    setAcademicYears(academicYearsResult.items);
    setCentres(centresResult.items);
    setUsers(usersResult.items);
  }

  async function refreshPage(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadSummary(),
        loadCompanies(),
        loadWorkPlacements(),
        loadCatalogues(),
      ]);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshPage();
  }, []);

  useEffect(() => {
    void loadCompanies().catch((loadError: unknown) => {
      setError(getErrorMessage(loadError));
    });
  }, [companyStatus]);

  useEffect(() => {
    void loadWorkPlacements().catch((loadError: unknown) => {
      setError(getErrorMessage(loadError));
    });
  }, [placementStatus]);

  async function handleSelectCompany(
    companyId: number,
  ): Promise<void> {
    setSelectedCompanyId(companyId);
    setCompanyTutorForm(createEmptyCompanyTutorForm());
    setCompanyTutorFormMode('create');
    setEditingCompanyTutorId(null);
    await loadCompanyTutors(companyId);
  }

  async function handleSubmitCompany(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const input = buildCompanyInput(companyForm);
      const result =
        companyFormMode === 'create'
          ? await createCompany(input)
          : await updateCompany(
              requiredNumber(
                editingCompanyId?.toString() ?? '',
                'La empresa',
              ),
              input,
            );

      setMessage(result.message);
      setCompanyForm(createEmptyCompanyForm());
      setCompanyFormMode('create');
      setEditingCompanyId(null);
      await Promise.all([
        loadSummary(),
        loadCompanies(),
      ]);
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitCompanyTutor(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (selectedCompanyId === null) {
      setError('Selecciona primero una empresa para gestionar sus tutores.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const input = buildCompanyTutorInput(companyTutorForm);
      const result =
        companyTutorFormMode === 'create'
          ? await createCompanyTutor(selectedCompanyId, input)
          : await updateCompanyTutor(
              requiredNumber(
                editingCompanyTutorId?.toString() ?? '',
                'El tutor laboral',
              ),
              input,
            );

      setMessage(result.message);
      setCompanyTutorForm(createEmptyCompanyTutorForm());
      setCompanyTutorFormMode('create');
      setEditingCompanyTutorId(null);
      await Promise.all([
        loadSummary(),
        loadCompanyTutors(selectedCompanyId),
      ]);
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitWorkPlacement(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const input = buildWorkPlacementInput(workPlacementForm);
      const result =
        workPlacementFormMode === 'create'
          ? await createWorkPlacement(input)
          : await updateWorkPlacement(
              requiredNumber(
                editingWorkPlacementId?.toString() ?? '',
                'La estancia formativa',
              ),
              input,
            );

      setMessage(result.message);
      setWorkPlacementForm(createEmptyWorkPlacementForm());
      setWorkPlacementFormMode('create');
      setEditingWorkPlacementId(null);
      await Promise.all([
        loadSummary(),
        loadWorkPlacements(),
      ]);
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveCompany(
    company: Company,
  ): Promise<void> {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = company.deletedAt
        ? await restoreCompany(company.id)
        : await archiveCompany(company.id);

      setMessage(result.message);
      await Promise.all([
        loadSummary(),
        loadCompanies(),
      ]);
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveCompanyTutor(
    companyTutor: CompanyTutor,
  ): Promise<void> {
    if (selectedCompanyId === null) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await archiveCompanyTutor(companyTutor.id);
      setMessage(result.message);
      await Promise.all([
        loadSummary(),
        loadCompanyTutors(selectedCompanyId),
      ]);
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveWorkPlacement(
    workPlacement: WorkPlacement,
  ): Promise<void> {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await archiveWorkPlacement(workPlacement.id);
      setMessage(result.message);
      await Promise.all([
        loadSummary(),
        loadWorkPlacements(),
      ]);
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditCompany(company: Company): void {
    setCompanyForm(companyToForm(company));
    setCompanyFormMode('edit');
    setEditingCompanyId(company.id);
  }

  function handleEditCompanyTutor(
    companyTutor: CompanyTutor,
  ): void {
    setCompanyTutorForm(companyTutorToForm(companyTutor));
    setCompanyTutorFormMode('edit');
    setEditingCompanyTutorId(companyTutor.id);
  }

  async function handleEditWorkPlacement(
    workPlacement: WorkPlacement,
  ): Promise<void> {
    setWorkPlacementForm(workPlacementToForm(workPlacement));
    setWorkPlacementFormMode('edit');
    setEditingWorkPlacementId(workPlacement.id);
    await loadCompanyTutors(workPlacement.companyId);
    setActiveTab('placements');
  }

  const selectedCompany = companies.find(
    (company) => company.id === selectedCompanyId,
  );

  return (
    <main className="dashboard-content company-training-page">
      <section className="company-training-hero">
        <div>
          <p className="eyebrow">Formación en empresa</p>
          <h2>Empresas, tutores y estancias formativas</h2>
          <p>
            Gestiona empresas colaboradoras, tutores laborales y periodos
            de formación del alumnado con datos reales de la aplicación.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={isLoading}
          onClick={() => {
            void refreshPage();
          }}
        >
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </section>

      {error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="alert alert-success">
          {message}
        </div>
      ) : null}

      <section className="company-training-summary-grid">
        <article>
          <span>{summary.companiesCount}</span>
          <strong>Empresas</strong>
        </article>
        <article>
          <span>{summary.activeCompanyTutorsCount}</span>
          <strong>Tutores activos</strong>
        </article>
        <article>
          <span>{summary.activePlacementsCount}</span>
          <strong>Estancias activas</strong>
        </article>
        <article>
          <span>{summary.placementsWithPendingDocumentationCount}</span>
          <strong>Documentación pendiente</strong>
        </article>
        <article>
          <span>{summary.followupsCount ?? 0}</span>
          <strong>Seguimientos</strong>
        </article>
        <article>
          <span>{summary.openIncidentsCount ?? 0}</span>
          <strong>Incidencias abiertas</strong>
        </article>
      </section>

      <section className="company-training-status-grid">
        {WORK_PLACEMENT_STATUS_OPTIONS.map((status) => (
          <article key={status.value}>
            <strong>{status.label}</strong>
            <span>{summary.placementsByStatus[status.value]}</span>
          </article>
        ))}
      </section>

      <nav
        className="company-training-tabs"
        aria-label="Secciones de formación en empresa"
      >
        <button
          className={
            activeTab === 'companies'
              ? 'company-training-tab company-training-tab-active'
              : 'company-training-tab'
          }
          type="button"
          onClick={() => {
            setActiveTab('companies');
          }}
        >
          Empresas y tutores
        </button>
        <button
          className={
            activeTab === 'placements'
              ? 'company-training-tab company-training-tab-active'
              : 'company-training-tab'
          }
          type="button"
          onClick={() => {
            setActiveTab('placements');
          }}
        >
          Estancias formativas
        </button>
        <button
          className={
            activeTab === 'monitoring'
              ? 'company-training-tab company-training-tab-active'
              : 'company-training-tab'
          }
          type="button"
          onClick={() => {
            setActiveTab('monitoring');
          }}
        >
          Seguimientos e incidencias
        </button>
      </nav>

      {activeTab === 'companies' ? (
        <section className="company-training-grid">
          <article className="company-training-card">
            <div className="company-training-card-header">
              <div>
                <p className="eyebrow">Empresas</p>
                <h3>Empresas colaboradoras</h3>
              </div>
              <div className="company-training-inline-filter">
                <input
                  type="search"
                  placeholder="Buscar empresa"
                  value={companySearch}
                  onChange={(event) => {
                    setCompanySearch(event.target.value);
                  }}
                />
                <select
                  value={companyStatus}
                  onChange={(event) => {
                    setCompanyStatus(
                      event.target.value as RecordStatusFilter,
                    );
                  }}
                >
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                  <option value="archived">Archivadas</option>
                  <option value="all">Todas</option>
                </select>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    void loadCompanies();
                  }}
                >
                  Filtrar
                </button>
              </div>
            </div>

            {companies.length === 0 ? (
              <p className="company-training-empty">
                No hay empresas con los filtros actuales.
              </p>
            ) : (
              <div className="company-training-table-wrapper">
                <table className="company-training-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Localidad</th>
                      <th>Tutores</th>
                      <th>Estancias</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td>
                          <strong>{company.name}</strong>
                          <span>{formatNullable(company.sector)}</span>
                        </td>
                        <td>
                          {[
                            company.city,
                            company.province,
                          ].filter(Boolean).join(' · ') || 'No indicada'}
                        </td>
                        <td>{company.tutorsCount}</td>
                        <td>{company.placementsCount}</td>
                        <td>
                          <div className="company-training-actions">
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => {
                                void handleSelectCompany(company.id);
                              }}
                            >
                              Tutores
                            </button>
                            {canManageCompanies ? (
                              <button
                                className="button button-secondary"
                                type="button"
                                onClick={() => {
                                  handleEditCompany(company);
                                }}
                              >
                                Editar
                              </button>
                            ) : null}
                            {canManageCompanies ? (
                              <button
                                className="button button-secondary"
                                type="button"
                                disabled={isSaving}
                                onClick={() => {
                                  void handleArchiveCompany(company);
                                }}
                              >
                                {company.deletedAt ? 'Restaurar' : 'Archivar'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="company-training-card">
            <div className="company-training-card-header">
              <div>
                <p className="eyebrow">
                  {companyFormMode === 'create'
                    ? 'Nueva empresa'
                    : 'Editar empresa'}
                </p>
                <h3>Datos de empresa</h3>
              </div>
              {companyFormMode === 'edit' ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setCompanyForm(createEmptyCompanyForm());
                    setCompanyFormMode('create');
                    setEditingCompanyId(null);
                  }}
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>

            <form
              className="company-training-form"
              onSubmit={(event) => {
                void handleSubmitCompany(event);
              }}
            >
              <label>
                Nombre
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      name: event.target.value,
                    });
                  }}
                  required
                />
              </label>
              <label>
                CIF/NIF
                <input
                  type="text"
                  value={companyForm.taxIdentifier}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      taxIdentifier: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Sector
                <input
                  type="text"
                  value={companyForm.sector}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      sector: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Localidad
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      city: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Provincia
                <input
                  type="text"
                  value={companyForm.province}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      province: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Teléfono
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      phone: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      email: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-form-wide">
                Dirección
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      address: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-form-wide">
                Observaciones
                <textarea
                  value={companyForm.notes}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      notes: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-checkbox">
                <input
                  type="checkbox"
                  checked={companyForm.isActive}
                  onChange={(event) => {
                    setCompanyForm({
                      ...companyForm,
                      isActive: event.target.checked,
                    });
                  }}
                />
                Empresa activa
              </label>
              <button
                className="button button-primary company-training-form-wide"
                type="submit"
                disabled={isSaving || !canManageCompanies}
              >
                {isSaving
                  ? 'Guardando...'
                  : companyFormMode === 'create'
                    ? 'Crear empresa'
                    : 'Guardar empresa'}
              </button>
            </form>
          </article>

          <article className="company-training-card company-training-card-wide">
            <div className="company-training-card-header">
              <div>
                <p className="eyebrow">Tutores laborales</p>
                <h3>
                  {selectedCompany
                    ? selectedCompany.name
                    : 'Selecciona una empresa'}
                </h3>
              </div>
            </div>

            {selectedCompanyId === null ? (
              <p className="company-training-empty">
                Pulsa “Tutores” en una empresa para ver y gestionar sus
                contactos laborales.
              </p>
            ) : (
              <div className="company-training-tutors-layout">
                <div className="company-training-table-wrapper">
                  <table className="company-training-table">
                    <thead>
                      <tr>
                        <th>Tutor</th>
                        <th>Contacto</th>
                        <th>Cargo</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyTutors.map((companyTutor) => (
                        <tr key={companyTutor.id}>
                          <td>
                            <strong>{companyTutor.fullName}</strong>
                          </td>
                          <td>
                            {companyTutor.email ?? 'Sin email'}
                            <span>{companyTutor.phone ?? 'Sin teléfono'}</span>
                          </td>
                          <td>{formatNullable(companyTutor.position)}</td>
                          <td>
                            <div className="company-training-actions">
                              {canManageTutors ? (
                                <button
                                  className="button button-secondary"
                                  type="button"
                                  onClick={() => {
                                    handleEditCompanyTutor(companyTutor);
                                  }}
                                >
                                  Editar
                                </button>
                              ) : null}
                              {canManageTutors ? (
                                <button
                                  className="button button-secondary"
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => {
                                    void handleArchiveCompanyTutor(companyTutor);
                                  }}
                                >
                                  Archivar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form
                  className="company-training-form company-training-form-compact"
                  onSubmit={(event) => {
                    void handleSubmitCompanyTutor(event);
                  }}
                >
                  <h4>
                    {companyTutorFormMode === 'create'
                      ? 'Nuevo tutor laboral'
                      : 'Editar tutor laboral'}
                  </h4>
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={companyTutorForm.firstName}
                      onChange={(event) => {
                        setCompanyTutorForm({
                          ...companyTutorForm,
                          firstName: event.target.value,
                        });
                      }}
                      required
                    />
                  </label>
                  <label>
                    Apellidos
                    <input
                      type="text"
                      value={companyTutorForm.lastName}
                      onChange={(event) => {
                        setCompanyTutorForm({
                          ...companyTutorForm,
                          lastName: event.target.value,
                        });
                      }}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={companyTutorForm.email}
                      onChange={(event) => {
                        setCompanyTutorForm({
                          ...companyTutorForm,
                          email: event.target.value,
                        });
                      }}
                    />
                  </label>
                  <label>
                    Teléfono
                    <input
                      type="text"
                      value={companyTutorForm.phone}
                      onChange={(event) => {
                        setCompanyTutorForm({
                          ...companyTutorForm,
                          phone: event.target.value,
                        });
                      }}
                    />
                  </label>
                  <label>
                    Cargo
                    <input
                      type="text"
                      value={companyTutorForm.position}
                      onChange={(event) => {
                        setCompanyTutorForm({
                          ...companyTutorForm,
                          position: event.target.value,
                        });
                      }}
                    />
                  </label>
                  <label className="company-training-checkbox">
                    <input
                      type="checkbox"
                      checked={companyTutorForm.isActive}
                      onChange={(event) => {
                        setCompanyTutorForm({
                          ...companyTutorForm,
                          isActive: event.target.checked,
                        });
                      }}
                    />
                    Tutor activo
                  </label>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={isSaving || !canManageTutors}
                  >
                    {companyTutorFormMode === 'create'
                      ? 'Crear tutor'
                      : 'Guardar tutor'}
                  </button>
                </form>
              </div>
            )}
          </article>
        </section>
      ) : activeTab === 'placements' ? (
        <section className="company-training-grid">
          <article className="company-training-card company-training-card-wide">
            <div className="company-training-card-header">
              <div>
                <p className="eyebrow">Estancias</p>
                <h3>Formación del alumnado en empresa</h3>
              </div>
              <div className="company-training-inline-filter">
                <input
                  type="search"
                  placeholder="Buscar alumno, empresa o tutor"
                  value={placementSearch}
                  onChange={(event) => {
                    setPlacementSearch(event.target.value);
                  }}
                />
                <select
                  value={placementStatus}
                  onChange={(event) => {
                    setPlacementStatus(
                      event.target.value as WorkPlacementStatusFilter,
                    );
                  }}
                >
                  <option value="all">Todos los estados</option>
                  {WORK_PLACEMENT_STATUS_OPTIONS.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    void loadWorkPlacements();
                  }}
                >
                  Filtrar
                </button>
              </div>
            </div>

            {workPlacements.length === 0 ? (
              <p className="company-training-empty">
                Todavía no hay estancias formativas registradas.
              </p>
            ) : (
              <div className="company-training-table-wrapper">
                <table className="company-training-table">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Empresa</th>
                      <th>Periodo</th>
                      <th>Horas</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workPlacements.map((workPlacement) => (
                      <tr key={workPlacement.id}>
                        <td>
                          <strong>{workPlacement.studentFullName}</strong>
                          <span>
                            {workPlacement.academicYearName} · {workPlacement.centreName}
                          </span>
                        </td>
                        <td>
                          {workPlacement.companyName}
                          <span>
                            Tutor laboral: {workPlacement.companyTutorFullName ?? 'No asignado'}
                          </span>
                        </td>
                        <td>
                          {formatDate(workPlacement.startsAt)} - {formatDate(workPlacement.endsAt)}
                        </td>
                        <td>
                          {formatNullable(workPlacement.completedHours)} / {formatNullable(workPlacement.totalHours)}
                        </td>
                        <td>
                          <span className={`company-training-status-pill company-training-status-${workPlacement.status.toLowerCase()}`}>
                            {getStatusLabel(workPlacement.status)}
                          </span>
                          {workPlacement.documentationPending ? (
                            <span className="company-training-warning">
                              Documentación pendiente
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <div className="company-training-actions">
                            {canManagePlacements ? (
                              <button
                                className="button button-secondary"
                                type="button"
                                onClick={() => {
                                  void handleEditWorkPlacement(workPlacement);
                                }}
                              >
                                Editar
                              </button>
                            ) : null}
                            {canManagePlacements ? (
                              <button
                                className="button button-secondary"
                                type="button"
                                disabled={isSaving}
                                onClick={() => {
                                  void handleArchiveWorkPlacement(workPlacement);
                                }}
                              >
                                Archivar
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="company-training-card company-training-card-wide">
            <div className="company-training-card-header">
              <div>
                <p className="eyebrow">
                  {workPlacementFormMode === 'create'
                    ? 'Nueva estancia'
                    : 'Editar estancia'}
                </p>
                <h3>Asignación de alumno a empresa</h3>
              </div>
              {workPlacementFormMode === 'edit' ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setWorkPlacementForm(createEmptyWorkPlacementForm());
                    setWorkPlacementFormMode('create');
                    setEditingWorkPlacementId(null);
                  }}
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>

            <form
              className="company-training-form company-training-form-large"
              onSubmit={(event) => {
                void handleSubmitWorkPlacement(event);
              }}
            >
              <label>
                Alumno
                <select
                  value={workPlacementForm.studentId}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      studentId: event.target.value,
                    });
                  }}
                  required
                >
                  <option value="">Selecciona alumno</option>
                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Curso académico
                <select
                  value={workPlacementForm.academicYearId}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      academicYearId: event.target.value,
                    });
                  }}
                  required
                >
                  <option value="">Selecciona curso</option>
                  {academicYears.map((academicYear) => (
                    <option
                      key={academicYear.id}
                      value={academicYear.id}
                    >
                      {academicYear.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Centro
                <select
                  value={workPlacementForm.centreId}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      centreId: event.target.value,
                    });
                  }}
                  required
                >
                  <option value="">Selecciona centro</option>
                  {centres.map((centre) => (
                    <option
                      key={centre.id}
                      value={centre.id}
                    >
                      {centre.shortName ?? centre.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Empresa
                <select
                  value={workPlacementForm.companyId}
                  onChange={(event) => {
                    const companyId = event.target.value;
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      companyId,
                      companyTutorId: '',
                    });
                    const parsedCompanyId = optionalNumber(companyId);
                    if (parsedCompanyId) {
                      void loadCompanyTutors(parsedCompanyId);
                    } else {
                      setCompanyTutors([]);
                    }
                  }}
                  required
                >
                  <option value="">Selecciona empresa</option>
                  {companies.map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tutor laboral
                <select
                  value={workPlacementForm.companyTutorId}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      companyTutorId: event.target.value,
                    });
                  }}
                >
                  <option value="">Sin tutor laboral</option>
                  {companyTutors.map((companyTutor) => (
                    <option
                      key={companyTutor.id}
                      value={companyTutor.id}
                    >
                      {companyTutor.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tutor académico
                <select
                  value={workPlacementForm.academicTutorUserId}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      academicTutorUserId: event.target.value,
                    });
                  }}
                >
                  <option value="">Sin tutor académico</option>
                  {users.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estado
                <select
                  value={workPlacementForm.status}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      status: event.target.value as WorkPlacementStatus,
                    });
                  }}
                >
                  {WORK_PLACEMENT_STATUS_OPTIONS.map((status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha inicio
                <input
                  type="date"
                  value={workPlacementForm.startsAt}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      startsAt: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Fecha fin
                <input
                  type="date"
                  value={workPlacementForm.endsAt}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      endsAt: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Horas totales
                <input
                  type="number"
                  min="0"
                  value={workPlacementForm.totalHours}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      totalHours: event.target.value,
                    });
                  }}
                />
              </label>
              <label>
                Horas realizadas
                <input
                  type="number"
                  min="0"
                  value={workPlacementForm.completedHours}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      completedHours: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-form-wide">
                Horario
                <input
                  type="text"
                  value={workPlacementForm.schedule}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      schedule: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-form-wide">
                Actividades
                <textarea
                  value={workPlacementForm.activities}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      activities: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-form-wide">
                Resultados de aprendizaje
                <textarea
                  value={workPlacementForm.learningOutcomes}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      learningOutcomes: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-form-wide">
                Observaciones
                <textarea
                  value={workPlacementForm.remarks}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      remarks: event.target.value,
                    });
                  }}
                />
              </label>
              <label className="company-training-checkbox">
                <input
                  type="checkbox"
                  checked={workPlacementForm.documentationPending}
                  onChange={(event) => {
                    setWorkPlacementForm({
                      ...workPlacementForm,
                      documentationPending: event.target.checked,
                    });
                  }}
                />
                Tiene documentación pendiente
              </label>
              <button
                className="button button-primary company-training-form-wide"
                type="submit"
                disabled={isSaving || !canManagePlacements}
              >
                {isSaving
                  ? 'Guardando...'
                  : workPlacementFormMode === 'create'
                    ? 'Crear estancia'
                    : 'Guardar estancia'}
              </button>
            </form>
          </article>
        </section>
      ) : (
        <CompanyTrainingMonitoringPanel
          canManageFollowups={canManageFollowups}
          canManageIncidents={canManageIncidents}
        />
      )}
    </main>
  );
}

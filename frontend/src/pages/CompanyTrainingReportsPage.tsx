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
  getCompanies,
} from '../services/company-training.service';
import {
  exportCompanyTrainingReportCsv,
  getCompanyTrainingReportPreview,
} from '../services/company-training-reports.service';
import {
  buildGeneratedDocumentDownloadUrl,
} from '../services/generated-documents.service';

import type {
  AcademicYear,
} from '../types/academic-years';
import type {
  Centre,
} from '../types/centres';
import type {
  Company,
} from '../types/company-training';
import type {
  CompanyTrainingDocumentationFilter,
  CompanyTrainingIncidentFilter,
  CompanyTrainingReportDocument,
  CompanyTrainingReportFilters,
  CompanyTrainingReportPreview,
  CompanyTrainingReportStatusFilter,
} from '../types/company-training-reports';

import './CompanyTrainingReportsPage.css';

const CATALOGUE_PAGE_SIZE = 50;

const STATUS_OPTIONS: {
  value: CompanyTrainingReportStatusFilter;
  label: string;
}[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'ASSIGNED', label: 'Asignada' },
  { value: 'ACTIVE', label: 'En curso' },
  { value: 'COMPLETED', label: 'Finalizada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const DOCUMENTATION_OPTIONS: {
  value: CompanyTrainingDocumentationFilter;
  label: string;
}[] = [
  { value: 'all', label: 'Toda la documentación' },
  { value: 'pending', label: 'Con documentación pendiente' },
  { value: 'complete', label: 'Sin documentación pendiente' },
];

const INCIDENT_OPTIONS: {
  value: CompanyTrainingIncidentFilter;
  label: string;
}[] = [
  { value: 'all', label: 'Todas las incidencias' },
  { value: 'open', label: 'Con incidencias abiertas' },
  { value: 'resolved', label: 'Con incidencias resueltas' },
];

interface ReportFormState {
  academicYearId: string;
  centreId: string;
  companyId: string;
  status: CompanyTrainingReportStatusFilter;
  documentationPending: CompanyTrainingDocumentationFilter;
  incidentStatus: CompanyTrainingIncidentFilter;
  maxRows: string;
  title: string;
}

function createInitialReportForm(): ReportFormState {
  return {
    academicYearId: '',
    centreId: '',
    companyId: '',
    status: 'all',
    documentationPending: 'all',
    incidentStatus: 'all',
    maxRows: '100',
    title: 'Informe de formación en empresa',
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

function optionalNumber(value: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue)
    ? undefined
    : parsedValue;
}

function requiredPositiveInteger(
  value: string,
  fallback: number,
): number {
  const parsedValue = Number.parseInt(value, 10);

  if (
    Number.isNaN(parsedValue)
    || parsedValue < 1
  ) {
    return fallback;
  }

  return parsedValue;
}

function buildFilters(
  form: ReportFormState,
): CompanyTrainingReportFilters {
  return {
    academicYearId:
      optionalNumber(form.academicYearId),
    centreId:
      optionalNumber(form.centreId),
    companyId:
      optionalNumber(form.companyId),
    status: form.status,
    documentationPending:
      form.documentationPending,
    incidentStatus:
      form.incidentStatus,
    maxRows: requiredPositiveInteger(
      form.maxRows,
      100,
    ),
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-ES').format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Sin seguimiento';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(parsedDate);
}

function formatNullable(
  value: string | number | null,
): string {
  if (
    value === null
    || value === ''
  ) {
    return 'No indicado';
  }

  return String(value);
}

export function CompanyTrainingReportsPage() {
  const [form, setForm] =
    useState<ReportFormState>(createInitialReportForm);

  const [academicYears, setAcademicYears] =
    useState<AcademicYear[]>([]);

  const [centres, setCentres] =
    useState<Centre[]>([]);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [preview, setPreview] =
    useState<CompanyTrainingReportPreview | null>(null);

  const [generatedDocument, setGeneratedDocument] =
    useState<CompanyTrainingReportDocument | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isExporting, setIsExporting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function loadCatalogues(): Promise<void> {
    const [
      academicYearsResult,
      centresResult,
      companiesResult,
    ] = await Promise.all([
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
      getCompanies({
        page: 1,
        pageSize: CATALOGUE_PAGE_SIZE,
        status: 'active',
      }),
    ]);

    setAcademicYears(academicYearsResult.items);
    setCentres(centresResult.items);
    setCompanies(companiesResult.items);
  }

  async function loadPreview(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await getCompanyTrainingReportPreview(
        buildFilters(form),
      );

      setPreview(result);
    } catch (previewError: unknown) {
      setError(getErrorMessage(previewError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    await loadPreview();
  }

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    setError(null);
    setMessage(null);
    setGeneratedDocument(null);

    try {
      const filters = buildFilters(form);
      const result = await exportCompanyTrainingReportCsv({
        academicYearId: filters.academicYearId,
        centreId: filters.centreId,
        companyId: filters.companyId,
        status: filters.status,
        documentationPending:
          filters.documentationPending,
        incidentStatus: filters.incidentStatus,
        title: form.title.trim() || undefined,
      });

      setMessage(result.message);
      setGeneratedDocument(result.document);
      await loadPreview();
    } catch (exportError: unknown) {
      setError(getErrorMessage(exportError));
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    async function initialise(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        await loadCatalogues();
        const result =
          await getCompanyTrainingReportPreview(
            buildFilters(createInitialReportForm()),
          );
        setPreview(result);
      } catch (initialiseError: unknown) {
        setError(getErrorMessage(initialiseError));
      } finally {
        setIsLoading(false);
      }
    }

    void initialise();
  }, []);

  return (
    <main className="dashboard-content company-training-reports-page">
      <section className="company-training-reports-hero">
        <div>
          <p className="eyebrow">Informes</p>
          <h2>Informes de formación en empresa</h2>
          <p>
            Previsualiza el estado de las estancias formativas, detecta
            documentación pendiente e incidencias, y genera un CSV registrado
            en el historial documental.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={isLoading}
          onClick={() => {
            void loadPreview();
          }}
        >
          {isLoading ? 'Actualizando...' : 'Actualizar vista previa'}
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

      <section className="company-training-reports-card">
        <div className="company-training-reports-card-header">
          <div>
            <p className="eyebrow">Filtros</p>
            <h3>Ámbito del informe</h3>
          </div>
        </div>

        <form
          className="company-training-reports-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label>
            Curso académico
            <select
              value={form.academicYearId}
              onChange={(event) => {
                setForm({
                  ...form,
                  academicYearId: event.target.value,
                });
              }}
            >
              <option value="">Todos los cursos</option>
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
              value={form.centreId}
              onChange={(event) => {
                setForm({
                  ...form,
                  centreId: event.target.value,
                });
              }}
            >
              <option value="">Todos los centros</option>
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
              value={form.companyId}
              onChange={(event) => {
                setForm({
                  ...form,
                  companyId: event.target.value,
                });
              }}
            >
              <option value="">Todas las empresas</option>
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
            Estado
            <select
              value={form.status}
              onChange={(event) => {
                setForm({
                  ...form,
                  status: event.target.value as CompanyTrainingReportStatusFilter,
                });
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Documentación
            <select
              value={form.documentationPending}
              onChange={(event) => {
                setForm({
                  ...form,
                  documentationPending:
                    event.target.value as CompanyTrainingDocumentationFilter,
                });
              }}
            >
              {DOCUMENTATION_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Incidencias
            <select
              value={form.incidentStatus}
              onChange={(event) => {
                setForm({
                  ...form,
                  incidentStatus:
                    event.target.value as CompanyTrainingIncidentFilter,
                });
              }}
            >
              {INCIDENT_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Filas en vista previa
            <input
              min="1"
              max="500"
              type="number"
              value={form.maxRows}
              onChange={(event) => {
                setForm({
                  ...form,
                  maxRows: event.target.value,
                });
              }}
            />
          </label>

          <label className="company-training-reports-form-wide">
            Título de la exportación
            <input
              type="text"
              value={form.title}
              onChange={(event) => {
                setForm({
                  ...form,
                  title: event.target.value,
                });
              }}
            />
          </label>

          <div className="company-training-reports-actions">
            <button
              className="button button-secondary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Generando vista previa...' : 'Ver informe'}
            </button>

            <button
              className="button button-primary"
              type="button"
              disabled={isExporting}
              onClick={() => {
                void handleExport();
              }}
            >
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        </form>
      </section>

      {generatedDocument ? (
        <section className="company-training-reports-download">
          <div>
            <p className="eyebrow">Documento generado</p>
            <h3>{generatedDocument.title}</h3>
            <p>
              {generatedDocument.fileName} · {generatedDocument.fileSizeBytes} bytes
            </p>
          </div>

          <a
            className="button button-primary"
            href={buildGeneratedDocumentDownloadUrl(generatedDocument.id)}
          >
            Descargar CSV
          </a>
        </section>
      ) : null}

      {preview ? (
        <>
          <section className="company-training-reports-summary-grid">
            <article>
              <span>{preview.summary.totalPlacements}</span>
              <strong>Estancias analizadas</strong>
            </article>
            <article>
              <span>{preview.summary.pendingDocumentationCount}</span>
              <strong>Documentación pendiente</strong>
            </article>
            <article>
              <span>{preview.summary.placementsWithoutFollowupsCount}</span>
              <strong>Sin seguimientos</strong>
            </article>
            <article>
              <span>{preview.summary.followupsCount}</span>
              <strong>Seguimientos</strong>
            </article>
            <article>
              <span>{preview.summary.openIncidentsCount}</span>
              <strong>Incidencias abiertas</strong>
            </article>
            <article>
              <span>{preview.summary.resolvedIncidentsCount}</span>
              <strong>Incidencias resueltas</strong>
            </article>
          </section>

          <section className="company-training-reports-status-grid">
            {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
              <article key={option.value}>
                <strong>{option.label}</strong>
                <span>{preview.summary.placementsByStatus[option.value] ?? 0}</span>
              </article>
            ))}
          </section>

          {preview.isPreviewTruncated ? (
            <div className="alert alert-info">
              La vista previa muestra {preview.items.length} de {preview.total} registros.
              La exportación CSV incluirá hasta {preview.exportedRowsLimit} registros.
            </div>
          ) : null}

          {preview.isExportTruncated ? (
            <div className="alert alert-error">
              Hay más registros de los que se pueden exportar en una sola operación.
              Refina los filtros antes de generar el CSV.
            </div>
          ) : null}

          <section className="company-training-reports-card">
            <div className="company-training-reports-card-header">
              <div>
                <p className="eyebrow">Vista previa</p>
                <h3>Estancias incluidas</h3>
              </div>
              <span className="company-training-reports-count">
                {preview.total} registros
              </span>
            </div>

            {preview.items.length === 0 ? (
              <p className="company-training-reports-empty">
                No hay estancias con los filtros seleccionados.
              </p>
            ) : (
              <div className="company-training-reports-table-wrapper">
                <table className="company-training-reports-table">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Empresa</th>
                      <th>Periodo</th>
                      <th>Horas</th>
                      <th>Estado</th>
                      <th>Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.studentFullName}</strong>
                          <span>
                            {item.academicYearName} · {item.centreName}
                          </span>
                        </td>
                        <td>
                          {item.companyName}
                          <span>
                            Tutor laboral: {item.companyTutorFullName ?? 'No asignado'}
                          </span>
                        </td>
                        <td>
                          {formatDate(item.startsAt)} - {formatDate(item.endsAt)}
                        </td>
                        <td>
                          {formatNullable(item.completedHours)} / {formatNullable(item.totalHours)}
                        </td>
                        <td>
                          <span className={`company-training-reports-status-pill company-training-reports-status-${item.status.toLowerCase()}`}>
                            {item.statusLabel}
                          </span>
                          {item.documentationPending ? (
                            <span className="company-training-reports-warning">
                              Documentación pendiente
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <strong>{item.followupsCount} seguimientos</strong>
                          <span>
                            Último: {formatDateTime(item.lastFollowupAt)}
                          </span>
                          <span>
                            Incidencias: {item.openIncidentsCount} abiertas · {item.resolvedIncidentsCount} resueltas
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

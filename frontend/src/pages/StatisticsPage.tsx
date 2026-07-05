import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import type {
  AcademicStatisticsResponse,
  GroupedAcademicStatisticsItem,
} from '../types/statistics';

import {
  ApiError,
} from '../services/api.service';

import {
  getAcademicYears,
} from '../services/academic-years.service';

import {
  getCentres,
} from '../services/centres.service';

import {
  getEvaluations,
} from '../services/evaluations.service';

import {
  getAcademicStatistics,
} from '../services/statistics.service';

import './StatisticsPage.css';

interface OptionItem {
  id: number;
  label: string;
}

interface FilterState {
  academicYearId: string;
  centreId: string;
  evaluationId: string;
}

const emptyFilters: FilterState = {
  academicYearId: '',
  centreId: '',
  evaluationId: '',
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

function getOptionalNumber(
  value: string,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : undefined;
}

function formatInteger(value: number): string {
  return value.toLocaleString('es-ES');
}

function formatDecimal(
  value: number | null,
): string {
  if (value === null) {
    return '—';
  }

  return value.toLocaleString(
    'es-ES',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatRate(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${formatDecimal(value)} %`;
}

function StatisticsTable({
  title,
  items,
}: {
  title: string;
  items: GroupedAcademicStatisticsItem[];
}) {
  return (
    <section className="statistics-card">
      <h3>{title}</h3>

      {items.length === 0 ? (
        <p className="statistics-muted">
          No hay datos para mostrar.
        </p>
      ) : (
        <div className="statistics-table-wrapper">
          <table className="statistics-table">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Matriculados</th>
                <th>Evaluados</th>
                <th>Aprobados</th>
                <th>Suspensos</th>
                <th>Éxito</th>
                <th>Rendimiento</th>
                <th>Media</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {item.acronym ?? item.code}
                    </strong>
                    <span>{item.name}</span>
                  </td>
                  <td>
                    {formatInteger(
                      item.metrics.enrolled,
                    )}
                  </td>
                  <td>
                    {formatInteger(
                      item.metrics.evaluated,
                    )}
                  </td>
                  <td>
                    {formatInteger(
                      item.metrics.passed,
                    )}
                  </td>
                  <td>
                    {formatInteger(
                      item.metrics.failed,
                    )}
                  </td>
                  <td>
                    {formatRate(
                      item.metrics.successRate,
                    )}
                  </td>
                  <td>
                    {formatRate(
                      item.metrics.performanceRate,
                    )}
                  </td>
                  <td>
                    {formatDecimal(
                      item.metrics.averageGrade,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function StatisticsPage() {
  const [filters, setFilters] =
    useState<FilterState>(emptyFilters);

  const [academicYears, setAcademicYears] =
    useState<OptionItem[]>([]);

  const [centres, setCentres] =
    useState<OptionItem[]>([]);

  const [evaluations, setEvaluations] =
    useState<OptionItem[]>([]);

  const [statistics, setStatistics] =
    useState<AcademicStatisticsResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function loadStatistics(
    nextFilters: FilterState,
  ): Promise<void> {
    const result = await getAcademicStatistics({
      academicYearId: getOptionalNumber(
        nextFilters.academicYearId,
      ),
      centreId: getOptionalNumber(
        nextFilters.centreId,
      ),
      evaluationId: getOptionalNumber(
        nextFilters.evaluationId,
      ),
    });

    setStatistics(result);
  }

  useEffect(() => {
    async function loadInitialData(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const [
          academicYearsResponse,
          centresResponse,
          evaluationsResponse,
        ] = await Promise.all([
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
          getEvaluations({
            page: 1,
            pageSize: 50,
            status: 'all',
          }),
        ]);

        setAcademicYears(
          academicYearsResponse.items.map(
            (academicYear) => ({
              id: academicYear.id,
              label: academicYear.isCurrent
                ? `${academicYear.name} · actual`
                : academicYear.name,
            }),
          ),
        );

        setCentres(
          centresResponse.items.map((centre) => ({
            id: centre.id,
            label: centre.shortName
              ? `${centre.shortName} · ${centre.name}`
              : centre.name,
          })),
        );

        setEvaluations(
          evaluationsResponse.items.map(
            (evaluation) => ({
              id: evaluation.id,
              label: `${evaluation.code} · ${evaluation.name}`,
            }),
          ),
        );

        const currentAcademicYear =
          academicYearsResponse.items.find(
            (academicYear) =>
              academicYear.isCurrent,
          );

        const nextFilters = {
          ...emptyFilters,
          academicYearId:
            currentAcademicYear?.id.toString()
            ?? '',
        };

        setFilters(nextFilters);
        await loadStatistics(nextFilters);
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await loadStatistics(filters);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterChange(
    field: keyof FilterState,
    value: string,
  ): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  return (
    <main className="dashboard-content statistics-page">
      <section className="statistics-hero">
        <div>
          <p className="eyebrow">
            Fase 5 · Estadísticas
          </p>
          <h2>Estadísticas académicas</h2>
          <p>
            Panel de rendimiento, éxito, estados y comparativas
            calculado desde matrículas y calificaciones reales.
          </p>
        </div>
        <span className="statistics-status">
          Datos reales
        </span>
      </section>

      <section className="statistics-card">
        <h3>Filtros principales</h3>

        <form
          className="statistics-filters"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label htmlFor="academicYearId">
            Curso académico
            <select
              id="academicYearId"
              value={filters.academicYearId}
              onChange={(event) => {
                handleFilterChange(
                  'academicYearId',
                  event.target.value,
                );
              }}
            >
              <option value="">Todos</option>
              {academicYears.map((academicYear) => (
                <option
                  key={academicYear.id}
                  value={academicYear.id}
                >
                  {academicYear.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="centreId">
            Centro
            <select
              id="centreId"
              value={filters.centreId}
              onChange={(event) => {
                handleFilterChange(
                  'centreId',
                  event.target.value,
                );
              }}
            >
              <option value="">Todos</option>
              {centres.map((centre) => (
                <option
                  key={centre.id}
                  value={centre.id}
                >
                  {centre.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="evaluationId">
            Evaluación
            <select
              id="evaluationId"
              value={filters.evaluationId}
              onChange={(event) => {
                handleFilterChange(
                  'evaluationId',
                  event.target.value,
                );
              }}
            >
              <option value="">Todas</option>
              {evaluations.map((evaluation) => (
                <option
                  key={evaluation.id}
                  value={evaluation.id}
                >
                  {evaluation.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="button button-primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? 'Calculando...'
              : 'Actualizar'}
          </button>
        </form>
      </section>

      {error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : null}

      {statistics?.warnings.length ? (
        <section className="statistics-warnings">
          {statistics.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}

      {statistics ? (
        <>
          <section className="statistics-grid">
            <article className="statistics-metric">
              <span>Matriculados</span>
              <strong>
                {formatInteger(
                  statistics.summary.enrolled,
                )}
              </strong>
            </article>
            <article className="statistics-metric">
              <span>Evaluados</span>
              <strong>
                {formatInteger(
                  statistics.summary.evaluated,
                )}
              </strong>
            </article>
            <article className="statistics-metric">
              <span>Aprobados</span>
              <strong>
                {formatInteger(
                  statistics.summary.passed,
                )}
              </strong>
            </article>
            <article className="statistics-metric">
              <span>Suspensos</span>
              <strong>
                {formatInteger(
                  statistics.summary.failed,
                )}
              </strong>
            </article>
            <article className="statistics-metric">
              <span>Tasa de éxito</span>
              <strong>
                {formatRate(
                  statistics.summary.successRate,
                )}
              </strong>
            </article>
            <article className="statistics-metric">
              <span>Tasa de rendimiento</span>
              <strong>
                {formatRate(
                  statistics.summary.performanceRate,
                )}
              </strong>
            </article>
            <article className="statistics-metric">
              <span>Nota media</span>
              <strong>
                {formatDecimal(
                  statistics.summary.averageGrade,
                )}
              </strong>
            </article>
            <article className="statistics-metric">
              <span>No evaluados</span>
              <strong>
                {statistics.summary.notEvaluated === null
                  ? '—'
                  : formatInteger(
                    statistics.summary.notEvaluated,
                  )}
              </strong>
            </article>
          </section>

          <StatisticsTable
            title="Comparativa por ciclo"
            items={statistics.byProgramme}
          />
          <StatisticsTable
            title="Comparativa por nivel"
            items={statistics.byLevel}
          />
          <StatisticsTable
            title="Comparativa por módulo"
            items={statistics.byModule}
          />
        </>
      ) : null}
    </main>
  );
}

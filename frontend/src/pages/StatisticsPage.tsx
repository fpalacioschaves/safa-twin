import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import type {
  AcademicStatisticsMetrics,
  AcademicStatisticsResponse,
  GradeDistributionItem,
  GroupedAcademicStatisticsItem,
  StatusDistributionItem,
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

interface ChartDataItem {
  key: string;
  label: string;
  value: number;
  secondaryLabel?: string;
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

function getMaximumValue(
  items: ChartDataItem[],
): number {
  return Math.max(
    1,
    ...items.map((item) => item.value),
  );
}

function getBarWidth(
  value: number,
  maximum: number,
): string {
  if (value <= 0 || maximum <= 0) {
    return '0%';
  }

  return `${Math.max(2, value * 100 / maximum)}%`;
}

function getRateNumber(
  value: number | null,
): number {
  return value ?? 0;
}

function StatisticsTable({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: GroupedAcademicStatisticsItem[];
}) {
  return (
    <section className="statistics-card">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Comparativa</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

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

function HorizontalBarChart({
  title,
  description,
  items,
  valueSuffix = '',
}: {
  title: string;
  description: string;
  items: ChartDataItem[];
  valueSuffix?: string;
}) {
  const visibleItems = items.filter(
    (item) => item.value > 0,
  );

  const maximum = getMaximumValue(visibleItems);

  return (
    <article className="statistics-card">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Gráfica</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p className="statistics-muted">
          No hay datos suficientes para representar esta gráfica.
        </p>
      ) : (
        <div className="statistics-chart-list">
          {visibleItems.map((item) => (
            <div
              className="statistics-chart-row"
              key={item.key}
            >
              <div className="statistics-chart-label">
                <strong>{item.label}</strong>
                {item.secondaryLabel ? (
                  <span>{item.secondaryLabel}</span>
                ) : null}
              </div>

              <div
                className="statistics-chart-track"
                aria-hidden="true"
              >
                <span
                  className="statistics-chart-fill"
                  style={{
                    width: getBarWidth(
                      item.value,
                      maximum,
                    ),
                  }}
                />
              </div>

              <strong className="statistics-chart-value">
                {formatInteger(item.value)}{valueSuffix}
              </strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function RateBarChart({
  title,
  description,
  items,
  metric,
}: {
  title: string;
  description: string;
  items: GroupedAcademicStatisticsItem[];
  metric: 'successRate' | 'performanceRate';
}) {
  const chartItems = items
    .map((item) => ({
      key: item.id.toString(),
      label: item.acronym ?? item.code,
      value: getRateNumber(
        item.metrics[metric],
      ),
      secondaryLabel: item.name,
    }))
    .filter((item) => item.value > 0);

  const maximum = 100;

  return (
    <article className="statistics-card">
      <div className="statistics-section-heading">
        <div>
          <p className="eyebrow">Tasas</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {chartItems.length === 0 ? (
        <p className="statistics-muted">
          No hay tasas calculables para los filtros seleccionados.
        </p>
      ) : (
        <div className="statistics-chart-list">
          {chartItems.map((item) => (
            <div
              className="statistics-chart-row"
              key={item.key}
            >
              <div className="statistics-chart-label">
                <strong>{item.label}</strong>
                <span>{item.secondaryLabel}</span>
              </div>

              <div
                className="statistics-chart-track"
                aria-hidden="true"
              >
                <span
                  className="statistics-chart-fill"
                  style={{
                    width: getBarWidth(
                      item.value,
                      maximum,
                    ),
                  }}
                />
              </div>

              <strong className="statistics-chart-value">
                {formatRate(item.value)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function GradeDistributionChart({
  items,
}: {
  items: GradeDistributionItem[];
}) {
  return (
    <HorizontalBarChart
      title="Distribución de notas numéricas"
      description="Solo incluye calificaciones numéricas. Los estados NE, NC, NP, PFE y equivalentes se muestran aparte."
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        value: item.count,
        secondaryLabel: item.key,
      }))}
    />
  );
}

function StatusDistributionChart({
  items,
}: {
  items: StatusDistributionItem[];
}) {
  return (
    <HorizontalBarChart
      title="Estados no numéricos y administrativos"
      description="Permite controlar situaciones como no evaluado, no presentado, pendiente de formación en empresa, convalidaciones o exenciones."
      items={items.map((item) => ({
        key: item.code,
        label: item.code,
        value: item.count,
        secondaryLabel: item.name,
      }))}
    />
  );
}

function OutcomeChart({
  metrics,
}: {
  metrics: AcademicStatisticsMetrics;
}) {
  const items: ChartDataItem[] = [
    {
      key: 'passed',
      label: 'Aprobados',
      value: metrics.passed,
    },
    {
      key: 'failed',
      label: 'Suspensos',
      value: metrics.failed,
    },
    {
      key: 'not-evaluated',
      label: 'No evaluados',
      value: metrics.notEvaluated ?? 0,
    },
    {
      key: 'no-show',
      label: 'No presentados',
      value: metrics.noShow,
    },
    {
      key: 'non-evaluable',
      label: 'No evaluables',
      value: metrics.nonEvaluable,
    },
  ];

  return (
    <HorizontalBarChart
      title="Resultado global de la evaluación"
      description="Separa aprobados, suspensos y estados no evaluables para no convertir estados administrativos en notas."
      items={items}
    />
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

          <section className="statistics-chart-grid">
            <OutcomeChart metrics={statistics.summary} />

            <GradeDistributionChart
              items={
                statistics.summary.gradeDistribution
              }
            />

            <StatusDistributionChart
              items={
                statistics.summary.statusDistribution
              }
            />

            <RateBarChart
              title="Tasa de éxito por módulo"
              description="Porcentaje de aprobados sobre evaluados en cada módulo."
              items={statistics.byModule}
              metric="successRate"
            />

            <RateBarChart
              title="Tasa de rendimiento por módulo"
              description="Porcentaje de aprobados sobre matriculados en cada módulo."
              items={statistics.byModule}
              metric="performanceRate"
            />

            <RateBarChart
              title="Comparativa de rendimiento por ciclo"
              description="Comparación entre ciclos como DAW, DAM u otros ciclos filtrados."
              items={statistics.byProgramme}
              metric="performanceRate"
            />
          </section>

          <StatisticsTable
            title="Comparativa por ciclo"
            description="Diferencia DAW, DAM u otros ciclos sin duplicar módulos entre planes."
            items={statistics.byProgramme}
          />
          <StatisticsTable
            title="Comparativa por nivel"
            description="Separa primero y segundo para evitar lecturas cruzadas entre cursos."
            items={statistics.byLevel}
          />
          <StatisticsTable
            title="Comparativa por módulo"
            description="Muestra resultados módulo a módulo dentro del ámbito filtrado."
            items={statistics.byModule}
          />
        </>
      ) : null}
    </main>
  );
}

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  getCurriculumLearningOutcomes,
  getCurriculumTrainingActions,
  importCurriculum,
} from '../services/curriculum.service';

import type {
  CurriculumImportRequest,
  CurriculumImportResponse,
  CurriculumLearningOutcomeItem,
  CurriculumPagination,
  CurriculumStatus,
  CurriculumTab,
  CurriculumTrainingActionItem,
} from '../types/curriculum';

import './CurriculumPage.css';

const PAGE_SIZE = 10;

const EMPTY_PAGINATION: CurriculumPagination = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

const DEFAULT_IMPORT_EXAMPLE = JSON.stringify(
  {
    sourceName: 'Plan de formación dual DAW/DAM pendiente de validar',
    learningOutcomes: [
      {
        moduleCode: '0613',
        vocationalProgrammeAcronym: 'DAW',
        academicLevelNumber: 2,
        code: 'RA1',
        title: 'Resultado de aprendizaje pendiente de cargar desde documento real',
        description: 'Texto procedente de normativa, programación o plan validado.',
        sortOrder: 1,
      },
    ],
    trainingActions: [
      {
        moduleCode: '0613',
        vocationalProgrammeAcronym: 'DAW',
        academicLevelNumber: 2,
        code: 'AF1',
        title: 'Acción formativa pendiente de cargar desde documento real',
        description: 'Texto procedente del plan de formación real.',
        plannedHours: 10,
        sortOrder: 1,
        relatedLearningOutcomeCodes: [
          'RA1',
        ],
      },
    ],
  },
  null,
  2,
);

interface CurriculumFilters {
  search: string;
  vocationalProgrammeAcronym: string;
  academicLevelNumber: string;
  status: CurriculumStatus;
}

const DEFAULT_FILTERS: CurriculumFilters = {
  search: '',
  vocationalProgrammeAcronym: '',
  academicLevelNumber: '',
  status: 'active',
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

function getModuleLabel(
  item: {
    module: CurriculumLearningOutcomeItem['module'];
  },
): string {
  return `${item.module.code} · ${item.module.name}`;
}

function getProgrammeLevelLabel(
  item: {
    module: CurriculumLearningOutcomeItem['module'];
  },
): string {
  return `${item.module.vocationalProgramme.acronym} · ${item.module.academicLevel.name}`;
}

function getStatusLabel(
  status: CurriculumStatus,
): string {
  const labels: Record<CurriculumStatus, string> = {
    active: 'Activos',
    inactive: 'Inactivos',
    archived: 'Archivados',
    all: 'Todos',
  };

  return labels[status];
}

function formatHours(value: number | null): string {
  if (value === null) {
    return 'Sin horas';
  }

  return `${value.toLocaleString('es-ES')} h`;
}

function buildQuery(
  filters: CurriculumFilters,
  page: number,
) {
  return {
    search: filters.search.trim() || undefined,
    vocationalProgrammeAcronym:
      filters.vocationalProgrammeAcronym.trim().toUpperCase()
      || undefined,
    academicLevelNumber: filters.academicLevelNumber
      ? Number(filters.academicLevelNumber)
      : undefined,
    status: filters.status,
    page,
    pageSize: PAGE_SIZE,
  };
}

function renderSource(value: string | null): string {
  return value ?? 'Sin referencia';
}

function renderDescription(value: string | null): string {
  return value ?? 'Sin descripción';
}

function isCurriculumImportRequest(
  value: unknown,
): value is CurriculumImportRequest {
  return (
    typeof value === 'object'
    && value !== null
    && (
      'learningOutcomes' in value
      || 'trainingActions' in value
    )
  );
}

export function CurriculumPage() {
  const [activeTab, setActiveTab] =
    useState<CurriculumTab>('learning-outcomes');

  const [filters, setFilters] =
    useState<CurriculumFilters>(DEFAULT_FILTERS);

  const [learningOutcomes, setLearningOutcomes] =
    useState<CurriculumLearningOutcomeItem[]>([]);

  const [trainingActions, setTrainingActions] =
    useState<CurriculumTrainingActionItem[]>([]);

  const [pagination, setPagination] =
    useState<CurriculumPagination>(EMPTY_PAGINATION);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [importText, setImportText] =
    useState(DEFAULT_IMPORT_EXAMPLE);

  const [isImporting, setIsImporting] =
    useState(false);

  const [importResult, setImportResult] =
    useState<CurriculumImportResponse | null>(null);

  async function loadItems(
    page: number,
    nextFilters: CurriculumFilters = filters,
    nextTab: CurriculumTab = activeTab,
  ): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const query = buildQuery(
        nextFilters,
        page,
      );

      if (nextTab === 'learning-outcomes') {
        const result = await getCurriculumLearningOutcomes(query);

        setLearningOutcomes(result.items);
        setPagination(result.pagination);
      } else {
        const result = await getCurriculumTrainingActions(query);

        setTrainingActions(result.items);
        setPagination(result.pagination);
      }
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems(
      1,
      filters,
      activeTab,
    );
  }, [activeTab]);

  function handleFilterSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    void loadItems(1);
  }

  function handleResetFilters(): void {
    setFilters(DEFAULT_FILTERS);
    void loadItems(
      1,
      DEFAULT_FILTERS,
    );
  }

  function handleTabChange(
    nextTab: CurriculumTab,
  ): void {
    setActiveTab(nextTab);
    setPagination(EMPTY_PAGINATION);
    setError(null);
  }

  async function handleImport(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const parsed = JSON.parse(importText) as unknown;

      if (!isCurriculumImportRequest(parsed)) {
        throw new Error(
          'El JSON debe incluir learningOutcomes o trainingActions.',
        );
      }

      const result = await importCurriculum(parsed);

      setImportResult(result);

      await loadItems(1);
    } catch (importError: unknown) {
      setError(getErrorMessage(importError));
    } finally {
      setIsImporting(false);
    }
  }

  const visibleItemsCount = activeTab === 'learning-outcomes'
    ? learningOutcomes.length
    : trainingActions.length;

  return (
    <main className="dashboard-content curriculum-page">
      <section className="curriculum-hero">
        <div>
          <p className="eyebrow">Currículo oficial y dual</p>
          <h2>Resultados de Aprendizaje y Acciones Formativas</h2>
          <p>
            Consulta el currículo asociado a cada módulo profesional. La base
            queda preparada para cargar RA oficiales y AF reales cuando se
            disponga del documento validado del centro o de Séneca.
          </p>
        </div>

        <span className="curriculum-status">
          {pagination.total} registros
        </span>
      </section>

      {error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : null}

      {importResult ? (
        <div className="alert alert-success">
          {importResult.message} RA procesados:{' '}
          {importResult.summary.learningOutcomesProcessed}. AF procesadas:{' '}
          {importResult.summary.trainingActionsProcessed}. Relaciones:{' '}
          {importResult.summary.linksProcessed}.
        </div>
      ) : null}

      <section className="curriculum-card">
        <div className="curriculum-card-header">
          <div>
            <p className="eyebrow">Filtros</p>
            <h3>Consulta curricular</h3>
            <p>
              Filtra por texto, ciclo, curso y estado. De momento la tabla
              puede aparecer vacía hasta que carguemos datos curriculares
              reales.
            </p>
          </div>
        </div>

        <form
          className="curriculum-filters"
          onSubmit={handleFilterSubmit}
        >
          <label>
            Buscar
            <input
              type="search"
              placeholder="RA1, AF1, programación, empresa..."
              value={filters.search}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }));
              }}
            />
          </label>

          <label>
            Ciclo
            <select
              value={filters.vocationalProgrammeAcronym}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  vocationalProgrammeAcronym: event.target.value,
                }));
              }}
            >
              <option value="">Todos</option>
              <option value="DAW">DAW</option>
              <option value="DAM">DAM</option>
            </select>
          </label>

          <label>
            Curso
            <select
              value={filters.academicLevelNumber}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  academicLevelNumber: event.target.value,
                }));
              }}
            >
              <option value="">Todos</option>
              <option value="1">Primero</option>
              <option value="2">Segundo</option>
            </select>
          </label>

          <label>
            Estado
            <select
              value={filters.status}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as CurriculumStatus,
                }));
              }}
            >
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
            </select>
          </label>

          <div className="curriculum-filter-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>

            <button
              className="button button-secondary"
              type="button"
              disabled={isLoading}
              onClick={handleResetFilters}
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section className="curriculum-card">
        <div className="curriculum-tabs" role="tablist">
          <button
            className={
              activeTab === 'learning-outcomes'
                ? 'curriculum-tab curriculum-tab-active'
                : 'curriculum-tab'
            }
            type="button"
            onClick={() => {
              handleTabChange('learning-outcomes');
            }}
          >
            Resultados de Aprendizaje
          </button>

          <button
            className={
              activeTab === 'training-actions'
                ? 'curriculum-tab curriculum-tab-active'
                : 'curriculum-tab'
            }
            type="button"
            onClick={() => {
              handleTabChange('training-actions');
            }}
          >
            Acciones Formativas
          </button>
        </div>

        <div className="curriculum-card-header">
          <div>
            <p className="eyebrow">
              {getStatusLabel(filters.status)}
            </p>
            <h3>
              {activeTab === 'learning-outcomes'
                ? 'Resultados de Aprendizaje'
                : 'Acciones Formativas'}
            </h3>
            <p>
              Mostrando {visibleItemsCount} elementos de {pagination.total}.
            </p>
          </div>

          <button
            className="button button-secondary"
            type="button"
            disabled={isLoading}
            onClick={() => {
              void loadItems(pagination.page);
            }}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {activeTab === 'learning-outcomes' ? (
          learningOutcomes.length === 0 ? (
            <p className="curriculum-empty">
              No hay Resultados de Aprendizaje cargados con estos filtros.
            </p>
          ) : (
            <div className="curriculum-table-wrapper">
              <table className="curriculum-table">
                <thead>
                  <tr>
                    <th>Ciclo / curso</th>
                    <th>Módulo</th>
                    <th>RA</th>
                    <th>Título</th>
                    <th>Descripción</th>
                    <th>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {learningOutcomes.map((item) => (
                    <tr key={item.id}>
                      <td>{getProgrammeLevelLabel(item)}</td>
                      <td>{getModuleLabel(item)}</td>
                      <td>
                        <strong>{item.code}</strong>
                      </td>
                      <td>{item.title}</td>
                      <td>{renderDescription(item.description)}</td>
                      <td>{renderSource(item.sourceReference)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          trainingActions.length === 0 ? (
            <p className="curriculum-empty">
              No hay Acciones Formativas cargadas con estos filtros.
            </p>
          ) : (
            <div className="curriculum-table-wrapper">
              <table className="curriculum-table">
                <thead>
                  <tr>
                    <th>Ciclo / curso</th>
                    <th>Módulo</th>
                    <th>AF</th>
                    <th>Título</th>
                    <th>Horas</th>
                    <th>RA relacionados</th>
                    <th>Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingActions.map((item) => (
                    <tr key={item.id}>
                      <td>{getProgrammeLevelLabel(item)}</td>
                      <td>{getModuleLabel(item)}</td>
                      <td>
                        <strong>{item.code}</strong>
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                        <span>{renderDescription(item.description)}</span>
                      </td>
                      <td>{formatHours(item.plannedHours)}</td>
                      <td>
                        {item.relatedLearningOutcomes.length === 0
                          ? 'Sin relación'
                          : item.relatedLearningOutcomes
                            .map((learningOutcome) => learningOutcome.code)
                            .join(', ')}
                      </td>
                      <td>{renderSource(item.sourceReference)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <div className="curriculum-pagination">
          <button
            className="button button-secondary"
            type="button"
            disabled={isLoading || pagination.page <= 1}
            onClick={() => {
              void loadItems(pagination.page - 1);
            }}
          >
            Anterior
          </button>

          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>

          <button
            className="button button-secondary"
            type="button"
            disabled={
              isLoading
              || pagination.page >= pagination.totalPages
            }
            onClick={() => {
              void loadItems(pagination.page + 1);
            }}
          >
            Siguiente
          </button>
        </div>
      </section>

      <section className="curriculum-card">
        <div className="curriculum-card-header">
          <div>
            <p className="eyebrow">Importación preparada</p>
            <h3>Cargar currículo validado</h3>
            <p>
              Cuando tengamos los datos reales, podremos pegarlos aquí en JSON
              o transformar un Excel/CSV a este formato. La importación valida
              módulos, ciclos, cursos, RA relacionados y evita duplicados por
              código dentro del mismo módulo.
            </p>
          </div>
        </div>

        <form
          className="curriculum-import"
          onSubmit={(event) => {
            void handleImport(event);
          }}
        >
          <label>
            JSON de importación
            <textarea
              rows={18}
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
              }}
            />
          </label>

          <div className="curriculum-import-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={isImporting}
            >
              {isImporting
                ? 'Importando...'
                : 'Importar currículo'}
            </button>

            <button
              className="button button-secondary"
              type="button"
              disabled={isImporting}
              onClick={() => {
                setImportText(DEFAULT_IMPORT_EXAMPLE);
                setImportResult(null);
              }}
            >
              Restaurar ejemplo
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

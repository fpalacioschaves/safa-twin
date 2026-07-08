import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  getCurriculumEvaluationCriteria,
  getCurriculumLearningOutcomes,
  getCurriculumTrainingActions,
} from '../services/curriculum.service';

import {
  getModules,
} from '../services/modules.service';

import type {
  CurriculumEvaluationCriterionItem,
  CurriculumLearningOutcomeItem,
  CurriculumPagination,
  CurriculumStatus,
  CurriculumTab,
  CurriculumTrainingActionItem,
} from '../types/curriculum';

import type {
  ProfessionalModule,
} from '../types/modules';

import {
  EvaluationCriterionManager,
} from './EvaluationCriterionManager';

import {
  LearningOutcomeManager,
} from './LearningOutcomeManager';

import {
  TrainingActionManager,
} from './TrainingActionManager';

import './CurriculumPage.css';

const PAGE_SIZE = 10;

const EMPTY_PAGINATION: CurriculumPagination = {
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

interface CurriculumFilters {
  search: string;
  vocationalProgrammeAcronym: string;
  academicLevelNumber: string;
  moduleId: string;
  status: CurriculumStatus;
}

const DEFAULT_FILTERS: CurriculumFilters = {
  search: '',
  vocationalProgrammeAcronym: '',
  academicLevelNumber: '',
  moduleId: '',
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

function getModuleOptionLabel(
  module: ProfessionalModule,
): string {
  return `${module.vocationalProgramme.acronym} · ${module.academicLevel.name} · ${module.code} · ${module.name}`;
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

function getTabTitle(
  activeTab: CurriculumTab,
): string {
  const titles: Record<CurriculumTab, string> = {
    'learning-outcomes': 'Resultados de Aprendizaje',
    'evaluation-criteria': 'Criterios de Evaluación',
    'training-actions': 'Acciones Formativas',
  };

  return titles[activeTab];
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
    moduleId: filters.moduleId
      ? Number(filters.moduleId)
      : undefined,
    status: filters.status,
    page,
    pageSize: PAGE_SIZE,
  };
}

function filterModuleOptions(
  modules: ProfessionalModule[],
  filters: CurriculumFilters,
): ProfessionalModule[] {
  return modules.filter((module) => {
    if (
      filters.vocationalProgrammeAcronym
      && module.vocationalProgramme.acronym
        !== filters.vocationalProgrammeAcronym
    ) {
      return false;
    }

    if (
      filters.academicLevelNumber
      && module.academicLevel.number
        !== Number(filters.academicLevelNumber)
    ) {
      return false;
    }

    return true;
  });
}

export function CurriculumPage() {
  const [activeTab, setActiveTab] =
    useState<CurriculumTab>('learning-outcomes');

  const [filters, setFilters] =
    useState<CurriculumFilters>(DEFAULT_FILTERS);

  const [moduleOptions, setModuleOptions] =
    useState<ProfessionalModule[]>([]);

  const [learningOutcomes, setLearningOutcomes] =
    useState<CurriculumLearningOutcomeItem[]>([]);

  const [evaluationCriteria, setEvaluationCriteria] =
    useState<CurriculumEvaluationCriterionItem[]>([]);

  const [trainingActions, setTrainingActions] =
    useState<CurriculumTrainingActionItem[]>([]);

  const [pagination, setPagination] =
    useState<CurriculumPagination>(EMPTY_PAGINATION);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isLoadingModules, setIsLoadingModules] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function loadModules(): Promise<void> {
    setIsLoadingModules(true);

    try {
      const result = await getModules({
        page: 1,
        pageSize: 50,
        status: 'active',
      });

      setModuleOptions(result.items);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoadingModules(false);
    }
  }

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
      } else if (nextTab === 'evaluation-criteria') {
        const result = await getCurriculumEvaluationCriteria(query);

        setEvaluationCriteria(result.items);
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
    void loadModules();
  }, []);

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

  const visibleItemsCount = activeTab === 'learning-outcomes'
    ? learningOutcomes.length
    : activeTab === 'evaluation-criteria'
      ? evaluationCriteria.length
      : trainingActions.length;

  const filteredModuleOptions = filterModuleOptions(
    moduleOptions,
    filters,
  );

  return (
    <main className="dashboard-content curriculum-page">
      <section className="curriculum-hero">
        <div>
          <p className="eyebrow">Currículo oficial y dual</p>
          <h2>Resultados, criterios y acciones formativas</h2>
          <p>
            Consulta el currículo asociado a cada módulo profesional. Usa los
            filtros para separar DAW, DAM, curso, asignatura, RA, CA y acciones
            formativas sin mezclar datos de ciclos o niveles distintos.
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

      <section className="curriculum-card">
        <div className="curriculum-card-header">
          <div>
            <p className="eyebrow">Filtros</p>
            <h3>Consulta curricular</h3>
            <p>
              Filtra por texto, ciclo, curso, módulo profesional y estado. El
              selector de módulo se adapta automáticamente al ciclo y curso
              seleccionados.
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
              placeholder="RA1, CA1, AF1, programación, empresa..."
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
                  moduleId: '',
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
                  moduleId: '',
                }));
              }}
            >
              <option value="">Todos</option>
              <option value="1">Primero</option>
              <option value="2">Segundo</option>
            </select>
          </label>

          <label>
            Módulo / asignatura
            <select
              value={filters.moduleId}
              disabled={isLoadingModules}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  moduleId: event.target.value,
                }));
              }}
            >
              <option value="">
                {isLoadingModules
                  ? 'Cargando módulos...'
                  : 'Todos los módulos'}
              </option>
              {filteredModuleOptions.map((module) => (
                <option
                  key={module.id}
                  value={module.id}
                >
                  {getModuleOptionLabel(module)}
                </option>
              ))}
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
              activeTab === 'evaluation-criteria'
                ? 'curriculum-tab curriculum-tab-active'
                : 'curriculum-tab'
            }
            type="button"
            onClick={() => {
              handleTabChange('evaluation-criteria');
            }}
          >
            Criterios de Evaluación
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
            <h3>{getTabTitle(activeTab)}</h3>
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
          <LearningOutcomeManager
            moduleOptions={moduleOptions}
            learningOutcomes={learningOutcomes}
            onChanged={() => loadItems(1)}
          />
        ) : null}

        {activeTab === 'evaluation-criteria' ? (
          <EvaluationCriterionManager
            evaluationCriteria={evaluationCriteria}
            onChanged={() => loadItems(1)}
          />
        ) : null}

        {activeTab === 'training-actions' ? (
          <TrainingActionManager
            moduleOptions={moduleOptions}
            trainingActions={trainingActions}
            onChanged={() => loadItems(1)}
          />
        ) : null}

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
    </main>
  );
}

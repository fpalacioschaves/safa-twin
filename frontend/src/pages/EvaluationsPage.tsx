import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

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
  archiveEvaluation,
  archiveGradeStatus,
  closeEvaluation,
  createEvaluation,
  createGradeStatus,
  getEvaluationStatistics,
  getEvaluations,
  getGradeStatuses,
  lockEvaluation,
  reopenEvaluation,
  restoreEvaluation,
  restoreGradeStatus,
  updateEvaluation,
  updateGradeStatus,
} from '../services/evaluations.service';

import type {
  AcademicYear,
} from '../types/academic-years';

import type {
  Centre,
} from '../types/centres';

import type {
  Evaluation,
  EvaluationStatisticsResponse,
  EvaluationStatus,
  EvaluationStatusFilter,
  GradeStatus,
  GradeStatusStatusFilter,
} from '../types/evaluations';

import './EvaluationsPage.css';

const PAGE_SIZE = 10;

const EVALUATION_STATUS_OPTIONS: {
  value: EvaluationStatus;
  label: string;
}[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'OPEN', label: 'Abierta' },
  { value: 'CLOSED', label: 'Cerrada' },
  { value: 'LOCKED', label: 'Bloqueada' },
];

interface EvaluationsPageProps {
  canCreateEvaluations: boolean;
  canEditEvaluations: boolean;
  canArchiveEvaluations: boolean;
  canCreateGradeStatuses: boolean;
  canEditGradeStatuses: boolean;
  canArchiveGradeStatuses: boolean;
}

interface EvaluationFormState {
  academicYearId: string;
  centreId: string;
  code: string;
  name: string;
  sequence: string;
  startsAt: string;
  endsAt: string;
  status: EvaluationStatus;
  remarks: string;
}

interface GradeStatusFormState {
  code: string;
  name: string;
  description: string;
  isEvaluable: boolean;
  countsAsPassed: boolean;
  countsAsNoShow: boolean;
  sortOrder: string;
  isActive: boolean;
}

function createEmptyEvaluationForm(): EvaluationFormState {
  return {
    academicYearId: '',
    centreId: '',
    code: '',
    name: '',
    sequence: '0',
    startsAt: '',
    endsAt: '',
    status: 'DRAFT',
    remarks: '',
  };
}

function createEmptyGradeStatusForm(): GradeStatusFormState {
  return {
    code: '',
    name: '',
    description: '',
    isEvaluable: false,
    countsAsPassed: false,
    countsAsNoShow: false,
    sortOrder: '0',
    isActive: true,
  };
}

function toDateInputValue(
  value: string | null,
): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
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

function formatEvaluationStatus(
  status: EvaluationStatus,
): string {
  if (status === 'DRAFT') {
    return 'Borrador';
  }

  if (status === 'OPEN') {
    return 'Abierta';
  }

  if (status === 'CLOSED') {
    return 'Cerrada';
  }

  return 'Bloqueada';
}

function formatPercentage(
  value: number | null,
): string {
  if (value === null) {
    return '—';
  }

  return `${value.toLocaleString(
    'es-ES',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}%`;
}

export function EvaluationsPage({
  canCreateEvaluations,
  canEditEvaluations,
  canArchiveEvaluations,
  canCreateGradeStatuses,
  canEditGradeStatuses,
  canArchiveGradeStatuses,
}: EvaluationsPageProps) {
  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([]);

  const [gradeStatuses, setGradeStatuses] =
    useState<GradeStatus[]>([]);

  const [academicYears, setAcademicYears] =
    useState<AcademicYear[]>([]);

  const [centres, setCentres] =
    useState<Centre[]>([]);

  const [evaluationPage, setEvaluationPage] =
    useState(1);

  const [evaluationTotalPages, setEvaluationTotalPages] =
    useState(1);

  const [evaluationStatusFilter, setEvaluationStatusFilter] =
    useState<EvaluationStatusFilter>('all');

  const [evaluationSearch, setEvaluationSearch] =
    useState('');

  const [gradeStatusFilter, setGradeStatusFilter] =
    useState<GradeStatusStatusFilter>('all');

  const [gradeStatusSearch, setGradeStatusSearch] =
    useState('');

  const [evaluationForm, setEvaluationForm] =
    useState<EvaluationFormState>(
      createEmptyEvaluationForm(),
    );

  const [gradeStatusForm, setGradeStatusForm] =
    useState<GradeStatusFormState>(
      createEmptyGradeStatusForm(),
    );

  const [editingEvaluationId, setEditingEvaluationId] =
    useState<number | null>(null);

  const [editingGradeStatusId, setEditingGradeStatusId] =
    useState<number | null>(null);

  const [evaluationStatistics, setEvaluationStatistics] =
    useState<EvaluationStatisticsResponse | null>(null);

  const [isLoadingStatistics, setIsLoadingStatistics] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [feedback, setFeedback] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function loadReferenceData(): Promise<void> {
    const [academicYearsResponse, centresResponse] =
      await Promise.all([
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
      ]);

    setAcademicYears(academicYearsResponse.items);
    setCentres(centresResponse.items);
  }

  async function loadEvaluations(): Promise<void> {
    const response = await getEvaluations({
      page: evaluationPage,
      pageSize: PAGE_SIZE,
      status: evaluationStatusFilter,
      search: evaluationSearch || undefined,
    });

    setEvaluations(response.items);
    setEvaluationTotalPages(
      response.pagination.totalPages,
    );
  }

  async function loadGradeStatuses(): Promise<void> {
    const response = await getGradeStatuses({
      page: 1,
      pageSize: 100,
      status: gradeStatusFilter,
      search: gradeStatusSearch || undefined,
    });

    setGradeStatuses(response.items);
  }

  async function reloadSelectedStatistics(): Promise<void> {
    if (!evaluationStatistics) {
      return;
    }

    const statistics =
      await getEvaluationStatistics(
        evaluationStatistics.evaluation.id,
      );

    setEvaluationStatistics(statistics);
  }

  useEffect(() => {
    async function loadInitialData(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        await loadReferenceData();
        await loadEvaluations();
        await loadGradeStatuses();
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  useEffect(() => {
    async function reloadEvaluations(): Promise<void> {
      try {
        await loadEvaluations();
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error));
      }
    }

    void reloadEvaluations();
  }, [evaluationPage, evaluationStatusFilter]);

  useEffect(() => {
    async function reloadGradeStatuses(): Promise<void> {
      try {
        await loadGradeStatuses();
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error));
      }
    }

    void reloadGradeStatuses();
  }, [gradeStatusFilter]);

  function resetEvaluationForm(): void {
    setEvaluationForm(createEmptyEvaluationForm());
    setEditingEvaluationId(null);
  }

  function resetGradeStatusForm(): void {
    setGradeStatusForm(createEmptyGradeStatusForm());
    setEditingGradeStatusId(null);
  }

  function startEditingEvaluation(
    evaluation: Evaluation,
  ): void {
    setEditingEvaluationId(evaluation.id);
    setEvaluationForm({
      academicYearId:
        evaluation.academicYearId.toString(),
      centreId: evaluation.centreId.toString(),
      code: evaluation.code,
      name: evaluation.name,
      sequence: evaluation.sequence.toString(),
      startsAt: toDateInputValue(
        evaluation.startsAt,
      ),
      endsAt: toDateInputValue(evaluation.endsAt),
      status: evaluation.status,
      remarks: evaluation.remarks ?? '',
    });
  }

  function startEditingGradeStatus(
    gradeStatus: GradeStatus,
  ): void {
    setEditingGradeStatusId(gradeStatus.id);
    setGradeStatusForm({
      code: gradeStatus.code,
      name: gradeStatus.name,
      description: gradeStatus.description ?? '',
      isEvaluable: gradeStatus.isEvaluable,
      countsAsPassed: gradeStatus.countsAsPassed,
      countsAsNoShow: gradeStatus.countsAsNoShow,
      sortOrder: gradeStatus.sortOrder.toString(),
      isActive: gradeStatus.isActive,
    });
  }

  async function handleEvaluationSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    try {
      const input = {
        academicYearId: Number(
          evaluationForm.academicYearId,
        ),
        centreId: Number(evaluationForm.centreId),
        code: evaluationForm.code,
        name: evaluationForm.name,
        sequence: Number(evaluationForm.sequence),
        startsAt:
          evaluationForm.startsAt || undefined,
        endsAt:
          evaluationForm.endsAt || undefined,
        status: evaluationForm.status,
        remarks:
          evaluationForm.remarks || undefined,
      };

      if (editingEvaluationId) {
        await updateEvaluation(
          editingEvaluationId,
          input,
        );
        setFeedback(
          'Evaluación actualizada correctamente.',
        );
      } else {
        await createEvaluation(input);
        setFeedback(
          'Evaluación creada correctamente.',
        );
      }

      resetEvaluationForm();
      await loadEvaluations();
      await reloadSelectedStatistics();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleGradeStatusSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    try {
      const input = {
        code: gradeStatusForm.code,
        name: gradeStatusForm.name,
        description:
          gradeStatusForm.description || undefined,
        isEvaluable: gradeStatusForm.isEvaluable,
        countsAsPassed:
          gradeStatusForm.countsAsPassed,
        countsAsNoShow:
          gradeStatusForm.countsAsNoShow,
        sortOrder: Number(
          gradeStatusForm.sortOrder,
        ),
        isActive: gradeStatusForm.isActive,
      };

      if (editingGradeStatusId) {
        await updateGradeStatus(
          editingGradeStatusId,
          input,
        );
        setFeedback(
          'Estado actualizado correctamente.',
        );
      } else {
        await createGradeStatus(input);
        setFeedback(
          'Estado creado correctamente.',
        );
      }

      resetGradeStatusForm();
      await loadGradeStatuses();
      await reloadSelectedStatistics();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleArchiveEvaluation(
    evaluation: Evaluation,
  ): Promise<void> {
    setErrorMessage(null);
    setFeedback(null);

    try {
      if (evaluation.deletedAt) {
        await restoreEvaluation(evaluation.id);
        setFeedback(
          'Evaluación restaurada correctamente.',
        );
      } else {
        await archiveEvaluation(evaluation.id);
        setFeedback(
          'Evaluación archivada correctamente.',
        );
      }

      await loadEvaluations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleCloseEvaluation(
    evaluation: Evaluation,
  ): Promise<void> {
    setErrorMessage(null);
    setFeedback(null);

    const confirmed = window.confirm(
      `¿Cerrar la evaluación "${evaluation.name}"? Las calificaciones quedarán bloqueadas.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await closeEvaluation(evaluation.id);
      setFeedback(
        'Evaluación cerrada correctamente.',
      );
      await loadEvaluations();
      await reloadSelectedStatistics();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleLockEvaluation(
    evaluation: Evaluation,
  ): Promise<void> {
    setErrorMessage(null);
    setFeedback(null);

    const confirmed = window.confirm(
      `¿Bloquear la evaluación "${evaluation.name}"? Esta acción impedirá cambios en las calificaciones.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await lockEvaluation(evaluation.id);
      setFeedback(
        'Evaluación bloqueada correctamente.',
      );
      await loadEvaluations();
      await reloadSelectedStatistics();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleReopenEvaluation(
    evaluation: Evaluation,
  ): Promise<void> {
    setErrorMessage(null);
    setFeedback(null);

    const confirmed = window.confirm(
      `¿Reabrir la evaluación "${evaluation.name}"? Las calificaciones volverán a poder modificarse.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await reopenEvaluation(evaluation.id);
      setFeedback(
        'Evaluación reabierta correctamente.',
      );
      await loadEvaluations();
      await reloadSelectedStatistics();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleShowStatistics(
    evaluation: Evaluation,
  ): Promise<void> {
    setErrorMessage(null);
    setFeedback(null);
    setIsLoadingStatistics(true);

    try {
      const statistics =
        await getEvaluationStatistics(
          evaluation.id,
        );

      setEvaluationStatistics(statistics);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingStatistics(false);
    }
  }

  async function handleArchiveGradeStatus(
    gradeStatus: GradeStatus,
  ): Promise<void> {
    setErrorMessage(null);
    setFeedback(null);

    try {
      if (gradeStatus.deletedAt) {
        await restoreGradeStatus(gradeStatus.id);
        setFeedback(
          'Estado restaurado correctamente.',
        );
      } else {
        await archiveGradeStatus(gradeStatus.id);
        setFeedback(
          'Estado archivado correctamente.',
        );
      }

      await loadGradeStatuses();
      await reloadSelectedStatistics();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  if (isLoading) {
    return (
      <main className="dashboard-content">
        <section className="info-card">
          <p>Cargando evaluaciones...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-content evaluations-page">
      {feedback && (
        <div className="alert alert-success">
          {feedback}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
        </div>
      )}

      <section className="evaluation-layout">
        <article className="info-card evaluation-card">
          <div className="section-header-row">
            <div>
              <p className="eyebrow">Periodos</p>
              <h2>Evaluaciones</h2>
            </div>
          </div>

          <form
            className="evaluation-form"
            onSubmit={(event) => {
              void handleEvaluationSubmit(event);
            }}
          >
            <div className="form-grid">
              <label>
                Curso académico
                <select
                  value={evaluationForm.academicYearId}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      academicYearId: event.target.value,
                    }));
                  }}
                  required
                >
                  <option value="">Selecciona curso</option>
                  {academicYears.map((year) => (
                    <option
                      key={year.id}
                      value={year.id}
                    >
                      {year.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Centro
                <select
                  value={evaluationForm.centreId}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      centreId: event.target.value,
                    }));
                  }}
                  required
                >
                  <option value="">Selecciona centro</option>
                  {centres.map((centre) => (
                    <option
                      key={centre.id}
                      value={centre.id}
                    >
                      {centre.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Código
                <input
                  value={evaluationForm.code}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }));
                  }}
                  placeholder="1EV"
                  required
                />
              </label>

              <label>
                Nombre
                <input
                  value={evaluationForm.name}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                  placeholder="Primera evaluación"
                  required
                />
              </label>

              <label>
                Orden
                <input
                  type="number"
                  min="0"
                  value={evaluationForm.sequence}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      sequence: event.target.value,
                    }));
                  }}
                />
              </label>

              <label>
                Estado
                <select
                  value={evaluationForm.status}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      status: event.target.value as EvaluationStatus,
                    }));
                  }}
                >
                  {EVALUATION_STATUS_OPTIONS.map((option) => (
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
                Inicio
                <input
                  type="date"
                  value={evaluationForm.startsAt}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }));
                  }}
                />
              </label>

              <label>
                Fin
                <input
                  type="date"
                  value={evaluationForm.endsAt}
                  onChange={(event) => {
                    setEvaluationForm((current) => ({
                      ...current,
                      endsAt: event.target.value,
                    }));
                  }}
                />
              </label>
            </div>

            <label>
              Observaciones
              <textarea
                value={evaluationForm.remarks}
                onChange={(event) => {
                  setEvaluationForm((current) => ({
                    ...current,
                    remarks: event.target.value,
                  }));
                }}
                rows={3}
              />
            </label>

            <div className="form-actions">
              {(canCreateEvaluations || editingEvaluationId) && (
                <button
                  className="button"
                  type="submit"
                >
                  {editingEvaluationId
                    ? 'Guardar evaluación'
                    : 'Crear evaluación'}
                </button>
              )}

              {editingEvaluationId && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={resetEvaluationForm}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          <div className="filters-row">
            <input
              placeholder="Buscar evaluación"
              value={evaluationSearch}
              onChange={(event) => {
                setEvaluationSearch(event.target.value);
              }}
            />

            <select
              value={evaluationStatusFilter}
              onChange={(event) => {
                setEvaluationStatusFilter(
                  event.target.value as EvaluationStatusFilter,
                );
                setEvaluationPage(1);
              }}
            >
              <option value="all">Todas</option>
              <option value="DRAFT">Borrador</option>
              <option value="OPEN">Abiertas</option>
              <option value="CLOSED">Cerradas</option>
              <option value="LOCKED">Bloqueadas</option>
              <option value="archived">Archivadas</option>
            </select>

            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setEvaluationPage(1);
                void loadEvaluations();
              }}
            >
              Buscar
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Evaluación</th>
                  <th>Curso</th>
                  <th>Centro</th>
                  <th>Estado</th>
                  <th>Fechas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td>{evaluation.code}</td>
                    <td>{evaluation.name}</td>
                    <td>{evaluation.academicYear.name}</td>
                    <td>{evaluation.centre.name}</td>
                    <td>{formatEvaluationStatus(evaluation.status)}</td>
                    <td>
                      {toDateInputValue(evaluation.startsAt) || '-'}
                      {' / '}
                      {toDateInputValue(evaluation.endsAt) || '-'}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="button button-small button-secondary"
                          type="button"
                          disabled={isLoadingStatistics}
                          onClick={() => {
                            void handleShowStatistics(evaluation);
                          }}
                        >
                          Estadísticas
                        </button>

                        {canEditEvaluations && !evaluation.deletedAt && (
                          <button
                            className="button button-small"
                            type="button"
                            onClick={() => {
                              startEditingEvaluation(evaluation);
                            }}
                          >
                            Editar
                          </button>
                        )}

                        {canEditEvaluations
                          && !evaluation.deletedAt
                          && evaluation.status === 'OPEN' && (
                            <button
                              className="button button-small button-secondary"
                              type="button"
                              onClick={() => {
                                void handleCloseEvaluation(evaluation);
                              }}
                            >
                              Cerrar
                            </button>
                          )}

                        {canEditEvaluations
                          && !evaluation.deletedAt
                          && evaluation.status === 'OPEN' && (
                            <button
                              className="button button-small button-secondary"
                              type="button"
                              onClick={() => {
                                void handleLockEvaluation(evaluation);
                              }}
                            >
                              Bloquear
                            </button>
                          )}

                        {canEditEvaluations
                          && !evaluation.deletedAt
                          && (
                            evaluation.status === 'CLOSED'
                            || evaluation.status === 'LOCKED'
                          ) && (
                            <button
                              className="button button-small button-secondary"
                              type="button"
                              onClick={() => {
                                void handleReopenEvaluation(evaluation);
                              }}
                            >
                              Reabrir
                            </button>
                          )}

                        {canArchiveEvaluations && (
                          <button
                            className="button button-small button-secondary"
                            type="button"
                            onClick={() => {
                              void handleArchiveEvaluation(evaluation);
                            }}
                          >
                            {evaluation.deletedAt
                              ? 'Restaurar'
                              : 'Archivar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-row">
            <button
              className="button button-secondary"
              type="button"
              disabled={evaluationPage <= 1}
              onClick={() => {
                setEvaluationPage((current) => current - 1);
              }}
            >
              Anterior
            </button>
            <span>
              Página {evaluationPage} de {evaluationTotalPages}
            </span>
            <button
              className="button button-secondary"
              type="button"
              disabled={evaluationPage >= evaluationTotalPages}
              onClick={() => {
                setEvaluationPage((current) => current + 1);
              }}
            >
              Siguiente
            </button>
          </div>

          {evaluationStatistics && (
            <section className="info-card">
              <p className="eyebrow">
                Estadísticas básicas
              </p>

              <h2>
                {evaluationStatistics.evaluation.code}
                {' · '}
                {evaluationStatistics.evaluation.name}
              </h2>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Matrículas modulares incluidas</td>
                      <td>
                        {evaluationStatistics.summary.totals.enrolled}
                      </td>
                    </tr>
                    <tr>
                      <td>Evaluadas numéricamente</td>
                      <td>
                        {evaluationStatistics.summary.totals.numericEvaluated}
                      </td>
                    </tr>
                    <tr>
                      <td>Aprobadas</td>
                      <td>
                        {evaluationStatistics.summary.totals.passed}
                      </td>
                    </tr>
                    <tr>
                      <td>Suspensas</td>
                      <td>
                        {evaluationStatistics.summary.totals.failed}
                      </td>
                    </tr>
                    <tr>
                      <td>No evaluadas numéricamente</td>
                      <td>
                        {evaluationStatistics.summary.totals.notNumericallyEvaluated}
                      </td>
                    </tr>
                    <tr>
                      <td>Sin registro de calificación</td>
                      <td>
                        {evaluationStatistics.summary.totals.withoutGradeRecord}
                      </td>
                    </tr>
                    <tr>
                      <td>Sin nota ni estado</td>
                      <td>
                        {evaluationStatistics.summary.totals.withoutNumericStatus}
                      </td>
                    </tr>
                    <tr>
                      <td>Tasa de éxito</td>
                      <td>
                        {formatPercentage(
                          evaluationStatistics.summary.rates.successRate,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Tasa de rendimiento</td>
                      <td>
                        {formatPercentage(
                          evaluationStatistics.summary.rates.performanceRate,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>Estados no numéricos</h3>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Estado</th>
                      <th>Total</th>
                      <th>Evaluable</th>
                      <th>Aprobado</th>
                      <th>No presentado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationStatistics.summary.nonNumericStatuses.length === 0
                      ? (
                        <tr>
                          <td colSpan={6}>
                            No hay estados no numéricos registrados.
                          </td>
                        </tr>
                      )
                      : evaluationStatistics.summary.nonNumericStatuses.map(
                        (status) => (
                          <tr key={status.code}>
                            <td>{status.code}</td>
                            <td>{status.name}</td>
                            <td>{status.total}</td>
                            <td>{status.isEvaluable ? 'Sí' : 'No'}</td>
                            <td>{status.countsAsPassed ? 'Sí' : 'No'}</td>
                            <td>{status.countsAsNoShow ? 'Sí' : 'No'}</td>
                          </tr>
                        ),
                      )}
                  </tbody>
                </table>
              </div>

              <h3>Desglose por módulo</h3>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th>Ciclo</th>
                      <th>Nivel</th>
                      <th>Matriculadas</th>
                      <th>Eval. numéricas</th>
                      <th>Aprobadas</th>
                      <th>Suspensas</th>
                      <th>Éxito</th>
                      <th>Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationStatistics.modules.length === 0
                      ? (
                        <tr>
                          <td colSpan={9}>
                            No hay matrículas modulares para esta evaluación.
                          </td>
                        </tr>
                      )
                      : evaluationStatistics.modules.map((item) => (
                        <tr key={item.module.id}>
                          <td>
                            {item.module.code}
                            {' · '}
                            {item.module.name}
                          </td>
                          <td>
                            {item.module.vocationalProgramme.acronym}
                          </td>
                          <td>
                            {item.module.academicLevel.name}
                          </td>
                          <td>
                            {item.statistics.totals.enrolled}
                          </td>
                          <td>
                            {item.statistics.totals.numericEvaluated}
                          </td>
                          <td>
                            {item.statistics.totals.passed}
                          </td>
                          <td>
                            {item.statistics.totals.failed}
                          </td>
                          <td>
                            {formatPercentage(
                              item.statistics.rates.successRate,
                            )}
                          </td>
                          <td>
                            {formatPercentage(
                              item.statistics.rates.performanceRate,
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="alert alert-success">
                Los estados no numéricos se muestran aparte y no se convierten
                en nota. La tasa de éxito usa solo calificaciones numéricas; la
                tasa de rendimiento usa las matrículas modulares incluidas.
              </div>
            </section>
          )}
        </article>

        <article className="info-card evaluation-card">
          <p className="eyebrow">Catálogo</p>
          <h2>Estados de calificación</h2>

          <form
            className="evaluation-form"
            onSubmit={(event) => {
              void handleGradeStatusSubmit(event);
            }}
          >
            <div className="form-grid">
              <label>
                Código
                <input
                  value={gradeStatusForm.code}
                  onChange={(event) => {
                    setGradeStatusForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }));
                  }}
                  placeholder="NE"
                  required
                />
              </label>

              <label>
                Nombre
                <input
                  value={gradeStatusForm.name}
                  onChange={(event) => {
                    setGradeStatusForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                  required
                />
              </label>

              <label>
                Orden
                <input
                  type="number"
                  min="0"
                  value={gradeStatusForm.sortOrder}
                  onChange={(event) => {
                    setGradeStatusForm((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }));
                  }}
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={gradeStatusForm.isActive}
                  onChange={(event) => {
                    setGradeStatusForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }));
                  }}
                />
                Activo
              </label>
            </div>

            <label>
              Descripción
              <textarea
                value={gradeStatusForm.description}
                onChange={(event) => {
                  setGradeStatusForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                rows={3}
              />
            </label>

            <div className="checkbox-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={gradeStatusForm.isEvaluable}
                  onChange={(event) => {
                    setGradeStatusForm((current) => ({
                      ...current,
                      isEvaluable: event.target.checked,
                    }));
                  }}
                />
                Cuenta como evaluado
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={gradeStatusForm.countsAsPassed}
                  onChange={(event) => {
                    setGradeStatusForm((current) => ({
                      ...current,
                      countsAsPassed: event.target.checked,
                    }));
                  }}
                />
                Cuenta como aprobado
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={gradeStatusForm.countsAsNoShow}
                  onChange={(event) => {
                    setGradeStatusForm((current) => ({
                      ...current,
                      countsAsNoShow: event.target.checked,
                    }));
                  }}
                />
                Cuenta como no presentado
              </label>
            </div>

            <div className="form-actions">
              {(canCreateGradeStatuses || editingGradeStatusId) && (
                <button
                  className="button"
                  type="submit"
                >
                  {editingGradeStatusId
                    ? 'Guardar estado'
                    : 'Crear estado'}
                </button>
              )}

              {editingGradeStatusId && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={resetGradeStatusForm}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          <div className="filters-row">
            <input
              placeholder="Buscar estado"
              value={gradeStatusSearch}
              onChange={(event) => {
                setGradeStatusSearch(event.target.value);
              }}
            />

            <select
              value={gradeStatusFilter}
              onChange={(event) => {
                setGradeStatusFilter(
                  event.target.value as GradeStatusStatusFilter,
                );
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="archived">Archivados</option>
            </select>

            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                void loadGradeStatuses();
              }}
            >
              Buscar
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Evaluado</th>
                  <th>Aprobado</th>
                  <th>NP</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gradeStatuses.map((status) => (
                  <tr key={status.id}>
                    <td>{status.code}</td>
                    <td>{status.name}</td>
                    <td>{status.isEvaluable ? 'Sí' : 'No'}</td>
                    <td>{status.countsAsPassed ? 'Sí' : 'No'}</td>
                    <td>{status.countsAsNoShow ? 'Sí' : 'No'}</td>
                    <td>{status.isActive ? 'Sí' : 'No'}</td>
                    <td>
                      <div className="table-actions">
                        {canEditGradeStatuses && !status.deletedAt && (
                          <button
                            className="button button-small"
                            type="button"
                            onClick={() => {
                              startEditingGradeStatus(status);
                            }}
                          >
                            Editar
                          </button>
                        )}

                        {canArchiveGradeStatuses && (
                          <button
                            className="button button-small button-secondary"
                            type="button"
                            onClick={() => {
                              void handleArchiveGradeStatus(status);
                            }}
                          >
                            {status.deletedAt
                              ? 'Restaurar'
                              : 'Archivar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
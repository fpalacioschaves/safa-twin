import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  AssessmentScheme,
} from '../types/assessment-schemes';

import type {
  Enrolment,
} from '../types/enrolments';

import type {
  Evaluation,
  GradeStatus,
} from '../types/evaluations';

import type {
  Grade,
  GradeStatusFilter,
} from '../types/grades';

import {
  getAssessmentSchemes,
} from '../services/assessment-schemes.service';

import {
  getEnrolments,
} from '../services/enrolments.service';

import {
  getEvaluations,
  getGradeStatuses,
} from '../services/evaluations.service';

import {
  ApiError,
} from '../services/api.service';

import {
  archiveGrade,
  createGrade,
  getGrades,
  restoreGrade,
} from '../services/grades.service';

import './GradesPage.css';

interface ComponentScoreState {
  score: string;
  isMissing: boolean;
  remarks: string;
}

const emptyComponentScore:
ComponentScoreState = {
  score: '',
  isMissing: false,
  remarks: '',
};

function formatStudent(
  enrolment: Enrolment,
): string {
  const studentCode =
    enrolment.student.studentCode
      ? ` · ${enrolment.student.studentCode}`
      : '';

  return `${enrolment.student.fullName}${studentCode}`;
}

function formatEnrolment(
  enrolment: Enrolment,
): string {
  return `${formatStudent(enrolment)} · ${enrolment.module.code} · ${enrolment.module.name}`;
}

function formatGradeValue(
  grade: number | null,
): string {
  if (grade === null) {
    return '—';
  }

  return grade.toLocaleString(
    'es-ES',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function getApiErrorMessage(
  error: unknown,
): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Se ha producido un error inesperado.';
}

export function GradesPage() {
  const [
    evaluations,
    setEvaluations,
  ] = useState<Evaluation[]>([]);

  const [
    enrolments,
    setEnrolments,
  ] = useState<Enrolment[]>([]);

  const [
    gradeStatuses,
    setGradeStatuses,
  ] = useState<GradeStatus[]>([]);

  const [
    assessmentSchemes,
    setAssessmentSchemes,
  ] = useState<AssessmentScheme[]>([]);

  const [
    grades,
    setGrades,
  ] = useState<Grade[]>([]);

  const [
    selectedEvaluationId,
    setSelectedEvaluationId,
  ] = useState('');

  const [
    selectedEnrolmentId,
    setSelectedEnrolmentId,
  ] = useState('');

  const [
    selectedGradeStatusId,
    setSelectedGradeStatusId,
  ] = useState('');

  const [
    remarks,
    setRemarks,
  ] = useState('');

  const [
    componentScores,
    setComponentScores,
  ] = useState<Record<string, ComponentScoreState>>({});

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<GradeStatusFilter>('active');

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<string | null>(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const selectedEnrolment =
    useMemo(
      () =>
        enrolments.find(
          (enrolment) =>
            enrolment.id
            === Number(selectedEnrolmentId),
        ) ?? null,
      [
        enrolments,
        selectedEnrolmentId,
      ],
    );

  const selectedAssessmentScheme =
    useMemo(
      () => {
        if (!selectedEnrolment) {
          return null;
        }

        return assessmentSchemes.find(
          (assessmentScheme) =>
            assessmentScheme.academicYearId
              === selectedEnrolment.academicYearId
            && assessmentScheme.centreId
              === selectedEnrolment.centreId
            && assessmentScheme.moduleId
              === selectedEnrolment.moduleId
            && assessmentScheme.isActive
            && assessmentScheme.deletedAt === null,
        ) ?? null;
      },
      [
        assessmentSchemes,
        selectedEnrolment,
      ],
    );

  const selectedGradeStatus =
    useMemo(
      () =>
        gradeStatuses.find(
          (gradeStatus) =>
            gradeStatus.id
            === Number(selectedGradeStatusId),
        ) ?? null,
      [
        gradeStatuses,
        selectedGradeStatusId,
      ],
    );

  const componentPreview =
    useMemo(
      () => {
        if (!selectedAssessmentScheme) {
          return {
            finalGrade: null,
            isComplete: false,
          };
        }

        if (
          selectedGradeStatus
          && !selectedGradeStatus.isEvaluable
        ) {
          return {
            finalGrade: null,
            isComplete: true,
          };
        }

        let isComplete = true;

        const finalGrade =
          selectedAssessmentScheme.components.reduce(
            (total, component) => {
              const componentState =
                componentScores[String(component.id)]
                ?? emptyComponentScore;

              const score =
                componentState.score === ''
                  ? Number.NaN
                  : Number(componentState.score);

              if (
                component.isRequired
                && (
                  Number.isNaN(score)
                  || componentState.isMissing
                )
              ) {
                isComplete = false;
              }

              if (
                Number.isNaN(score)
                || componentState.isMissing
              ) {
                return total;
              }

              return total
                + (
                  score
                  * component.percentage
                  / 100
                );
            },
            0,
          );

        return {
          finalGrade:
            Math.round(finalGrade * 100) / 100,
          isComplete,
        };
      },
      [
        componentScores,
        selectedAssessmentScheme,
        selectedGradeStatus,
      ],
    );

  async function loadAuxiliaryData():
  Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const [
        evaluationsResponse,
        enrolmentsResponse,
        gradeStatusesResponse,
        assessmentSchemesResponse,
      ] = await Promise.all([
        getEvaluations({
          page: 1,
          pageSize: 50,
          status: 'all',
        }),
        getEnrolments({
          page: 1,
          pageSize: 50,
          status: 'ENROLLED',
        }),
        getGradeStatuses({
          page: 1,
          pageSize: 50,
          status: 'active',
        }),
        getAssessmentSchemes({
          page: 1,
          pageSize: 50,
          status: 'active',
          dual: 'all',
        }),
      ]);

      setEvaluations(
        evaluationsResponse.items,
      );
      setEnrolments(
        enrolmentsResponse.items,
      );
      setGradeStatuses(
        gradeStatusesResponse.items,
      );
      setAssessmentSchemes(
        assessmentSchemesResponse.items,
      );
    } catch (caughtError: unknown) {
      setError(
        getApiErrorMessage(caughtError),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadGrades():
  Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const gradesResponse =
        await getGrades({
          page: 1,
          pageSize: 50,
          status: statusFilter,
          search: search || undefined,
          evaluationId:
            selectedEvaluationId
              ? Number(selectedEvaluationId)
              : undefined,
          enrolmentId:
            selectedEnrolmentId
              ? Number(selectedEnrolmentId)
              : undefined,
        });

      setGrades(gradesResponse.items);
    } catch (caughtError: unknown) {
      setError(
        getApiErrorMessage(caughtError),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAuxiliaryData();
  }, []);

  useEffect(() => {
    void loadGrades();
  }, [
    statusFilter,
  ]);

  useEffect(() => {
    if (!selectedAssessmentScheme) {
      setComponentScores({});
      return;
    }

    setComponentScores((current) => {
      const next:
      Record<string, ComponentScoreState> = {};

      for (const component of selectedAssessmentScheme.components) {
        next[String(component.id)] =
          current[String(component.id)]
          ?? {
            ...emptyComponentScore,
          };
      }

      return next;
    });
  }, [
    selectedAssessmentScheme,
  ]);

  async function handleCreateGrade():
  Promise<void> {
    setMessage(null);
    setError(null);

    if (!selectedEvaluationId) {
      setError(
        'Selecciona una evaluación.',
      );
      return;
    }

    if (!selectedEnrolmentId) {
      setError(
        'Selecciona una matrícula.',
      );
      return;
    }

    if (!selectedAssessmentScheme) {
      setError(
        'La matrícula seleccionada no tiene un sistema de calificación activo.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const componentScoreInput =
        selectedAssessmentScheme.components.map(
          (component) => {
            const state =
              componentScores[String(component.id)]
              ?? emptyComponentScore;

            return {
              assessmentComponentId:
                component.id,
              score:
                state.score === ''
                  ? undefined
                  : Number(state.score),
              isMissing:
                state.isMissing,
              remarks:
                state.remarks || undefined,
            };
          },
        );

      const response =
        await createGrade({
          evaluationId:
            Number(selectedEvaluationId),
          enrolmentId:
            Number(selectedEnrolmentId),
          assessmentSchemeId:
            selectedAssessmentScheme.id,
          gradeStatusId:
            selectedGradeStatusId
              ? Number(selectedGradeStatusId)
              : undefined,
          remarks: remarks || undefined,
          componentScores:
            componentScoreInput,
        });

      setMessage(response.message);
      setRemarks('');
      setSelectedGradeStatusId('');
      setComponentScores({});
      await loadGrades();
    } catch (caughtError: unknown) {
      setError(
        getApiErrorMessage(caughtError),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveGrade(
    gradeId: number,
  ): Promise<void> {
    setMessage(null);
    setError(null);

    try {
      const response =
        await archiveGrade(gradeId);

      setMessage(response.message);
      await loadGrades();
    } catch (caughtError: unknown) {
      setError(
        getApiErrorMessage(caughtError),
      );
    }
  }

  async function handleRestoreGrade(
    gradeId: number,
  ): Promise<void> {
    setMessage(null);
    setError(null);

    try {
      const response =
        await restoreGrade(gradeId);

      setMessage(response.message);
      await loadGrades();
    } catch (caughtError: unknown) {
      setError(
        getApiErrorMessage(caughtError),
      );
    }
  }

  return (
    <main className="grades-page">
      <section className="grades-hero">
        <div>
          <p className="eyebrow">
            Evaluación académica
          </p>

          <h2>
            Calificaciones por matrícula
          </h2>

          <p>
            Registra notas sobre matrículas
            modulares concretas. La nota final se
            calcula desde el sistema de
            calificación del módulo.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={isLoading}
          onClick={() => {
            void loadGrades();
          }}
        >
          Actualizar
        </button>
      </section>

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <section className="grades-layout">
        <article className="grades-card">
          <p className="eyebrow">
            Nueva calificación
          </p>

          <h3>
            Registro de nota
          </h3>

          <div className="grades-form-grid">
            <label>
              Evaluación
              <select
                value={selectedEvaluationId}
                onChange={(event) => {
                  setSelectedEvaluationId(
                    event.target.value,
                  );
                }}
              >
                <option value="">
                  Selecciona evaluación
                </option>

                {evaluations.map(
                  (evaluation) => (
                    <option
                      value={evaluation.id}
                      key={evaluation.id}
                    >
                      {evaluation.code} · {evaluation.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Matrícula
              <select
                value={selectedEnrolmentId}
                onChange={(event) => {
                  setSelectedEnrolmentId(
                    event.target.value,
                  );
                }}
              >
                <option value="">
                  Selecciona matrícula
                </option>

                {enrolments.map(
                  (enrolment) => (
                    <option
                      value={enrolment.id}
                      key={enrolment.id}
                    >
                      {formatEnrolment(enrolment)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Estado no numérico
              <select
                value={selectedGradeStatusId}
                onChange={(event) => {
                  setSelectedGradeStatusId(
                    event.target.value,
                  );
                }}
              >
                <option value="">
                  Nota numérica
                </option>

                {gradeStatuses.map(
                  (gradeStatus) => (
                    <option
                      value={gradeStatus.id}
                      key={gradeStatus.id}
                    >
                      {gradeStatus.code} · {gradeStatus.name}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {selectedAssessmentScheme && (
            <div className="scheme-summary">
              <strong>
                Sistema:
              </strong>{' '}
              {selectedAssessmentScheme.name}
              {' · '}
              {selectedAssessmentScheme.isDual
                ? 'Dualizado'
                : 'No dualizado'}
            </div>
          )}

          {!selectedAssessmentScheme
            && selectedEnrolment && (
              <div className="alert alert-error">
                No hay sistema de calificación
                activo para esta matrícula.
              </div>
            )}

          {selectedAssessmentScheme && (
            <div className="component-score-list">
              {selectedAssessmentScheme.components.map(
                (component) => {
                  const state =
                    componentScores[String(component.id)]
                    ?? emptyComponentScore;

                  return (
                    <div
                      className="component-score-row"
                      key={component.id}
                    >
                      <div>
                        <strong>
                          {component.name}
                        </strong>

                        <span>
                          {component.percentage}% · {component.type}
                        </span>
                      </div>

                      <label>
                        Nota
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          value={state.score}
                          disabled={
                            state.isMissing
                          }
                          onChange={(event) => {
                            setComponentScores(
                              (current) => ({
                                ...current,
                                [String(component.id)]: {
                                  ...state,
                                  score:
                                    event.target.value,
                                },
                              }),
                            );
                          }}
                        />
                      </label>

                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={state.isMissing}
                          onChange={(event) => {
                            setComponentScores(
                              (current) => ({
                                ...current,
                                [String(component.id)]: {
                                  ...state,
                                  isMissing:
                                    event.target.checked,
                                  score:
                                    event.target.checked
                                      ? ''
                                      : state.score,
                                },
                              }),
                            );
                          }}
                        />
                        No presentado
                      </label>
                    </div>
                  );
                },
              )}
            </div>
          )}

          <div className="grade-preview">
            <span>
              Vista previa
            </span>

            <strong>
              {selectedGradeStatus
                && !selectedGradeStatus.isEvaluable
                ? selectedGradeStatus.code
                : formatGradeValue(
                  componentPreview.isComplete
                    ? componentPreview.finalGrade
                    : null,
                )}
            </strong>
          </div>

          <label>
            Observaciones
            <textarea
              value={remarks}
              onChange={(event) => {
                setRemarks(event.target.value);
              }}
            />
          </label>

          <button
            className="button button-primary"
            type="button"
            disabled={isSaving}
            onClick={() => {
              void handleCreateGrade();
            }}
          >
            {isSaving
              ? 'Guardando...'
              : 'Guardar calificación'}
          </button>
        </article>

        <article className="grades-card">
          <p className="eyebrow">
            Consulta
          </p>

          <h3>
            Calificaciones registradas
          </h3>

          <div className="grades-filter-grid">
            <label>
              Buscar
              <input
                value={search}
                placeholder="Alumno, documento, módulo, evaluación..."
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
            </label>

            <label>
              Estado
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target.value as GradeStatusFilter,
                  );
                }}
              >
                <option value="active">
                  Activas
                </option>
                <option value="archived">
                  Archivadas
                </option>
                <option value="all">
                  Todas
                </option>
              </select>
            </label>

            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                void loadGrades();
              }}
            >
              Buscar
            </button>
          </div>

          <div className="grades-table-wrapper">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Módulo</th>
                  <th>Evaluación</th>
                  <th>Estado</th>
                  <th>Nota</th>
                  <th>Resultado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {grades.length === 0
                  ? (
                    <tr>
                      <td colSpan={7}>
                        No hay calificaciones registradas.
                      </td>
                    </tr>
                  )
                  : grades.map((grade) => (
                    <tr key={grade.id}>
                      <td>
                        {grade.enrolment.student.fullName}
                      </td>

                      <td>
                        {grade.enrolment.module.code}
                        {' · '}
                        {grade.enrolment.module.name}
                      </td>

                      <td>
                        {grade.evaluation.code}
                      </td>

                      <td>
                        {grade.gradeStatus
                          ? grade.gradeStatus.code
                          : 'Numérica'}
                      </td>

                      <td>
                        {formatGradeValue(
                          grade.finalGrade,
                        )}
                      </td>

                      <td>
                        {grade.isPassed === null
                          ? '—'
                          : grade.isPassed
                            ? 'Aprobado'
                            : 'Suspenso'}
                      </td>

                      <td>
                        {grade.deletedAt
                          ? (
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => {
                                void handleRestoreGrade(
                                  grade.id,
                                );
                              }}
                            >
                              Restaurar
                            </button>
                          )
                          : (
                            <button
                              className="button button-danger"
                              type="button"
                              onClick={() => {
                                void handleArchiveGrade(
                                  grade.id,
                                );
                              }}
                            >
                              Archivar
                            </button>
                          )}
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

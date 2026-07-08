import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  archiveCurriculumEvaluationCriterion,
  createCurriculumEvaluationCriterion,
  getCurriculumLearningOutcomes,
  restoreCurriculumEvaluationCriterion,
  updateCurriculumEvaluationCriterion,
} from '../services/curriculum.service';

import type {
  CurriculumEvaluationCriterionItem,
  CurriculumEvaluationCriterionMutationRequest,
  CurriculumLearningOutcomeItem,
} from '../types/curriculum';

import './EvaluationCriterionManager.css';

interface EvaluationCriterionFormState {
  learningOutcomeId: string;
  code: string;
  title: string;
  description: string;
  sourceReference: string;
  sortOrder: string;
  isActive: boolean;
}

interface EvaluationCriterionManagerProps {
  evaluationCriteria: CurriculumEvaluationCriterionItem[];
  onChanged: () => Promise<void> | void;
}

const EMPTY_FORM: EvaluationCriterionFormState = {
  learningOutcomeId: '',
  code: '',
  title: '',
  description: '',
  sourceReference: '',
  sortOrder: '0',
  isActive: true,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detailText = error.details
      .map((detail) => `${detail.field}: ${detail.message}`)
      .join(' · ');

    return detailText
      ? `${error.message} ${detailText}`
      : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Se ha producido un error inesperado.';
}

function getLearningOutcomeOptionLabel(
  item: CurriculumLearningOutcomeItem,
): string {
  return `${item.module.vocationalProgramme.acronym} · ${item.module.academicLevel.name} · ${item.module.code} · ${item.code} · ${item.title}`;
}

function getCriterionContextLabel(
  item: CurriculumEvaluationCriterionItem,
): string {
  return `${item.module.vocationalProgramme.acronym} · ${item.module.academicLevel.name} · ${item.module.code} · ${item.learningOutcome.code}`;
}

function mapItemToForm(
  item: CurriculumEvaluationCriterionItem,
): EvaluationCriterionFormState {
  return {
    learningOutcomeId: item.learningOutcomeId.toString(),
    code: item.code,
    title: item.title,
    description: item.description ?? '',
    sourceReference: item.sourceReference ?? '',
    sortOrder: item.sortOrder.toString(),
    isActive: item.isActive,
  };
}

function buildRequest(
  form: EvaluationCriterionFormState,
): CurriculumEvaluationCriterionMutationRequest {
  return {
    learningOutcomeId: Number(form.learningOutcomeId),
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    sourceReference: form.sourceReference.trim() || undefined,
    sortOrder: Number(form.sortOrder || 0),
    isActive: form.isActive,
  };
}

async function loadAllLearningOutcomes(): Promise<CurriculumLearningOutcomeItem[]> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const items: CurriculumLearningOutcomeItem[] = [];

  do {
    const result = await getCurriculumLearningOutcomes({
      page,
      pageSize,
      status: 'active',
    });

    items.push(...result.items);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function EvaluationCriterionManager({
  evaluationCriteria,
  onChanged,
}: EvaluationCriterionManagerProps) {
  const [learningOutcomeOptions, setLearningOutcomeOptions] =
    useState<CurriculumLearningOutcomeItem[]>([]);

  const [form, setForm] =
    useState<EvaluationCriterionFormState>(EMPTY_FORM);

  const [editingItem, setEditingItem] =
    useState<CurriculumEvaluationCriterionItem | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isLoadingOptions, setIsLoadingOptions] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function refreshLearningOutcomeOptions(): Promise<void> {
    setIsLoadingOptions(true);

    try {
      setLearningOutcomeOptions(await loadAllLearningOutcomes());
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoadingOptions(false);
    }
  }

  useEffect(() => {
    void refreshLearningOutcomeOptions();
  }, []);

  function resetForm(): void {
    setForm(EMPTY_FORM);
    setEditingItem(null);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const request = buildRequest(form);

      const result = editingItem
        ? await updateCurriculumEvaluationCriterion(
          editingItem.id,
          request,
        )
        : await createCurriculumEvaluationCriterion(request);

      setMessage(result.message);
      setForm(EMPTY_FORM);
      setEditingItem(null);
      await onChanged();
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(
    item: CurriculumEvaluationCriterionItem,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Archivar ${item.code} · ${item.title}?`,
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await archiveCurriculumEvaluationCriterion(
        item.id,
      );

      setMessage(result.message);
      await onChanged();
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore(
    item: CurriculumEvaluationCriterionItem,
  ): Promise<void> {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await restoreCurriculumEvaluationCriterion(
        item.id,
      );

      setMessage(result.message);
      await onChanged();
    } catch (restoreError: unknown) {
      setError(getErrorMessage(restoreError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="evaluation-criterion-manager">
      <div className="evaluation-criterion-manager-header">
        <div>
          <p className="eyebrow">Gestión manual</p>
          <h4>
            {editingItem
              ? `Editando ${editingItem.code}`
              : 'Crear Criterio de Evaluación'}
          </h4>
          <p>
            Cada criterio se vincula a un Resultado de Aprendizaje. No se
            permite crear criterios sueltos sin RA padre.
          </p>
        </div>

        {editingItem ? (
          <button
            className="button button-secondary"
            type="button"
            disabled={isSaving}
            onClick={resetForm}
          >
            Cancelar edición
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="alert alert-success">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : null}

      <form
        className="evaluation-criterion-form"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label className="evaluation-criterion-form-wide">
          Resultado de Aprendizaje padre
          <select
            required
            value={form.learningOutcomeId}
            disabled={isSaving || isLoadingOptions}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                learningOutcomeId: event.target.value,
              }));
            }}
          >
            <option value="">
              {isLoadingOptions
                ? 'Cargando RA...'
                : 'Selecciona RA'}
            </option>
            {learningOutcomeOptions.map((learningOutcome) => (
              <option
                key={learningOutcome.id}
                value={learningOutcome.id}
              >
                {getLearningOutcomeOptionLabel(learningOutcome)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Código CA
          <input
            required
            type="text"
            maxLength={50}
            placeholder="CAA"
            value={form.code}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                code: event.target.value,
              }));
            }}
          />
        </label>

        <label>
          Orden
          <input
            required
            type="number"
            min={0}
            max={9999}
            value={form.sortOrder}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                sortOrder: event.target.value,
              }));
            }}
          />
        </label>

        <label className="evaluation-criterion-form-wide">
          Título
          <input
            required
            type="text"
            maxLength={255}
            placeholder="Se han identificado..., se ha aplicado..., se ha comprobado..."
            value={form.title}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                title: event.target.value,
              }));
            }}
          />
        </label>

        <label className="evaluation-criterion-form-wide">
          Descripción
          <textarea
            rows={3}
            value={form.description}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }));
            }}
          />
        </label>

        <label className="evaluation-criterion-form-wide">
          Fuente
          <input
            type="text"
            maxLength={255}
            placeholder="BOE-A-2010-9269, programación didáctica, Séneca..."
            value={form.sourceReference}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                sourceReference: event.target.value,
              }));
            }}
          />
        </label>

        <label className="evaluation-criterion-checkbox">
          <input
            type="checkbox"
            checked={form.isActive}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                isActive: event.target.checked,
              }));
            }}
          />
          Activo
        </label>

        <div className="evaluation-criterion-form-actions">
          <button
            className="button button-primary"
            type="submit"
            disabled={isSaving || isLoadingOptions}
          >
            {isSaving
              ? 'Guardando...'
              : editingItem
                ? 'Guardar cambios'
                : 'Crear CA'}
          </button>

          <button
            className="button button-secondary"
            type="button"
            disabled={isSaving}
            onClick={resetForm}
          >
            Limpiar
          </button>
        </div>
      </form>

      <div className="evaluation-criterion-manager-list">
        <h5>CA visibles en la consulta actual</h5>

        {evaluationCriteria.length === 0 ? (
          <p>
            No hay CA visibles con los filtros actuales.
          </p>
        ) : (
          evaluationCriteria.map((item) => (
            <article
              className="evaluation-criterion-manager-item"
              key={item.id}
            >
              <div>
                <strong>
                  {item.code} · {item.title}
                </strong>
                <span>
                  {getCriterionContextLabel(item)} · {item.deletedAt
                    ? 'Archivado'
                    : item.isActive
                      ? 'Activo'
                      : 'Inactivo'}
                </span>
              </div>

              <div className="evaluation-criterion-manager-item-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setEditingItem(item);
                    setForm(mapItemToForm(item));
                    setError(null);
                    setMessage(null);
                  }}
                >
                  Editar
                </button>

                {item.deletedAt ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      void handleRestore(item);
                    }}
                  >
                    Restaurar
                  </button>
                ) : (
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      void handleArchive(item);
                    }}
                  >
                    Archivar
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

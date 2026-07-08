import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  archiveCurriculumTrainingAction,
  createCurriculumTrainingAction,
  getCurriculumLearningOutcomes,
  restoreCurriculumTrainingAction,
  updateCurriculumTrainingAction,
} from '../services/curriculum.service';

import type {
  CurriculumLearningOutcomeItem,
  CurriculumTrainingActionItem,
  CurriculumTrainingActionMutationRequest,
} from '../types/curriculum';

import type {
  ProfessionalModule,
} from '../types/modules';

import './TrainingActionManager.css';

interface TrainingActionFormState {
  moduleId: string;
  code: string;
  title: string;
  description: string;
  plannedHours: string;
  sourceReference: string;
  sortOrder: string;
  isActive: boolean;
  relatedLearningOutcomeIds: string[];
}

interface TrainingActionManagerProps {
  moduleOptions: ProfessionalModule[];
  trainingActions: CurriculumTrainingActionItem[];
  onChanged: () => Promise<void> | void;
}

const EMPTY_FORM: TrainingActionFormState = {
  moduleId: '',
  code: '',
  title: '',
  description: '',
  plannedHours: '',
  sourceReference: '',
  sortOrder: '0',
  isActive: true,
  relatedLearningOutcomeIds: [],
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

function getModuleOptionLabel(
  module: ProfessionalModule,
): string {
  return `${module.vocationalProgramme.acronym} · ${module.academicLevel.name} · ${module.code} · ${module.name}`;
}

function getLearningOutcomeOptionLabel(
  item: CurriculumLearningOutcomeItem,
): string {
  return `${item.code} · ${item.title}`;
}

function getTrainingActionContextLabel(
  item: CurriculumTrainingActionItem,
): string {
  return `${item.module.vocationalProgramme.acronym} · ${item.module.academicLevel.name} · ${item.module.code}`;
}

function getSelectedOptionValues(
  select: HTMLSelectElement,
): string[] {
  return Array.from(select.selectedOptions)
    .map((option) => option.value);
}

function mapItemToForm(
  item: CurriculumTrainingActionItem,
): TrainingActionFormState {
  return {
    moduleId: item.moduleId.toString(),
    code: item.code,
    title: item.title,
    description: item.description ?? '',
    plannedHours: item.plannedHours === null
      ? ''
      : item.plannedHours.toString(),
    sourceReference: item.sourceReference ?? '',
    sortOrder: item.sortOrder.toString(),
    isActive: item.isActive,
    relatedLearningOutcomeIds: item.relatedLearningOutcomes.map(
      (learningOutcome) => learningOutcome.id.toString(),
    ),
  };
}

function buildRequest(
  form: TrainingActionFormState,
): CurriculumTrainingActionMutationRequest {
  return {
    moduleId: Number(form.moduleId),
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    plannedHours: form.plannedHours.trim()
      ? Number(form.plannedHours)
      : undefined,
    sourceReference: form.sourceReference.trim() || undefined,
    sortOrder: Number(form.sortOrder || 0),
    isActive: form.isActive,
    relatedLearningOutcomeIds: form.relatedLearningOutcomeIds
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0),
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

function filterLearningOutcomesByModule(
  learningOutcomes: CurriculumLearningOutcomeItem[],
  moduleId: string,
): CurriculumLearningOutcomeItem[] {
  if (!moduleId) {
    return [];
  }

  const selectedModuleId = Number(moduleId);

  return learningOutcomes.filter(
    (learningOutcome) => learningOutcome.moduleId === selectedModuleId,
  );
}

export function TrainingActionManager({
  moduleOptions,
  trainingActions,
  onChanged,
}: TrainingActionManagerProps) {
  const [learningOutcomeOptions, setLearningOutcomeOptions] =
    useState<CurriculumLearningOutcomeItem[]>([]);

  const [form, setForm] =
    useState<TrainingActionFormState>(EMPTY_FORM);

  const [editingItem, setEditingItem] =
    useState<CurriculumTrainingActionItem | null>(null);

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
        ? await updateCurriculumTrainingAction(
          editingItem.id,
          request,
        )
        : await createCurriculumTrainingAction(request);

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
    item: CurriculumTrainingActionItem,
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
      const result = await archiveCurriculumTrainingAction(
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
    item: CurriculumTrainingActionItem,
  ): Promise<void> {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await restoreCurriculumTrainingAction(
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

  const filteredLearningOutcomes = filterLearningOutcomesByModule(
    learningOutcomeOptions,
    form.moduleId,
  );

  return (
    <section className="training-action-manager">
      <div className="training-action-manager-header">
        <div>
          <p className="eyebrow">Gestión manual</p>
          <h4>
            {editingItem
              ? `Editando ${editingItem.code}`
              : 'Crear Acción Formativa'}
          </h4>
          <p>
            Cada AF se vincula a un módulo profesional. Sus RA relacionados
            deben pertenecer al mismo módulo para evitar mezclas curriculares.
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
        className="training-action-form"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label className="training-action-form-wide">
          Módulo profesional
          <select
            required
            value={form.moduleId}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                moduleId: event.target.value,
                relatedLearningOutcomeIds: [],
              }));
            }}
          >
            <option value="">Selecciona módulo</option>
            {moduleOptions.map((module) => (
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
          Código AF
          <input
            required
            type="text"
            maxLength={50}
            placeholder="AF1"
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
          Horas previstas
          <input
            type="number"
            min={0.01}
            max={9999.99}
            step="0.01"
            value={form.plannedHours}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                plannedHours: event.target.value,
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

        <label className="training-action-form-wide">
          Título
          <input
            required
            type="text"
            maxLength={191}
            placeholder="Actividad formativa, proyecto, seguimiento, evaluación..."
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

        <label className="training-action-form-wide">
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

        <label className="training-action-form-wide">
          RA relacionados
          <select
            multiple
            value={form.relatedLearningOutcomeIds}
            disabled={isSaving || isLoadingOptions || !form.moduleId}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                relatedLearningOutcomeIds:
                  getSelectedOptionValues(event.currentTarget),
              }));
            }}
          >
            {filteredLearningOutcomes.map((learningOutcome) => (
              <option
                key={learningOutcome.id}
                value={learningOutcome.id}
              >
                {getLearningOutcomeOptionLabel(learningOutcome)}
              </option>
            ))}
          </select>
          <span>
            Mantén pulsada la tecla Ctrl para seleccionar varios RA.
          </span>
        </label>

        <label className="training-action-form-wide">
          Fuente
          <input
            type="text"
            maxLength={255}
            placeholder="Plan dual, programación didáctica, Séneca..."
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

        <label className="training-action-checkbox">
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
          Activa
        </label>

        <div className="training-action-form-actions">
          <button
            className="button button-primary"
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? 'Guardando...'
              : editingItem
                ? 'Guardar cambios'
                : 'Crear AF'}
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

      <div className="training-action-manager-list">
        <h5>AF visibles en la consulta actual</h5>

        {trainingActions.length === 0 ? (
          <p>
            No hay AF visibles con los filtros actuales.
          </p>
        ) : (
          trainingActions.map((item) => (
            <article
              className="training-action-manager-item"
              key={item.id}
            >
              <div>
                <strong>
                  {item.code} · {item.title}
                </strong>
                <span>
                  {getTrainingActionContextLabel(item)} · {item.deletedAt
                    ? 'Archivada'
                    : item.isActive
                      ? 'Activa'
                      : 'Inactiva'} · RA: {item.relatedLearningOutcomes.length === 0
                    ? 'sin relación'
                    : item.relatedLearningOutcomes
                      .map((learningOutcome) => learningOutcome.code)
                      .join(', ')}
                </span>
              </div>

              <div className="training-action-manager-item-actions">
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

import {
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  archiveCurriculumLearningOutcome,
  createCurriculumLearningOutcome,
  restoreCurriculumLearningOutcome,
  updateCurriculumLearningOutcome,
} from '../services/curriculum.service';

import type {
  CurriculumLearningOutcomeItem,
  CurriculumLearningOutcomeMutationRequest,
} from '../types/curriculum';

import type {
  ProfessionalModule,
} from '../types/modules';

import './LearningOutcomeManager.css';

interface LearningOutcomeFormState {
  moduleId: string;
  code: string;
  title: string;
  description: string;
  sourceReference: string;
  sortOrder: string;
  isActive: boolean;
}

interface LearningOutcomeManagerProps {
  moduleOptions: ProfessionalModule[];
  learningOutcomes: CurriculumLearningOutcomeItem[];
  onChanged: () => Promise<void> | void;
}

const EMPTY_FORM: LearningOutcomeFormState = {
  moduleId: '',
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

function getModuleOptionLabel(
  module: ProfessionalModule,
): string {
  return `${module.vocationalProgramme.acronym} · ${module.academicLevel.name} · ${module.code} · ${module.name}`;
}

function getLearningOutcomeModuleLabel(
  item: CurriculumLearningOutcomeItem,
): string {
  return `${item.module.vocationalProgramme.acronym} · ${item.module.academicLevel.name} · ${item.module.code}`;
}

function mapItemToForm(
  item: CurriculumLearningOutcomeItem,
): LearningOutcomeFormState {
  return {
    moduleId: item.moduleId.toString(),
    code: item.code,
    title: item.title,
    description: item.description ?? '',
    sourceReference: item.sourceReference ?? '',
    sortOrder: item.sortOrder.toString(),
    isActive: item.isActive,
  };
}

function buildRequest(
  form: LearningOutcomeFormState,
): CurriculumLearningOutcomeMutationRequest {
  return {
    moduleId: Number(form.moduleId),
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    sourceReference: form.sourceReference.trim() || undefined,
    sortOrder: Number(form.sortOrder || 0),
    isActive: form.isActive,
  };
}

export function LearningOutcomeManager({
  moduleOptions,
  learningOutcomes,
  onChanged,
}: LearningOutcomeManagerProps) {
  const [form, setForm] =
    useState<LearningOutcomeFormState>(EMPTY_FORM);

  const [editingItem, setEditingItem] =
    useState<CurriculumLearningOutcomeItem | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

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
        ? await updateCurriculumLearningOutcome(
          editingItem.id,
          request,
        )
        : await createCurriculumLearningOutcome(request);

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
    item: CurriculumLearningOutcomeItem,
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
      const result = await archiveCurriculumLearningOutcome(
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
    item: CurriculumLearningOutcomeItem,
  ): Promise<void> {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await restoreCurriculumLearningOutcome(
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
    <section className="learning-outcome-manager">
      <div className="learning-outcome-manager-header">
        <div>
          <p className="eyebrow">Gestión manual</p>
          <h4>
            {editingItem
              ? `Editando ${editingItem.code}`
              : 'Crear Resultado de Aprendizaje'}
          </h4>
          <p>
            Los RA se vinculan siempre a un módulo profesional. Al archivar un
            RA no se borra su historial ni sus criterios asociados.
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
        className="learning-outcome-form"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label>
          Módulo profesional
          <select
            required
            value={form.moduleId}
            disabled={isSaving}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                moduleId: event.target.value,
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
          Código RA
          <input
            required
            type="text"
            maxLength={50}
            placeholder="RA1"
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

        <label className="learning-outcome-form-wide">
          Título
          <input
            required
            type="text"
            maxLength={191}
            placeholder="Selecciona, desarrolla, evalúa..."
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

        <label className="learning-outcome-form-wide">
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

        <label className="learning-outcome-form-wide">
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

        <label className="learning-outcome-checkbox">
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

        <div className="learning-outcome-form-actions">
          <button
            className="button button-primary"
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? 'Guardando...'
              : editingItem
                ? 'Guardar cambios'
                : 'Crear RA'}
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

      <div className="learning-outcome-manager-list">
        <h5>RA visibles en la consulta actual</h5>

        {learningOutcomes.length === 0 ? (
          <p>
            No hay RA visibles con los filtros actuales.
          </p>
        ) : (
          learningOutcomes.map((item) => (
            <article
              className="learning-outcome-manager-item"
              key={item.id}
            >
              <div>
                <strong>
                  {item.code} · {item.title}
                </strong>
                <span>
                  {getLearningOutcomeModuleLabel(item)} · {item.deletedAt
                    ? 'Archivado'
                    : item.isActive
                      ? 'Activo'
                      : 'Inactivo'}
                </span>
              </div>

              <div className="learning-outcome-manager-item-actions">
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

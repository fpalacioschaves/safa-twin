import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  archivePlacementFollowup,
  archivePlacementIncident,
  createPlacementFollowup,
  createPlacementIncident,
  getPlacementFollowups,
  getPlacementIncidents,
  getWorkPlacements,
  updatePlacementFollowup,
  updatePlacementIncident,
} from '../services/company-training.service';

import type {
  CreatePlacementFollowupInput,
  CreatePlacementIncidentInput,
  PlacementFollowup,
  PlacementFollowupType,
  PlacementIncident,
  PlacementIncidentSeverity,
  UpdatePlacementFollowupInput,
  UpdatePlacementIncidentInput,
  WorkPlacement,
} from '../types/company-training';

import './CompanyTrainingMonitoringPanel.css';

interface CompanyTrainingMonitoringPanelProps {
  canManageFollowups: boolean;
  canManageIncidents: boolean;
}

interface FollowupFormState {
  followupType: PlacementFollowupType;
  followupAt: string;
  title: string;
  description: string;
  nextActions: string;
}

interface IncidentFormState {
  severity: PlacementIncidentSeverity;
  occurredAt: string;
  title: string;
  description: string;
  resolution: string;
  resolvedAt: string;
}

type FormMode =
  | 'create'
  | 'edit';

const FOLLOWUP_TYPE_OPTIONS: {
  value: PlacementFollowupType;
  label: string;
}[] = [
  { value: 'VISIT', label: 'Visita' },
  { value: 'PHONE', label: 'Llamada' },
  { value: 'EMAIL', label: 'Correo' },
  { value: 'MEETING', label: 'Reunión' },
  { value: 'OTHER', label: 'Otro' },
];

const INCIDENT_SEVERITY_OPTIONS: {
  value: PlacementIncidentSeverity;
  label: string;
}[] = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
];

function toDateTimeLocal(
  value: string | Date,
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(
    date.getTime()
      - date.getTimezoneOffset() * 60_000,
  );

  return localDate
    .toISOString()
    .slice(0, 16);
}

function createEmptyFollowupForm(): FollowupFormState {
  return {
    followupType: 'VISIT',
    followupAt: toDateTimeLocal(new Date()),
    title: '',
    description: '',
    nextActions: '',
  };
}

function createEmptyIncidentForm(): IncidentFormState {
  return {
    severity: 'MEDIUM',
    occurredAt: toDateTimeLocal(new Date()),
    title: '',
    description: '',
    resolution: '',
    resolvedAt: '',
  };
}

function optionalString(
  value: string,
): string | undefined {
  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no válida';
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(date);
}

function getFollowupTypeLabel(
  value: PlacementFollowupType,
): string {
  return FOLLOWUP_TYPE_OPTIONS.find(
    (option) => option.value === value,
  )?.label ?? value;
}

function getIncidentSeverityLabel(
  value: PlacementIncidentSeverity,
): string {
  return INCIDENT_SEVERITY_OPTIONS.find(
    (option) => option.value === value,
  )?.label ?? value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Se ha producido un error inesperado.';
}

function buildPlacementLabel(
  placement: WorkPlacement,
): string {
  return [
    placement.studentFullName,
    placement.companyName,
    placement.academicYearName,
  ].join(' · ');
}

function buildFollowupInput(
  form: FollowupFormState,
): CreatePlacementFollowupInput | UpdatePlacementFollowupInput {
  if (!form.followupAt) {
    throw new Error(
      'La fecha y hora del seguimiento es obligatoria.',
    );
  }

  if (form.title.trim().length < 2) {
    throw new Error(
      'El título del seguimiento debe tener al menos 2 caracteres.',
    );
  }

  return {
    followupType: form.followupType,
    followupAt: form.followupAt,
    title: form.title.trim(),
    description: optionalString(form.description),
    nextActions: optionalString(form.nextActions),
  };
}

function buildIncidentInput(
  form: IncidentFormState,
): CreatePlacementIncidentInput | UpdatePlacementIncidentInput {
  if (!form.occurredAt) {
    throw new Error(
      'La fecha y hora de la incidencia es obligatoria.',
    );
  }

  if (form.title.trim().length < 2) {
    throw new Error(
      'El título de la incidencia debe tener al menos 2 caracteres.',
    );
  }

  if (form.description.trim().length < 2) {
    throw new Error(
      'La descripción de la incidencia debe tener al menos 2 caracteres.',
    );
  }

  return {
    severity: form.severity,
    occurredAt: form.occurredAt,
    title: form.title.trim(),
    description: form.description.trim(),
    resolution: optionalString(form.resolution),
    resolvedAt: optionalString(form.resolvedAt),
  };
}

export function CompanyTrainingMonitoringPanel({
  canManageFollowups,
  canManageIncidents,
}: CompanyTrainingMonitoringPanelProps) {
  const [placements, setPlacements] =
    useState<WorkPlacement[]>([]);

  const [selectedPlacementId, setSelectedPlacementId] =
    useState('');

  const [followups, setFollowups] =
    useState<PlacementFollowup[]>([]);

  const [incidents, setIncidents] =
    useState<PlacementIncident[]>([]);

  const [followupForm, setFollowupForm] =
    useState<FollowupFormState>(createEmptyFollowupForm);

  const [incidentForm, setIncidentForm] =
    useState<IncidentFormState>(createEmptyIncidentForm);

  const [followupFormMode, setFollowupFormMode] =
    useState<FormMode>('create');

  const [incidentFormMode, setIncidentFormMode] =
    useState<FormMode>('create');

  const [editingFollowupId, setEditingFollowupId] =
    useState<number | null>(null);

  const [editingIncidentId, setEditingIncidentId] =
    useState<number | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const selectedPlacement = placements.find(
    (placement) => placement.id.toString() === selectedPlacementId,
  );

  async function loadPlacements(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getWorkPlacements({
        page: 1,
        pageSize: 50,
        recordStatus: 'active',
        status: 'all',
      });

      setPlacements(result.items);

      if (
        result.items.length > 0
        && !selectedPlacementId
      ) {
        setSelectedPlacementId(
          result.items[0].id.toString(),
        );
      }
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMonitoringData(
    placementId: number,
  ): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const [followupsResult, incidentsResult] =
        await Promise.all([
          getPlacementFollowups(placementId),
          getPlacementIncidents(placementId),
        ]);

      setFollowups(followupsResult.items);
      setIncidents(incidentsResult.items);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  function resetFollowupForm(): void {
    setFollowupForm(createEmptyFollowupForm());
    setFollowupFormMode('create');
    setEditingFollowupId(null);
  }

  function resetIncidentForm(): void {
    setIncidentForm(createEmptyIncidentForm());
    setIncidentFormMode('create');
    setEditingIncidentId(null);
  }

  async function handleFollowupSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const placementId = Number(selectedPlacementId);

    if (!Number.isInteger(placementId) || placementId <= 0) {
      setError(
        'Selecciona una estancia formativa antes de registrar seguimientos.',
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const input = buildFollowupInput(followupForm);

      if (
        followupFormMode === 'edit'
        && editingFollowupId !== null
      ) {
        await updatePlacementFollowup(
          editingFollowupId,
          input,
        );
        setSuccessMessage(
          'Seguimiento actualizado correctamente.',
        );
      } else {
        await createPlacementFollowup(
          placementId,
          input,
        );
        setSuccessMessage(
          'Seguimiento registrado correctamente.',
        );
      }

      resetFollowupForm();
      await loadMonitoringData(placementId);
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleIncidentSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const placementId = Number(selectedPlacementId);

    if (!Number.isInteger(placementId) || placementId <= 0) {
      setError(
        'Selecciona una estancia formativa antes de registrar incidencias.',
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const input = buildIncidentInput(incidentForm);

      if (
        incidentFormMode === 'edit'
        && editingIncidentId !== null
      ) {
        await updatePlacementIncident(
          editingIncidentId,
          input,
        );
        setSuccessMessage(
          'Incidencia actualizada correctamente.',
        );
      } else {
        await createPlacementIncident(
          placementId,
          input,
        );
        setSuccessMessage(
          'Incidencia registrada correctamente.',
        );
      }

      resetIncidentForm();
      await loadMonitoringData(placementId);
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  function startFollowupEdit(
    followup: PlacementFollowup,
  ): void {
    setFollowupForm({
      followupType: followup.followupType,
      followupAt: toDateTimeLocal(followup.followupAt),
      title: followup.title,
      description: followup.description ?? '',
      nextActions: followup.nextActions ?? '',
    });
    setFollowupFormMode('edit');
    setEditingFollowupId(followup.id);
  }

  function startIncidentEdit(
    incident: PlacementIncident,
  ): void {
    setIncidentForm({
      severity: incident.severity,
      occurredAt: toDateTimeLocal(incident.occurredAt),
      title: incident.title,
      description: incident.description,
      resolution: incident.resolution ?? '',
      resolvedAt: incident.resolvedAt
        ? toDateTimeLocal(incident.resolvedAt)
        : '',
    });
    setIncidentFormMode('edit');
    setEditingIncidentId(incident.id);
  }

  async function handleArchiveFollowup(
    followupId: number,
  ): Promise<void> {
    const confirmed = window.confirm(
      '¿Seguro que quieres archivar este seguimiento?',
    );

    if (!confirmed) {
      return;
    }

    const placementId = Number(selectedPlacementId);

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await archivePlacementFollowup(followupId);
      setSuccessMessage(
        'Seguimiento archivado correctamente.',
      );

      if (Number.isInteger(placementId) && placementId > 0) {
        await loadMonitoringData(placementId);
      }
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveIncident(
    incidentId: number,
  ): Promise<void> {
    const confirmed = window.confirm(
      '¿Seguro que quieres archivar esta incidencia?',
    );

    if (!confirmed) {
      return;
    }

    const placementId = Number(selectedPlacementId);

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await archivePlacementIncident(incidentId);
      setSuccessMessage(
        'Incidencia archivada correctamente.',
      );

      if (Number.isInteger(placementId) && placementId > 0) {
        await loadMonitoringData(placementId);
      }
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadPlacements();
  }, []);

  useEffect(() => {
    const placementId = Number(selectedPlacementId);

    if (Number.isInteger(placementId) && placementId > 0) {
      void loadMonitoringData(placementId);
    } else {
      setFollowups([]);
      setIncidents([]);
    }
  }, [selectedPlacementId]);

  return (
    <section className="company-training-monitoring">
      <article className="company-training-card company-training-card-wide">
        <div className="company-training-card-header">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h3>Seguimientos e incidencias</h3>
            <p className="company-training-muted">
              Registra visitas, llamadas, reuniones, correos e incidencias
              asociadas a una estancia formativa concreta.
            </p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            disabled={isLoading}
            onClick={() => {
              void loadPlacements();
            }}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {error ? (
          <div className="alert alert-error">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="alert alert-success">
            {successMessage}
          </div>
        ) : null}

        <label className="company-training-monitoring-selector">
          Estancia formativa
          <select
            value={selectedPlacementId}
            onChange={(event) => {
              setSelectedPlacementId(event.target.value);
              resetFollowupForm();
              resetIncidentForm();
            }}
          >
            {placements.length === 0 ? (
              <option value="">
                No hay estancias activas disponibles
              </option>
            ) : null}
            {placements.map((placement) => (
              <option
                key={placement.id}
                value={placement.id}
              >
                {buildPlacementLabel(placement)}
              </option>
            ))}
          </select>
        </label>

        {selectedPlacement ? (
          <div className="company-training-monitoring-context">
            <span>
              Alumno: <strong>{selectedPlacement.studentFullName}</strong>
            </span>
            <span>
              Empresa: <strong>{selectedPlacement.companyName}</strong>
            </span>
            <span>
              Tutor laboral:{' '}
              <strong>
                {selectedPlacement.companyTutorFullName ?? 'Sin asignar'}
              </strong>
            </span>
            <span>
              Tutor académico:{' '}
              <strong>
                {selectedPlacement.academicTutorName ?? 'Sin asignar'}
              </strong>
            </span>
          </div>
        ) : null}
      </article>

      <div className="company-training-monitoring-grid">
        <article className="company-training-card">
          <div className="company-training-card-header">
            <div>
              <p className="eyebrow">Seguimientos</p>
              <h3>Registro de seguimiento</h3>
            </div>
          </div>

          {followups.length === 0 ? (
            <p className="company-training-empty">
              No hay seguimientos registrados para esta estancia.
            </p>
          ) : (
            <div className="company-training-table-wrapper">
              <table className="company-training-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Seguimiento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {followups.map((followup) => (
                    <tr key={followup.id}>
                      <td>{formatDateTime(followup.followupAt)}</td>
                      <td>{getFollowupTypeLabel(followup.followupType)}</td>
                      <td>
                        <strong>{followup.title}</strong>
                        <span>
                          {followup.description ?? 'Sin descripción'}
                        </span>
                        {followup.nextActions ? (
                          <span>
                            Próximas acciones: {followup.nextActions}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <div className="company-training-actions">
                          <button
                            className="button button-secondary"
                            type="button"
                            disabled={isSaving || !canManageFollowups}
                            onClick={() => {
                              startFollowupEdit(followup);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="button button-danger"
                            type="button"
                            disabled={isSaving || !canManageFollowups}
                            onClick={() => {
                              void handleArchiveFollowup(followup.id);
                            }}
                          >
                            Archivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="company-training-card">
          <div className="company-training-card-header">
            <div>
              <p className="eyebrow">
                {followupFormMode === 'create'
                  ? 'Nuevo seguimiento'
                  : 'Editar seguimiento'}
              </p>
              <h3>Datos del seguimiento</h3>
            </div>
            {followupFormMode === 'edit' ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={resetFollowupForm}
              >
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form
            className="company-training-form company-training-form-compact"
            onSubmit={(event) => {
              void handleFollowupSubmit(event);
            }}
          >
            <label>
              Tipo
              <select
                value={followupForm.followupType}
                onChange={(event) => {
                  setFollowupForm({
                    ...followupForm,
                    followupType: event.target.value as PlacementFollowupType,
                  });
                }}
              >
                {FOLLOWUP_TYPE_OPTIONS.map((option) => (
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
              Fecha y hora
              <input
                type="datetime-local"
                value={followupForm.followupAt}
                onChange={(event) => {
                  setFollowupForm({
                    ...followupForm,
                    followupAt: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              Título
              <input
                value={followupForm.title}
                onChange={(event) => {
                  setFollowupForm({
                    ...followupForm,
                    title: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              Descripción
              <textarea
                value={followupForm.description}
                onChange={(event) => {
                  setFollowupForm({
                    ...followupForm,
                    description: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              Próximas acciones
              <textarea
                value={followupForm.nextActions}
                onChange={(event) => {
                  setFollowupForm({
                    ...followupForm,
                    nextActions: event.target.value,
                  });
                }}
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={isSaving || !canManageFollowups || !selectedPlacementId}
            >
              {isSaving
                ? 'Guardando...'
                : followupFormMode === 'create'
                  ? 'Registrar seguimiento'
                  : 'Guardar seguimiento'}
            </button>
          </form>
        </article>

        <article className="company-training-card">
          <div className="company-training-card-header">
            <div>
              <p className="eyebrow">Incidencias</p>
              <h3>Registro de incidencias</h3>
            </div>
          </div>

          {incidents.length === 0 ? (
            <p className="company-training-empty">
              No hay incidencias registradas para esta estancia.
            </p>
          ) : (
            <div className="company-training-table-wrapper">
              <table className="company-training-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Gravedad</th>
                    <th>Incidencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.id}>
                      <td>{formatDateTime(incident.occurredAt)}</td>
                      <td>
                        <span
                          className={
                            incident.severity === 'HIGH'
                              ? 'company-training-severity company-training-severity-high'
                              : incident.severity === 'MEDIUM'
                                ? 'company-training-severity company-training-severity-medium'
                                : 'company-training-severity company-training-severity-low'
                          }
                        >
                          {getIncidentSeverityLabel(incident.severity)}
                        </span>
                      </td>
                      <td>
                        <strong>{incident.title}</strong>
                        <span>{incident.description}</span>
                        {incident.resolution ? (
                          <span>Resolución: {incident.resolution}</span>
                        ) : null}
                      </td>
                      <td>
                        {incident.resolvedAt ? (
                          <span className="company-training-status-pill company-training-status-completed">
                            Resuelta
                          </span>
                        ) : (
                          <span className="company-training-warning">
                            Abierta
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="company-training-actions">
                          <button
                            className="button button-secondary"
                            type="button"
                            disabled={isSaving || !canManageIncidents}
                            onClick={() => {
                              startIncidentEdit(incident);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="button button-danger"
                            type="button"
                            disabled={isSaving || !canManageIncidents}
                            onClick={() => {
                              void handleArchiveIncident(incident.id);
                            }}
                          >
                            Archivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="company-training-card">
          <div className="company-training-card-header">
            <div>
              <p className="eyebrow">
                {incidentFormMode === 'create'
                  ? 'Nueva incidencia'
                  : 'Editar incidencia'}
              </p>
              <h3>Datos de la incidencia</h3>
            </div>
            {incidentFormMode === 'edit' ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={resetIncidentForm}
              >
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form
            className="company-training-form company-training-form-compact"
            onSubmit={(event) => {
              void handleIncidentSubmit(event);
            }}
          >
            <label>
              Gravedad
              <select
                value={incidentForm.severity}
                onChange={(event) => {
                  setIncidentForm({
                    ...incidentForm,
                    severity: event.target.value as PlacementIncidentSeverity,
                  });
                }}
              >
                {INCIDENT_SEVERITY_OPTIONS.map((option) => (
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
              Fecha y hora
              <input
                type="datetime-local"
                value={incidentForm.occurredAt}
                onChange={(event) => {
                  setIncidentForm({
                    ...incidentForm,
                    occurredAt: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              Título
              <input
                value={incidentForm.title}
                onChange={(event) => {
                  setIncidentForm({
                    ...incidentForm,
                    title: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              Descripción
              <textarea
                value={incidentForm.description}
                onChange={(event) => {
                  setIncidentForm({
                    ...incidentForm,
                    description: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              Resolución
              <textarea
                value={incidentForm.resolution}
                onChange={(event) => {
                  setIncidentForm({
                    ...incidentForm,
                    resolution: event.target.value,
                  });
                }}
              />
            </label>
            <label>
              Fecha de resolución
              <input
                type="datetime-local"
                value={incidentForm.resolvedAt}
                onChange={(event) => {
                  setIncidentForm({
                    ...incidentForm,
                    resolvedAt: event.target.value,
                  });
                }}
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={isSaving || !canManageIncidents || !selectedPlacementId}
            >
              {isSaving
                ? 'Guardando...'
                : incidentFormMode === 'create'
                  ? 'Registrar incidencia'
                  : 'Guardar incidencia'}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}

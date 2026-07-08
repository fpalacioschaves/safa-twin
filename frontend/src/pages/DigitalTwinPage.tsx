import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  getDigitalTwinStatus,
  sendDigitalTwinMessage,
} from '../services/digitalTwin.service';

import type {
  DigitalTwinResponse,
  DigitalTwinStatus,
} from '../types/digitalTwin';

import './DigitalTwinPage.css';

const EXAMPLE_PROMPTS = [
  'Genera un resumen de la segunda evaluación de 1º de DAM y DAW.',
  'Prepara un correo para el alumnado de 2º de DAM y DAW sobre la reunión de prácticas.',
  'Muéstrame el estado de la formación en empresa de 2º de DAW.',
  'Resume el currículo cargado de DAM y DAW.',
];

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Se ha producido un error inesperado.';
}

function getIntentLabel(intent: string): string {
  const labels: Record<string, string> = {
    GENERAL_QUERY: 'Consulta general',
    EVALUATION_REPORT: 'Informe de evaluación',
    WORK_PLACEMENT_SUMMARY: 'Formación en empresa',
    EMAIL_DRAFT: 'Borrador de correo',
    CURRICULUM_QUERY: 'Consulta curricular',
  };

  return labels[intent] ?? intent;
}

function formatJson(value: unknown): string {
  return JSON.stringify(
    value,
    null,
    2,
  );
}

export function DigitalTwinPage() {
  const [message, setMessage] = useState('');

  const [status, setStatus] =
    useState<DigitalTwinStatus | null>(null);

  const [response, setResponse] =
    useState<DigitalTwinResponse | null>(null);

  const [isLoadingStatus, setIsLoadingStatus] =
    useState(false);

  const [isSending, setIsSending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => message.trim().length >= 3 && !isSending,
    [message, isSending],
  );

  useEffect(() => {
    async function loadStatus(): Promise<void> {
      setIsLoadingStatus(true);

      try {
        const result = await getDigitalTwinStatus();
        setStatus(result);
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoadingStatus(false);
      }
    }

    void loadStatus();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await sendDigitalTwinMessage(
        message.trim(),
      );

      setResponse(result);
    } catch (sendError: unknown) {
      setError(getErrorMessage(sendError));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="dashboard-content digital-twin-page">
      <section className="welcome-card digital-twin-hero">
        <div>
          <p className="eyebrow">Gemelo digital</p>
          <h2>Asistente académico local con Ollama</h2>
          <p>
            Escribe una petición libre. SAFA Twin interpretará la consulta,
            preparará datos académicos controlados desde el backend y pedirá
            a Ollama una respuesta o una vista previa.
          </p>
        </div>

        <span className="status-badge">
          {isLoadingStatus
            ? 'Comprobando IA...'
            : status?.enabled
              ? `${status.provider} · ${status.model}`
              : 'IA no configurada'}
        </span>
      </section>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <section className="digital-twin-layout">
        <form
          className="digital-twin-card digital-twin-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label htmlFor="digital-twin-message">
            Petición al gemelo digital
          </label>

          <textarea
            id="digital-twin-message"
            name="message"
            placeholder="Ejemplo: Genera un informe de la segunda evaluación de 1º de DAM y DAW."
            rows={8}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
          />

          <div className="digital-twin-examples">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                className="button button-secondary"
                key={example}
                type="button"
                onClick={() => {
                  setMessage(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>

          <button
            className="button button-primary"
            type="submit"
            disabled={!canSubmit}
          >
            {isSending
              ? 'Consultando al gemelo digital...'
              : 'Enviar petición'}
          </button>
        </form>

        <aside className="digital-twin-card digital-twin-help">
          <h3>Qué hace esta primera versión</h3>
          <ul>
            <li>Interpreta peticiones libres con Ollama.</li>
            <li>Consulta datos reales mediante el backend.</li>
            <li>Genera resúmenes, informes y borradores.</li>
            <li>No envía correos automáticamente.</li>
            <li>No modifica notas, matrículas ni documentos oficiales.</li>
          </ul>
        </aside>
      </section>

      {response && (
        <section className="digital-twin-result">
          <article className="digital-twin-card">
            <div className="digital-twin-result-header">
              <div>
                <p className="eyebrow">Respuesta</p>
                <h3>{getIntentLabel(response.intent.intent)}</h3>
              </div>

              <span className="status-badge">
                {response.provider.name} · {response.provider.model}
              </span>
            </div>

            <div className="digital-twin-answer">
              {response.assistantMessage
                .split('\n')
                .filter((paragraph) => paragraph.trim().length > 0)
                .map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
            </div>

            {response.proposedAction && (
              <div className="digital-twin-action-preview">
                <strong>{response.proposedAction.label}</strong>
                <span>
                  Estado: {response.proposedAction.status}. Esta acción
                  queda como vista previa y requiere confirmación humana.
                </span>
              </div>
            )}
          </article>

          <article className="digital-twin-card">
            <h3>Contexto utilizado</h3>
            <p>{response.context.summary}</p>

            {response.context.warnings.length > 0 && (
              <div className="digital-twin-warnings">
                <strong>Advertencias</strong>
                <ul>
                  {response.context.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="digital-twin-raw-data">
              <summary>Ver datos técnicos enviados al modelo</summary>
              <pre>{formatJson(response.context.data)}</pre>
            </details>
          </article>
        </section>
      )}
    </main>
  );
}

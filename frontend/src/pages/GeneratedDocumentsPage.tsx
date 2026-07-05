import {
  useEffect,
  useState,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  buildGeneratedDocumentDownloadUrl,
  getGeneratedDocuments,
} from '../services/generated-documents.service';

import type {
  GeneratedDocumentItem,
  GeneratedDocumentsPagination,
} from '../types/generated-documents';

import './GeneratedDocumentsPage.css';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Se ha producido un error inesperado.';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(
    'es-ES',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocumentType(value: string): string {
  if (value === 'ACADEMIC_STATISTICS_XLSX') {
    return 'Estadísticas académicas';
  }

  return value
    .toLowerCase()
    .replaceAll('_', ' ');
}

function getScopeSummary(item: GeneratedDocumentItem): string {
  const parameters = item.parameters;

  if (
    typeof parameters === 'object'
    && parameters !== null
    && 'labels' in parameters
  ) {
    const labels = (parameters as {
      labels?: Record<string, unknown>;
    }).labels;

    if (labels) {
      return [
        labels.academicYear,
        labels.evaluation,
        labels.vocationalProgramme,
        labels.academicLevel,
        labels.module,
      ]
        .filter((value) =>
          typeof value === 'string'
          && value.length > 0
          && value !== 'Todos',
        )
        .join(' · ')
        || 'Ámbito general';
    }
  }

  return 'Ámbito no especificado';
}

export function GeneratedDocumentsPage() {
  const [items, setItems] =
    useState<GeneratedDocumentItem[]>([]);

  const [pagination, setPagination] =
    useState<GeneratedDocumentsPagination>({
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function loadDocuments(page: number): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getGeneratedDocuments({
        page,
        pageSize: pagination.pageSize,
      });

      setItems(result.items);
      setPagination(result.pagination);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments(1);
  }, []);

  return (
    <main className="dashboard-content generated-documents-page">
      <section className="generated-documents-hero">
        <div>
          <p className="eyebrow">
            Documentos
          </p>
          <h2>Historial de documentos generados</h2>
          <p>
            Consulta las exportaciones registradas por la aplicación
            y vuelve a descargar los archivos cuando sea necesario.
          </p>
        </div>
        <span className="generated-documents-status">
          {pagination.total} registros
        </span>
      </section>

      {error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : null}

      <section className="generated-documents-card">
        <div className="generated-documents-card-header">
          <div>
            <p className="eyebrow">Historial</p>
            <h3>Documentos disponibles</h3>
            <p>
              Los archivos se sirven desde el backend y mantienen
              el registro de usuario, fecha, tipo, ámbito y tamaño.
            </p>
          </div>

          <button
            className="button button-secondary"
            type="button"
            disabled={isLoading}
            onClick={() => {
              void loadDocuments(pagination.page);
            }}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {items.length === 0 ? (
          <p className="generated-documents-empty">
            Todavía no hay documentos generados.
          </p>
        ) : (
          <div className="generated-documents-table-wrapper">
            <table className="generated-documents-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Ámbito</th>
                  <th>Archivo</th>
                  <th>Usuario</th>
                  <th>Tamaño</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{formatDocumentType(item.documentType)}</td>
                    <td>{getScopeSummary(item)}</td>
                    <td>
                      <strong>{item.title}</strong>
                      <span>{item.fileName}</span>
                    </td>
                    <td>
                      {item.generatedByUserName ?? 'Usuario desconocido'}
                    </td>
                    <td>{formatBytes(item.fileSizeBytes)}</td>
                    <td>
                      <a
                        className="button button-primary generated-documents-link"
                        href={buildGeneratedDocumentDownloadUrl(item.id)}
                      >
                        Descargar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="generated-documents-pagination">
          <button
            className="button button-secondary"
            type="button"
            disabled={isLoading || pagination.page <= 1}
            onClick={() => {
              void loadDocuments(pagination.page - 1);
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
              void loadDocuments(pagination.page + 1);
            }}
          >
            Siguiente
          </button>
        </div>
      </section>
    </main>
  );
}

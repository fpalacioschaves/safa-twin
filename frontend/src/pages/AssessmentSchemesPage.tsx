import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getAcademicYears,
} from '../services/academic-years.service';

import {
  createAssessmentScheme,
  getAssessmentSchemes,
  archiveAssessmentScheme,
  restoreAssessmentScheme,
} from '../services/assessment-schemes.service';

import {
  getCentres,
} from '../services/centres.service';

import {
  getModules,
} from '../services/modules.service';

import type {
  AcademicYear,
} from '../types/academic-years';

import type {
  AssessmentComponentInput,
  AssessmentComponentType,
  AssessmentScheme,
  AssessmentSchemeDualFilter,
  AssessmentSchemeStatusFilter,
} from '../types/assessment-schemes';

import type {
  Centre,
} from '../types/centres';

import type {
  ProfessionalModule,
} from '../types/modules';

import './AssessmentSchemesPage.css';

const componentTypeLabels:
Record<AssessmentComponentType, string> = {
  ACTIVITIES: 'Actividades obligatorias',
  SELF_ASSESSMENTS: 'Autoevaluaciones',
  FORUMS: 'Participación en foros',
  COMPANY: 'Empresa',
  OTHER: 'Otro',
};

interface ComponentFormState {
  code: string;
  name: string;
  type: AssessmentComponentType;
  percentage: string;
  sortOrder: string;
  isRequired: boolean;
  isCompanyComponent: boolean;
}

interface SchemeFormState {
  academicYearId: string;
  centreId: string;
  moduleId: string;
  name: string;
  isDual: boolean;
  isActive: boolean;
  remarks: string;
  components: ComponentFormState[];
}

interface SchemesFilters {
  search: string;
  status: AssessmentSchemeStatusFilter;
  dual: AssessmentSchemeDualFilter;
  academicYearId: string;
  centreId: string;
  moduleId: string;
}

function createNonDualComponents():
ComponentFormState[] {
  return [
    {
      code: 'ACT',
      name: 'Actividades obligatorias',
      type: 'ACTIVITIES',
      percentage: '60',
      sortOrder: '10',
      isRequired: true,
      isCompanyComponent: false,
    },
    {
      code: 'AUTO',
      name: 'Autoevaluaciones',
      type: 'SELF_ASSESSMENTS',
      percentage: '20',
      sortOrder: '20',
      isRequired: true,
      isCompanyComponent: false,
    },
    {
      code: 'FOROS',
      name: 'Participación en foros',
      type: 'FORUMS',
      percentage: '20',
      sortOrder: '30',
      isRequired: false,
      isCompanyComponent: false,
    },
  ];
}

function createDualComponents():
ComponentFormState[] {
  return [
    {
      code: 'ACT',
      name: 'Actividades obligatorias',
      type: 'ACTIVITIES',
      percentage: '45',
      sortOrder: '10',
      isRequired: true,
      isCompanyComponent: false,
    },
    {
      code: 'AUTO',
      name: 'Autoevaluaciones',
      type: 'SELF_ASSESSMENTS',
      percentage: '15',
      sortOrder: '20',
      isRequired: true,
      isCompanyComponent: false,
    },
    {
      code: 'FOROS',
      name: 'Participación en foros',
      type: 'FORUMS',
      percentage: '10',
      sortOrder: '30',
      isRequired: false,
      isCompanyComponent: false,
    },
    {
      code: 'EMP',
      name: 'Evaluación de empresa',
      type: 'COMPANY',
      percentage: '30',
      sortOrder: '40',
      isRequired: true,
      isCompanyComponent: true,
    },
  ];
}

function createInitialForm():
SchemeFormState {
  return {
    academicYearId: '',
    centreId: '',
    moduleId: '',
    name: '',
    isDual: false,
    isActive: true,
    remarks: '',
    components: createNonDualComponents(),
  };
}

function parseOptionalNumber(
  value: string,
): number | undefined {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function calculatePercentageTotal(
  components: ComponentFormState[],
): number {
  const total = components.reduce(
    (sum, component) =>
      sum + Number(component.percentage || 0),
    0,
  );

  return Math.round(total * 100) / 100;
}

function toComponentInput(
  component: ComponentFormState,
): AssessmentComponentInput {
  return {
    code: component.code,
    name: component.name,
    type: component.type,
    percentage: Number(component.percentage),
    sortOrder: Number(component.sortOrder),
    isRequired: component.isRequired,
    isCompanyComponent:
      component.isCompanyComponent
      || component.type === 'COMPANY',
  };
}

function formatModuleLabel(
  module: ProfessionalModule,
): string {
  return `${module.code} · ${module.name} · ${module.vocationalProgramme.acronym} · ${module.academicLevel.name}`;
}

export function AssessmentSchemesPage() {
  const [
    academicYears,
    setAcademicYears,
  ] = useState<AcademicYear[]>([]);

  const [
    centres,
    setCentres,
  ] = useState<Centre[]>([]);

  const [
    modules,
    setModules,
  ] = useState<ProfessionalModule[]>([]);

  const [
    schemes,
    setSchemes,
  ] = useState<AssessmentScheme[]>([]);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    form,
    setForm,
  ] = useState<SchemeFormState>(
    createInitialForm,
  );

  const [
    filters,
    setFilters,
  ] = useState<SchemesFilters>({
    search: '',
    status: 'all',
    dual: 'all',
    academicYearId: '',
    centreId: '',
    moduleId: '',
  });

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

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

  const percentageTotal = useMemo(
    () =>
      calculatePercentageTotal(
        form.components,
      ),
    [form.components],
  );

  async function loadCatalogues():
  Promise<void> {
    const [
      academicYearsResponse,
      centresResponse,
      modulesResponse,
    ] = await Promise.all([
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
      getModules({
        page: 1,
        pageSize: 50,
        status: 'active',
      }),
    ]);

    setAcademicYears(
      academicYearsResponse.items,
    );

    setCentres(
      centresResponse.items,
    );

    setModules(
      modulesResponse.items,
    );
  }

  async function loadSchemes(
    requestedPage = page,
  ): Promise<void> {
    const response =
      await getAssessmentSchemes({
        page: requestedPage,
        pageSize: 10,
        status: filters.status,
        dual: filters.dual,
        search:
          filters.search.trim()
          || undefined,
        academicYearId:
          parseOptionalNumber(
            filters.academicYearId,
          ),
        centreId:
          parseOptionalNumber(
            filters.centreId,
          ),
        moduleId:
          parseOptionalNumber(
            filters.moduleId,
          ),
      });

    setSchemes(response.items);
    setPage(response.pagination.page);
    setTotalPages(
      response.pagination.totalPages,
    );
  }

  useEffect(() => {
    async function loadInitialData():
    Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        await loadCatalogues();
        await loadSchemes(1);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'No se pudieron cargar los sistemas de calificación.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateComponent(
    index: number,
    changes: Partial<ComponentFormState>,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      components:
        currentForm.components.map(
          (component, componentIndex) =>
            componentIndex === index
              ? {
                ...component,
                ...changes,
              }
              : component,
        ),
    }));
  }

  function addComponent(): void {
    setForm((currentForm) => ({
      ...currentForm,
      components: [
        ...currentForm.components,
        {
          code: '',
          name: '',
          type: 'OTHER',
          percentage: '0',
          sortOrder:
            String(
              (currentForm.components.length + 1)
              * 10,
            ),
          isRequired: true,
          isCompanyComponent: false,
        },
      ],
    }));
  }

  function removeComponent(
    index: number,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      components:
        currentForm.components.filter(
          (_component, componentIndex) =>
            componentIndex !== index,
        ),
    }));
  }

  function handleDualChange(
    isDual: boolean,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      isDual,
      components: isDual
        ? createDualComponents()
        : createNonDualComponents(),
    }));
  }

  function validateForm(): string | null {
    if (!parseOptionalNumber(form.academicYearId)) {
      return 'Selecciona un curso académico.';
    }

    if (!parseOptionalNumber(form.centreId)) {
      return 'Selecciona un centro.';
    }

    if (!parseOptionalNumber(form.moduleId)) {
      return 'Selecciona un módulo.';
    }

    if (!form.name.trim()) {
      return 'Indica el nombre del sistema de calificación.';
    }

    if (form.components.length === 0) {
      return 'Debe existir al menos un componente.';
    }

    if (percentageTotal !== 100) {
      return `La suma de porcentajes debe ser 100%. Ahora suma ${percentageTotal}%.`;
    }

    return null;
  }

  async function handleCreateScheme():
  Promise<void> {
    setMessage(null);
    setError(null);

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const response =
        await createAssessmentScheme({
          academicYearId:
            Number(form.academicYearId),
          centreId:
            Number(form.centreId),
          moduleId:
            Number(form.moduleId),
          name: form.name,
          isDual: form.isDual,
          isActive: form.isActive,
          remarks:
            form.remarks.trim()
            || undefined,
          components:
            form.components.map(
              toComponentInput,
            ),
        });

      setMessage(response.message);
      setForm(createInitialForm());
      await loadSchemes(1);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo crear el sistema de calificación.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(
    assessmentSchemeId: number,
  ): Promise<void> {
    setMessage(null);
    setError(null);

    try {
      const response =
        await archiveAssessmentScheme(
          assessmentSchemeId,
        );

      setMessage(response.message);
      await loadSchemes(page);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo archivar el sistema de calificación.',
      );
    }
  }

  async function handleRestore(
    assessmentSchemeId: number,
  ): Promise<void> {
    setMessage(null);
    setError(null);

    try {
      const response =
        await restoreAssessmentScheme(
          assessmentSchemeId,
        );

      setMessage(response.message);
      await loadSchemes(page);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo restaurar el sistema de calificación.',
      );
    }
  }

  async function handleSearch():
  Promise<void> {
    setError(null);

    try {
      await loadSchemes(1);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo ejecutar la búsqueda.',
      );
    }
  }

  async function changePage(
    nextPage: number,
  ): Promise<void> {
    if (
      nextPage < 1
      || nextPage > totalPages
    ) {
      return;
    }

    setError(null);

    try {
      await loadSchemes(nextPage);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo cambiar de página.',
      );
    }
  }

  return (
    <main className="dashboard-content assessment-schemes-page">
      <section className="section-card assessment-schemes-header">
        <div>
          <p className="eyebrow">
            Evaluación académica
          </p>

          <h2>
            Sistemas de calificación
          </h2>

          <p>
            Configura los porcentajes de cada
            módulo: actividades obligatorias,
            autoevaluaciones, foros y empresa
            cuando el módulo esté dualizado.
          </p>
        </div>

        <span className="status-badge">
          Total {percentageTotal} %
        </span>
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

      <section className="assessment-schemes-grid">
        <article className="section-card">
          <p className="eyebrow">
            Nuevo sistema
          </p>

          <h3>
            Configuración por módulo
          </h3>

          <div className="assessment-schemes-form-grid">
            <label>
              Curso académico
              <select
                value={form.academicYearId}
                onChange={(event) => {
                  setForm({
                    ...form,
                    academicYearId:
                      event.target.value,
                  });
                }}
              >
                <option value="">
                  Selecciona curso
                </option>

                {academicYears.map(
                  (academicYear) => (
                    <option
                      key={academicYear.id}
                      value={academicYear.id}
                    >
                      {academicYear.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Centro
              <select
                value={form.centreId}
                onChange={(event) => {
                  setForm({
                    ...form,
                    centreId:
                      event.target.value,
                  });
                }}
              >
                <option value="">
                  Selecciona centro
                </option>

                {centres.map((centre) => (
                  <option
                    key={centre.id}
                    value={centre.id}
                  >
                    {centre.shortName
                      || centre.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="wide-field">
              Módulo
              <select
                value={form.moduleId}
                onChange={(event) => {
                  setForm({
                    ...form,
                    moduleId:
                      event.target.value,
                  });
                }}
              >
                <option value="">
                  Selecciona módulo
                </option>

                {modules.map((module) => (
                  <option
                    key={module.id}
                    value={module.id}
                  >
                    {formatModuleLabel(module)}
                  </option>
                ))}
              </select>
            </label>

            <label className="wide-field">
              Nombre
              <input
                type="text"
                value={form.name}
                placeholder="Sistema de calificación 2026/2027"
                onChange={(event) => {
                  setForm({
                    ...form,
                    name: event.target.value,
                  });
                }}
              />
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.isDual}
                onChange={(event) => {
                  handleDualChange(
                    event.target.checked,
                  );
                }}
              />
              Módulo dualizado
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => {
                  setForm({
                    ...form,
                    isActive:
                      event.target.checked,
                  });
                }}
              />
              Activo
            </label>

            <label className="wide-field">
              Observaciones
              <textarea
                value={form.remarks}
                onChange={(event) => {
                  setForm({
                    ...form,
                    remarks:
                      event.target.value,
                  });
                }}
              />
            </label>
          </div>

          <div className="components-header">
            <h3>
              Componentes evaluables
            </h3>

            <button
              className="button button-secondary"
              type="button"
              onClick={addComponent}
            >
              Añadir componente
            </button>
          </div>

          <div className="components-list">
            {form.components.map(
              (component, index) => (
                <div
                  className="component-row"
                  key={`${component.code}-${index}`}
                >
                  <label>
                    Código
                    <input
                      type="text"
                      value={component.code}
                      onChange={(event) => {
                        updateComponent(index, {
                          code: event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label>
                    Nombre
                    <input
                      type="text"
                      value={component.name}
                      onChange={(event) => {
                        updateComponent(index, {
                          name: event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label>
                    Tipo
                    <select
                      value={component.type}
                      onChange={(event) => {
                        const type =
                          event.target.value as AssessmentComponentType;

                        updateComponent(index, {
                          type,
                          isCompanyComponent:
                            type === 'COMPANY',
                        });
                      }}
                    >
                      {Object.entries(
                        componentTypeLabels,
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={component.percentage}
                      onChange={(event) => {
                        updateComponent(index, {
                          percentage:
                            event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label>
                    Orden
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={component.sortOrder}
                      onChange={(event) => {
                        updateComponent(index, {
                          sortOrder:
                            event.target.value,
                        });
                      }}
                    />
                  </label>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={
                        component.isRequired
                      }
                      onChange={(event) => {
                        updateComponent(index, {
                          isRequired:
                            event.target.checked,
                        });
                      }}
                    />
                    Obligatorio
                  </label>

                  <button
                    className="button button-danger"
                    type="button"
                    onClick={() => {
                      removeComponent(index);
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ),
            )}
          </div>

          <div className="assessment-schemes-actions">
            <strong>
              Suma: {percentageTotal} %
            </strong>

            <button
              className="button"
              type="button"
              disabled={isSaving}
              onClick={() => {
                void handleCreateScheme();
              }}
            >
              {isSaving
                ? 'Guardando...'
                : 'Crear sistema'}
            </button>
          </div>
        </article>

        <article className="section-card">
          <p className="eyebrow">
            Consulta
          </p>

          <h3>
            Sistemas configurados
          </h3>

          <div className="assessment-schemes-filter-grid">
            <label className="wide-field">
              Buscar
              <input
                type="text"
                value={filters.search}
                placeholder="Módulo, ciclo, sistema..."
                onChange={(event) => {
                  setFilters({
                    ...filters,
                    search:
                      event.target.value,
                  });
                }}
              />
            </label>

            <label>
              Estado
              <select
                value={filters.status}
                onChange={(event) => {
                  setFilters({
                    ...filters,
                    status:
                      event.target.value as AssessmentSchemeStatusFilter,
                  });
                }}
              >
                <option value="all">
                  Todos
                </option>
                <option value="active">
                  Activos
                </option>
                <option value="inactive">
                  Inactivos
                </option>
                <option value="archived">
                  Archivados
                </option>
              </select>
            </label>

            <label>
              Dualización
              <select
                value={filters.dual}
                onChange={(event) => {
                  setFilters({
                    ...filters,
                    dual:
                      event.target.value as AssessmentSchemeDualFilter,
                  });
                }}
              >
                <option value="all">
                  Todos
                </option>
                <option value="dual">
                  Dualizados
                </option>
                <option value="non-dual">
                  No dualizados
                </option>
              </select>
            </label>

            <button
              className="button"
              type="button"
              onClick={() => {
                void handleSearch();
              }}
            >
              Buscar
            </button>
          </div>

          {isLoading
            ? (
              <p>
                Cargando sistemas de calificación...
              </p>
            )
            : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th>Sistema</th>
                      <th>Dual</th>
                      <th>Componentes</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {schemes.length === 0
                      ? (
                        <tr>
                          <td colSpan={6}>
                            No hay sistemas configurados.
                          </td>
                        </tr>
                      )
                      : schemes.map((scheme) => (
                        <tr key={scheme.id}>
                          <td>
                            <strong>
                              {scheme.module.code}
                            </strong>
                            <br />
                            {scheme.module.name}
                            <br />
                            <small>
                              {scheme.module.vocationalProgramme.acronym}
                              {' · '}
                              {scheme.module.academicLevel.name}
                            </small>
                          </td>

                          <td>
                            {scheme.name}
                            <br />
                            <small>
                              {scheme.academicYear.name}
                              {' · '}
                              {scheme.centre.shortName
                                || scheme.centre.name}
                            </small>
                          </td>

                          <td>
                            {scheme.isDual
                              ? 'Sí'
                              : 'No'}
                          </td>

                          <td>
                            {scheme.components.map(
                              (component) => (
                                <span
                                  className="component-pill"
                                  key={component.id}
                                >
                                  {component.code}
                                  {' '}
                                  {component.percentage}
                                  %
                                </span>
                              ),
                            )}
                          </td>

                          <td>
                            {scheme.deletedAt
                              ? 'Archivado'
                              : scheme.isActive
                                ? 'Activo'
                                : 'Inactivo'}
                          </td>

                          <td>
                            {scheme.deletedAt
                              ? (
                                <button
                                  className="button button-secondary"
                                  type="button"
                                  onClick={() => {
                                    void handleRestore(
                                      scheme.id,
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
                                    void handleArchive(
                                      scheme.id,
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
            )}

          <div className="pagination-controls">
            <button
              className="button button-secondary"
              type="button"
              disabled={page <= 1}
              onClick={() => {
                void changePage(page - 1);
              }}
            >
              Anterior
            </button>

            <span>
              Página {page} de {totalPages}
            </span>

            <button
              className="button button-secondary"
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                void changePage(page + 1);
              }}
            >
              Siguiente
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}

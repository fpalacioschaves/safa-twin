import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  archiveStudent,
  createStudent,
  getStudent,
  getStudents,
  restoreStudent,
  updateStudent,
} from '../services/students.service';

import type {
  CreateStudentInput,
  ListStudentsResponse,
  Student,
  StudentDocumentType,
  StudentDocumentTypeFilter,
  StudentMutationResponse,
  StudentStatusFilter,
  UpdateStudentInput,
} from '../types/students';

import './StudentsPage.css';

const PAGE_SIZE = 10;

const DOCUMENT_TYPE_OPTIONS: {
  value: StudentDocumentType;
  label: string;
}[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'NIE', label: 'NIE' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'OTHER', label: 'Otro' },
];

interface StudentsPageProps {
  canCreateStudents: boolean;
  canEditStudents: boolean;
  canArchiveStudents: boolean;
}

interface StudentFormState {
  studentCode: string;
  firstName: string;
  lastName1: string;
  lastName2: string;
  documentType: '' | StudentDocumentType;
  documentNumber: string;
  email: string;
  phone: string;
  birthDate: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  isActive: boolean;
}

type StudentFormMode =
  | 'create'
  | 'edit';

type StudentTextField =
  | 'studentCode'
  | 'firstName'
  | 'lastName1'
  | 'lastName2'
  | 'documentNumber'
  | 'email'
  | 'phone'
  | 'birthDate'
  | 'address'
  | 'postalCode'
  | 'city'
  | 'province'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'notes';

type FieldErrors = Record<string, string>;

function createEmptyStudentForm(): StudentFormState {
  return {
    studentCode: '',
    firstName: '',
    lastName1: '',
    lastName2: '',
    documentType: '',
    documentNumber: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    postalCode: '',
    city: '',
    province: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
    isActive: true,
  };
}

function isStudentStatusFilter(
  value: string,
): value is StudentStatusFilter {
  return [
    'all',
    'active',
    'inactive',
    'archived',
  ].includes(value);
}

function isDocumentTypeFilter(
  value: string,
): value is StudentDocumentTypeFilter {
  return [
    'all',
    'DNI',
    'NIE',
    'PASSPORT',
    'OTHER',
  ].includes(value);
}

function isDocumentType(
  value: string,
): value is StudentDocumentType {
  return [
    'DNI',
    'NIE',
    'PASSPORT',
    'OTHER',
  ].includes(value);
}

function normalizeOptionalValue(
  value: string,
): string | undefined {
  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function normalizeOptionalUppercaseValue(
  value: string,
): string | undefined {
  const normalizedValue =
    value.trim().toUpperCase();

  return normalizedValue || undefined;
}

function validateStudentForm(
  form: StudentFormState,
): FieldErrors {
  const errors: FieldErrors = {};

  if (form.firstName.trim().length < 2) {
    errors.firstName =
      'El nombre debe tener al menos 2 caracteres.';
  }

  if (form.lastName1.trim().length < 2) {
    errors.lastName1 =
      'El primer apellido debe tener al menos 2 caracteres.';
  }

  if (
    form.email.trim()
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      form.email.trim(),
    )
  ) {
    errors.email =
      'El correo electrónico no tiene un formato válido.';
  }

  if (
    form.birthDate.trim()
    && !/^\d{4}-\d{2}-\d{2}$/.test(
      form.birthDate.trim(),
    )
  ) {
    errors.birthDate =
      'La fecha de nacimiento debe tener formato AAAA-MM-DD.';
  }

  if (
    form.studentCode.trim()
    && !/^[A-Za-z0-9]+(?:[-_./][A-Za-z0-9]+)*$/.test(
      form.studentCode.trim(),
    )
  ) {
    errors.studentCode =
      'El código solo puede contener letras, números, puntos, barras, guiones y guiones bajos.';
  }

  if (
    form.documentNumber.trim()
    && !/^[A-Za-z0-9][-A-Za-z0-9 ]*$/.test(
      form.documentNumber.trim(),
    )
  ) {
    errors.documentNumber =
      'El documento solo puede contener letras, números, espacios y guiones.';
  }

  return errors;
}

function getApiFieldErrors(
  error: ApiError,
): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const detail of error.details) {
    fieldErrors[detail.field] =
      detail.message;
  }

  return fieldErrors;
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(date);
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      dateStyle: 'short',
    },
  ).format(date);
}

function getStudentStatus(
  student: Student,
): {
  label: string;
  className: string;
} {
  if (student.deletedAt) {
    return {
      label: 'Archivado',
      className: 'student-status-archived',
    };
  }

  if (!student.isActive) {
    return {
      label: 'Inactivo',
      className: 'student-status-inactive',
    };
  }

  return {
    label: 'Activo',
    className: 'student-status-active',
  };
}

function getDocumentTypeLabel(
  value: StudentDocumentType | null,
): string {
  if (!value) {
    return 'Sin tipo';
  }

  return (
    DOCUMENT_TYPE_OPTIONS.find(
      (item) => item.value === value,
    )?.label ?? value
  );
}

function createStudentPayload(
  form: StudentFormState,
): CreateStudentInput | UpdateStudentInput {
  const input: CreateStudentInput = {
    firstName:
      form.firstName.trim(),

    lastName1:
      form.lastName1.trim(),

    isActive:
      form.isActive,
  };

  const studentCode =
    normalizeOptionalUppercaseValue(
      form.studentCode,
    );

  if (studentCode !== undefined) {
    input.studentCode = studentCode;
  }

  const lastName2 =
    normalizeOptionalValue(
      form.lastName2,
    );

  if (lastName2 !== undefined) {
    input.lastName2 = lastName2;
  }

  if (form.documentType) {
    input.documentType = form.documentType;
  }

  const documentNumber =
    normalizeOptionalUppercaseValue(
      form.documentNumber,
    );

  if (documentNumber !== undefined) {
    input.documentNumber =
      documentNumber;
  }

  const email =
    normalizeOptionalValue(
      form.email,
    )?.toLowerCase();

  if (email !== undefined) {
    input.email = email;
  }

  const phone =
    normalizeOptionalValue(
      form.phone,
    );

  if (phone !== undefined) {
    input.phone = phone;
  }

  const birthDate =
    normalizeOptionalValue(
      form.birthDate,
    );

  if (birthDate !== undefined) {
    input.birthDate = birthDate;
  }

  const address =
    normalizeOptionalValue(
      form.address,
    );

  if (address !== undefined) {
    input.address = address;
  }

  const postalCode =
    normalizeOptionalValue(
      form.postalCode,
    );

  if (postalCode !== undefined) {
    input.postalCode = postalCode;
  }

  const city =
    normalizeOptionalValue(
      form.city,
    );

  if (city !== undefined) {
    input.city = city;
  }

  const province =
    normalizeOptionalValue(
      form.province,
    );

  if (province !== undefined) {
    input.province = province;
  }

  const emergencyContactName =
    normalizeOptionalValue(
      form.emergencyContactName,
    );

  if (
    emergencyContactName !== undefined
  ) {
    input.emergencyContactName =
      emergencyContactName;
  }

  const emergencyContactPhone =
    normalizeOptionalValue(
      form.emergencyContactPhone,
    );

  if (
    emergencyContactPhone !== undefined
  ) {
    input.emergencyContactPhone =
      emergencyContactPhone;
  }

  const notes =
    normalizeOptionalValue(
      form.notes,
    );

  if (notes !== undefined) {
    input.notes = notes;
  }

  return input;
}

export function StudentsPage({
  canCreateStudents,
  canEditStudents,
  canArchiveStudents,
}: StudentsPageProps) {
  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState<StudentStatusFilter>('all');

  const [
    documentType,
    setDocumentType,
  ] = useState<StudentDocumentTypeFilter>('all');

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState<ListStudentsResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  const [formMode, setFormMode] =
    useState<StudentFormMode | null>(null);

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState<number | null>(null);

  const [form, setForm] =
    useState<StudentFormState>(
      createEmptyStudentForm,
    );

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<FieldErrors>({});

  const [
    formErrorMessage,
    setFormErrorMessage,
  ] = useState<string | null>(null);

  const [
    isLoadingStudent,
    setIsLoadingStudent,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    actionKey,
    setActionKey,
  ] = useState<string | null>(null);

  const modalIsOpen =
    formMode !== null;

  const showActions =
    canEditStudents
    || canArchiveStudents;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadStudents():
    Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const studentsResult =
          await getStudents({
            search: search || undefined,
            page,
            pageSize: PAGE_SIZE,
            status,
            documentType,
          });

        if (!requestWasCancelled) {
          setResult(studentsResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de alumnos.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      requestWasCancelled = true;
    };
  }, [
    documentType,
    page,
    refreshVersion,
    search,
    status,
  ]);

  useEffect(() => {
    if (
      result
      && result.pagination.totalPages > 0
      && page > result.pagination.totalPages
    ) {
      setPage(
        result.pagination.totalPages,
      );
    }
  }, [
    page,
    result,
  ]);

  useEffect(() => {
    const studentId = selectedStudentId;

    if (
      formMode !== 'edit'
      || typeof studentId !== 'number'
    ) {
      return;
    }

    let requestWasCancelled = false;

    async function loadStudent(
      id: number,
    ): Promise<void> {
      setIsLoadingStudent(true);
      setFormErrorMessage(null);

      try {
        const response =
          await getStudent(id);

        if (requestWasCancelled) {
          return;
        }

        setForm({
          studentCode:
            response.student.studentCode ?? '',

          firstName:
            response.student.firstName,

          lastName1:
            response.student.lastName1,

          lastName2:
            response.student.lastName2 ?? '',

          documentType:
            response.student.documentType ?? '',

          documentNumber:
            response.student.documentNumber ?? '',

          email:
            response.student.email ?? '',

          phone:
            response.student.phone ?? '',

          birthDate:
            response.student.birthDate ?? '',

          address:
            response.student.address ?? '',

          postalCode:
            response.student.postalCode ?? '',

          city:
            response.student.city ?? '',

          province:
            response.student.province ?? '',

          emergencyContactName:
            response.student.emergencyContactName
            ?? '',

          emergencyContactPhone:
            response.student.emergencyContactPhone
            ?? '',

          notes:
            response.student.notes ?? '',

          isActive:
            response.student.isActive,
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(error.message);
        } else {
          setFormErrorMessage(
            'No se han podido cargar los datos del alumno.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingStudent(false);
        }
      }
    }

    void loadStudent(studentId);

    return () => {
      requestWasCancelled = true;
    };
  }, [
    formMode,
    selectedStudentId,
  ]);

  useEffect(() => {
    if (!modalIsOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (
        event.key === 'Escape'
        && !isSubmitting
      ) {
        closeForm();
      }
    }

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    isSubmitting,
    modalIsOpen,
  ]);

  function closeForm(): void {
    setFormMode(null);
    setSelectedStudentId(null);

    setForm(
      createEmptyStudentForm(),
    );

    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingStudent(false);
  }

  function openCreateForm(): void {
    setFormMode('create');
    setSelectedStudentId(null);

    setForm(
      createEmptyStudentForm(),
    );

    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function openEditForm(
    studentId: number,
  ): void {
    setFormMode('edit');
    setSelectedStudentId(studentId);

    setForm(
      createEmptyStudentForm(),
    );

    setFieldErrors({});
    setFormErrorMessage(null);
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters(): void {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setDocumentType('all');
    setPage(1);
  }

  function updateTextField(
    field: StudentTextField,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setFieldErrors(
      (currentErrors) => {
        const nextErrors = {
          ...currentErrors,
        };

        delete nextErrors[field];

        return nextErrors;
      },
    );
  }

  async function handleFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!formMode) {
      return;
    }

    const validationErrors =
      validateStudentForm(form);

    if (
      Object.keys(validationErrors)
        .length > 0
    ) {
      setFieldErrors(
        validationErrors,
      );

      setFormErrorMessage(
        'Revisa los campos señalados.',
      );

      return;
    }

    const input =
      createStudentPayload(form);

    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response:
        StudentMutationResponse;

      if (formMode === 'create') {
        response =
          await createStudent(input);

        setPage(1);
      } else {
        const studentId =
          selectedStudentId;

        if (typeof studentId !== 'number') {
          setFormErrorMessage(
            'No se ha podido identificar el alumno que se quiere editar.',
          );

          return;
        }

        response =
          await updateStudent(
            studentId,
            input,
          );
      }

      setSuccessMessage(
        response.message,
      );

      closeForm();

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFormErrorMessage(
          error.message,
        );

        setFieldErrors(
          getApiFieldErrors(error),
        );
      } else {
        setFormErrorMessage(
          'No se ha podido guardar el alumno.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(
    student: Student,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar a ${student.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey =
      `archive-${student.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await archiveStudent(student.id);

      setSuccessMessage(
        response.message,
      );

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido archivar el alumno.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  async function handleRestore(
    student: Student,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar a ${student.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    const currentActionKey =
      `restore-${student.id}`;

    setActionKey(currentActionKey);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await restoreStudent(student.id);

      setSuccessMessage(
        response.message,
      );

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido restaurar el alumno.',
        );
      }
    } finally {
      setActionKey(null);
    }
  }

  const totalPages = Math.max(
    1,
    result?.pagination.totalPages ?? 1,
  );

  return (
    <main className="students-page">
      <section className="students-header">
        <div>
          <p className="eyebrow">
            Gestión académica
          </p>

          <h2>Alumnos</h2>

          <p>
            Gestiona el expediente base del alumno
            sin asignarlo a un grupo ni a un nivel
            único. La matrícula por módulos se
            creará en el siguiente bloque.
          </p>
        </div>

        {canCreateStudents && (
          <button
            className="button button-primary"
            type="button"
            onClick={openCreateForm}
          >
            Nuevo alumno
          </button>
        )}
      </section>

      <section className="students-panel">
        {successMessage && (
          <div
            className="alert alert-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            className="alert alert-error"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form
          className="students-filters"
          onSubmit={handleSearchSubmit}
        >
          <div className="students-filter-field">
            <label htmlFor="student-search">
              Buscar
            </label>

            <input
              id="student-search"
              type="search"
              value={searchInput}
              placeholder="Nombre, apellidos, documento, correo..."
              onChange={(event) => {
                setSearchInput(
                  event.target.value,
                );
              }}
            />
          </div>

          <div className="students-filter-field">
            <label htmlFor="student-status">
              Estado
            </label>

            <select
              id="student-status"
              value={status}
              onChange={(event) => {
                if (
                  isStudentStatusFilter(
                    event.target.value,
                  )
                ) {
                  setStatus(
                    event.target.value,
                  );

                  setPage(1);
                }
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
          </div>

          <div className="students-filter-field">
            <label htmlFor="student-document-type-filter">
              Documento
            </label>

            <select
              id="student-document-type-filter"
              value={documentType}
              onChange={(event) => {
                if (
                  isDocumentTypeFilter(
                    event.target.value,
                  )
                ) {
                  setDocumentType(
                    event.target.value,
                  );

                  setPage(1);
                }
              }}
            >
              <option value="all">
                Todos
              </option>

              {DOCUMENT_TYPE_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="students-filter-actions">
            <button
              className="button button-primary"
              type="submit"
            >
              Buscar
            </button>

            <button
              className="button button-secondary"
              type="button"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          </div>
        </form>

        {isLoading
          ? (
            <div className="students-loading">
              <div className="spinner" />

              <p>
                Cargando alumnos...
              </p>
            </div>
          )
          : result
            && result.items.length > 0
            ? (
              <>
                <div className="students-table-wrapper">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Documento</th>
                        <th>Contacto</th>
                        <th>Nacimiento</th>
                        <th>Estado</th>
                        <th>Alta</th>

                        {showActions && (
                          <th>Acciones</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {result.items.map((student) => {
                        const studentStatus =
                          getStudentStatus(student);

                        const rowActionRunning =
                          actionKey?.endsWith(
                            `-${student.id}`,
                          ) ?? false;

                        return (
                          <tr key={student.id}>
                            <td>
                              <div className="student-identity">
                                <strong>
                                  {student.fullName}
                                </strong>

                                <span className="student-code">
                                  {student.studentCode
                                    || `ID ${student.id}`}
                                </span>

                                <span>
                                  {student.city || 'Sin localidad'}
                                  {student.province
                                    ? ` · ${student.province}`
                                    : ''}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="student-document">
                                <strong>
                                  {getDocumentTypeLabel(
                                    student.documentType,
                                  )}
                                </strong>

                                <span>
                                  {student.documentNumber
                                    || 'Sin documento'}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="student-contact">
                                <strong>
                                  {student.email
                                    || 'Sin correo'}
                                </strong>

                                <span>
                                  {student.phone
                                    || 'Sin teléfono'}
                                </span>
                              </div>
                            </td>

                            <td>
                              {formatDate(
                                student.birthDate,
                              )}
                            </td>

                            <td>
                              <span
                                className={
                                  `student-status ${studentStatus.className}`
                                }
                              >
                                {studentStatus.label}
                              </span>
                            </td>

                            <td>
                              {formatDateTime(
                                student.createdAt,
                              )}
                            </td>

                            {showActions && (
                              <td>
                                <div className="student-actions">
                                  {canEditStudents
                                    && !student.deletedAt
                                    && (
                                      <button
                                        className="student-action-button student-action-edit"
                                        type="button"
                                        disabled={
                                          rowActionRunning
                                        }
                                        onClick={() => {
                                          openEditForm(
                                            student.id,
                                          );
                                        }}
                                      >
                                        Editar
                                      </button>
                                    )}

                                  {canArchiveStudents
                                    && !student.deletedAt
                                    && (
                                      <button
                                        className="student-action-button student-action-archive"
                                        type="button"
                                        disabled={
                                          rowActionRunning
                                        }
                                        onClick={() => {
                                          void handleArchive(
                                            student,
                                          );
                                        }}
                                      >
                                        Archivar
                                      </button>
                                    )}

                                  {canArchiveStudents
                                    && student.deletedAt
                                    && (
                                      <button
                                        className="student-action-button student-action-restore"
                                        type="button"
                                        disabled={
                                          rowActionRunning
                                        }
                                        onClick={() => {
                                          void handleRestore(
                                            student,
                                          );
                                        }}
                                      >
                                        Restaurar
                                      </button>
                                    )}

                                  {rowActionRunning && (
                                    <span className="student-action-running">
                                      Procesando...
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="students-pagination">
                  <p>
                    {result.pagination.total}
                    {' '}
                    alumno o alumnos encontrados
                  </p>

                  <div className="students-pagination-controls">
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={
                        page <= 1
                        || isLoading
                      }
                      onClick={() => {
                        setPage(
                          (currentPage) =>
                            Math.max(
                              1,
                              currentPage - 1,
                            ),
                        );
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
                      disabled={
                        page >= totalPages
                        || isLoading
                      }
                      onClick={() => {
                        setPage(
                          (currentPage) =>
                            currentPage + 1,
                        );
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )
            : (
              <div className="students-empty">
                <h3>
                  No se han encontrado alumnos
                </h3>

                <p>
                  Modifica los filtros o crea un
                  nuevo alumno.
                </p>
              </div>
            )}
      </section>

      {modalIsOpen && (
        <div
          className="students-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
              && !isSubmitting
            ) {
              closeForm();
            }
          }}
        >
          <section
            className="students-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            <header className="students-modal-header">
              <div>
                <p className="eyebrow">
                  {formMode === 'create'
                    ? 'Nuevo registro'
                    : 'Edición'}
                </p>

                <h2 id="student-modal-title">
                  {formMode === 'create'
                    ? 'Crear alumno'
                    : 'Editar alumno'}
                </h2>

                <p>
                  El alumno se crea sin grupo y sin
                  nivel único. Sus módulos se
                  asignarán mediante matrícula
                  modular.
                </p>
              </div>

              <button
                className="students-modal-close"
                type="button"
                aria-label="Cerrar"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            {isLoadingStudent
              ? (
                <div className="students-modal-loading">
                  <div className="spinner" />

                  <p>
                    Cargando alumno...
                  </p>
                </div>
              )
              : (
                <form
                  className="student-form"
                  onSubmit={(event) => {
                    void handleFormSubmit(
                      event,
                    );
                  }}
                >
                  {formErrorMessage && (
                    <div
                      className="alert alert-error"
                      role="alert"
                    >
                      {formErrorMessage}
                    </div>
                  )}

                  <div className="student-form-grid">
                    <FormInput
                      id="student-code"
                      label="Código interno"
                      value={form.studentCode}
                      error={fieldErrors.studentCode}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'studentCode',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-birth-date"
                      label="Fecha de nacimiento"
                      type="date"
                      value={form.birthDate}
                      error={fieldErrors.birthDate}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'birthDate',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-first-name"
                      label="Nombre"
                      value={form.firstName}
                      error={fieldErrors.firstName}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'firstName',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-last-name-1"
                      label="Primer apellido"
                      value={form.lastName1}
                      error={fieldErrors.lastName1}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'lastName1',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-last-name-2"
                      label="Segundo apellido"
                      value={form.lastName2}
                      error={fieldErrors.lastName2}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'lastName2',
                          value,
                        );
                      }}
                    />

                    <div className="student-form-field">
                      <label htmlFor="student-document-type">
                        Tipo de documento
                      </label>

                      <select
                        id="student-document-type"
                        value={form.documentType}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          const nextValue =
                            event.target.value;

                          setForm(
                            (currentForm) => ({
                              ...currentForm,
                              documentType:
                                isDocumentType(
                                  nextValue,
                                )
                                  ? nextValue
                                  : '',
                            }),
                          );
                        }}
                      >
                        <option value="">
                          Sin tipo
                        </option>

                        {DOCUMENT_TYPE_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ),
                        )}
                      </select>

                      {fieldErrors.documentType && (
                        <span className="student-field-error">
                          {fieldErrors.documentType}
                        </span>
                      )}
                    </div>

                    <FormInput
                      id="student-document-number"
                      label="Número de documento"
                      value={form.documentNumber}
                      error={fieldErrors.documentNumber}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'documentNumber',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-email"
                      label="Correo electrónico"
                      type="email"
                      value={form.email}
                      error={fieldErrors.email}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'email',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-phone"
                      label="Teléfono"
                      type="tel"
                      value={form.phone}
                      error={fieldErrors.phone}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'phone',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-address"
                      label="Dirección"
                      value={form.address}
                      error={fieldErrors.address}
                      disabled={isSubmitting}
                      wide
                      onChange={(value) => {
                        updateTextField(
                          'address',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-postal-code"
                      label="Código postal"
                      value={form.postalCode}
                      error={fieldErrors.postalCode}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'postalCode',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-city"
                      label="Localidad"
                      value={form.city}
                      error={fieldErrors.city}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'city',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-province"
                      label="Provincia"
                      value={form.province}
                      error={fieldErrors.province}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'province',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-emergency-name"
                      label="Contacto de emergencia"
                      value={form.emergencyContactName}
                      error={fieldErrors.emergencyContactName}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'emergencyContactName',
                          value,
                        );
                      }}
                    />

                    <FormInput
                      id="student-emergency-phone"
                      label="Teléfono de emergencia"
                      type="tel"
                      value={form.emergencyContactPhone}
                      error={fieldErrors.emergencyContactPhone}
                      disabled={isSubmitting}
                      onChange={(value) => {
                        updateTextField(
                          'emergencyContactPhone',
                          value,
                        );
                      }}
                    />

                    <div className="student-form-field student-form-field-wide">
                      <label htmlFor="student-notes">
                        Observaciones
                      </label>

                      <textarea
                        id="student-notes"
                        value={form.notes}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          updateTextField(
                            'notes',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.notes && (
                        <span className="student-field-error">
                          {fieldErrors.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <label className="student-active-option">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setForm(
                          (currentForm) => ({
                            ...currentForm,
                            isActive:
                              event.target.checked,
                          }),
                        );
                      }}
                    />

                    <span>
                      <strong>
                        Alumno activo
                      </strong>

                      <small>
                        Un alumno inactivo conserva
                        su historial, pero no debe
                        utilizarse para nuevas
                        matrículas ordinarias.
                      </small>
                    </span>
                  </label>

                  <footer className="student-form-actions">
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={isSubmitting}
                      onClick={closeForm}
                    >
                      Cancelar
                    </button>

                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={
                        isSubmitting
                        || isLoadingStudent
                      }
                    >
                      {isSubmitting
                        ? 'Guardando...'
                        : formMode === 'create'
                          ? 'Crear alumno'
                          : 'Guardar cambios'}
                    </button>
                  </footer>
                </form>
              )}
          </section>
        </div>
      )}
    </main>
  );
}

interface FormInputProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: string;
  disabled: boolean;
  wide?: boolean;
  onChange: (value: string) => void;
}

function FormInput({
  id,
  label,
  value,
  error,
  type = 'text',
  disabled,
  wide = false,
  onChange,
}: FormInputProps) {
  return (
    <div
      className={
        wide
          ? 'student-form-field student-form-field-wide'
          : 'student-form-field'
      }
    >
      <label htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />

      {error && (
        <span className="student-field-error">
          {error}
        </span>
      )}
    </div>
  );
}

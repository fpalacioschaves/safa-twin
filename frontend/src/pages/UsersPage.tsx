import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  archiveUser,
  createUser,
  getAssignableRoles,
  getUser,
  getUsers,
  restoreUser,
  setUserActiveStatus,
  updateUser,
} from '../services/users.service';

import type {
  AssignableRole,
  CreateUserInput,
  ListUsersResponse,
  UpdateUserInput,
  UserListItem,
  UserMutationResponse,
  UserStatusFilter,
} from '../types/users';

import './UsersPage.css';

const PAGE_SIZE = 10;
const MINIMUM_PASSWORD_LENGTH = 12;

interface UsersPageProps {
  currentUserId: number;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canChangeUserStatus: boolean;
  canArchiveUsers: boolean;
}

interface UserFormState {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  roleIds: number[];
}

type UserFormMode =
  | 'create'
  | 'edit';

type UserFormTextField =
  | 'name'
  | 'email'
  | 'password'
  | 'passwordConfirmation';

type FieldErrors = Record<string, string>;

function createEmptyUserForm(): UserFormState {
  return {
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    roleIds: [],
  };
}

function isUserStatusFilter(
  value: string,
): value is UserStatusFilter {
  return (
    value === 'all'
    || value === 'active'
    || value === 'archived'
  );
}

function formatDate(
  dateValue: string | null,
): string {
  if (!dateValue) {
    return 'Nunca';
  }

  const date = new Date(dateValue);

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

function getUserStatus(
  user: UserListItem,
): {
  label: string;
  className: string;
} {
  if (user.deletedAt) {
    return {
      label: 'Archivado',
      className: 'user-status-archived',
    };
  }

  if (!user.isActive) {
    return {
      label: 'Inactivo',
      className: 'user-status-inactive',
    };
  }

  return {
    label: 'Activo',
    className: 'user-status-active',
  };
}

function validateUserForm(
  form: UserFormState,
  mode: UserFormMode,
): FieldErrors {
  const errors: FieldErrors = {};

  const normalizedName = form.name.trim();
  const normalizedEmail = form.email.trim();

  if (normalizedName.length < 2) {
    errors.name =
      'El nombre debe tener al menos 2 caracteres.';
  }

  if (normalizedName.length > 150) {
    errors.name =
      'El nombre no puede superar los 150 caracteres.';
  }

  if (!normalizedEmail) {
    errors.email =
      'El correo electrónico es obligatorio.';
  } else {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      errors.email =
        'El correo electrónico no tiene un formato válido.';
    }
  }

  const passwordWasProvided =
    form.password.length > 0;

  const confirmationWasProvided =
    form.passwordConfirmation.length > 0;

  if (
    mode === 'create'
    || passwordWasProvided
    || confirmationWasProvided
  ) {
    if (
      form.password.length
      < MINIMUM_PASSWORD_LENGTH
    ) {
      errors.password =
        `La contraseña debe tener al menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`;
    }

    if (form.password.length > 72) {
      errors.password =
        'La contraseña no puede superar los 72 caracteres.';
    }

    if (!form.passwordConfirmation) {
      errors.passwordConfirmation =
        'Debes confirmar la contraseña.';
    } else if (
      form.password
      !== form.passwordConfirmation
    ) {
      errors.passwordConfirmation =
        'Las contraseñas no coinciden.';
    }
  }

  if (form.roleIds.length === 0) {
    errors.roleIds =
      'Debes seleccionar al menos un rol.';
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

export function UsersPage({
  currentUserId,
  canCreateUsers,
  canEditUsers,
  canChangeUserStatus,
  canArchiveUsers,
}: UsersPageProps) {
  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState<UserStatusFilter>('all');

  const [page, setPage] =
    useState(1);

  const [result, setResult] =
    useState<ListUsersResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  const [roles, setRoles] =
    useState<AssignableRole[]>([]);

  const [rolesLoaded, setRolesLoaded] =
    useState(false);

  const [isLoadingRoles, setIsLoadingRoles] =
    useState(false);

  const [
    rolesErrorMessage,
    setRolesErrorMessage,
  ] = useState<string | null>(null);

  const [
    rolesRequestVersion,
    setRolesRequestVersion,
  ] = useState(0);

  const [formMode, setFormMode] =
    useState<UserFormMode | null>(null);

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState<number | null>(null);

  const [form, setForm] =
    useState<UserFormState>(
      createEmptyUserForm,
    );

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [
    formErrorMessage,
    setFormErrorMessage,
  ] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [
    isLoadingUserDetail,
    setIsLoadingUserDetail,
  ] = useState(false);

  const [
    actionUserId,
    setActionUserId,
  ] = useState<number | null>(null);

  const modalIsOpen =
    formMode !== null;

  const isEditingOwnUser =
    formMode === 'edit'
    && selectedUserId === currentUserId;

  const showActions =
    canEditUsers
    || canChangeUserStatus
    || canArchiveUsers;

  useEffect(() => {
    let requestWasCancelled = false;

    async function loadUsers(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const usersResult = await getUsers({
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
          status,
        });

        if (!requestWasCancelled) {
          setResult(usersResult);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            'No se ha podido cargar el listado de usuarios.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      requestWasCancelled = true;
    };
  }, [
    page,
    refreshVersion,
    search,
    status,
  ]);

  useEffect(() => {
    if (
      !modalIsOpen
      || rolesLoaded
    ) {
      return;
    }

    let requestWasCancelled = false;

    async function loadRoles(): Promise<void> {
      setIsLoadingRoles(true);
      setRolesErrorMessage(null);

      try {
        const rolesResult =
          await getAssignableRoles();

        if (!requestWasCancelled) {
          setRoles(rolesResult.items);
          setRolesLoaded(true);
        }
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setRolesErrorMessage(
            error.message,
          );
        } else {
          setRolesErrorMessage(
            'No se han podido cargar los roles.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingRoles(false);
        }
      }
    }

    void loadRoles();

    return () => {
      requestWasCancelled = true;
    };
  }, [
    modalIsOpen,
    rolesLoaded,
    rolesRequestVersion,
  ]);

  useEffect(() => {
    if (
      formMode !== 'edit'
      || selectedUserId === null
    ) {
      return;
    }

    let requestWasCancelled = false;

    async function loadUserDetail(
      userId: number,
    ): Promise<void> {
      setIsLoadingUserDetail(true);
      setFormErrorMessage(null);

      try {
        const response =
          await getUser(userId);

        if (requestWasCancelled) {
          return;
        }

        setForm({
          name: response.user.name,
          email: response.user.email,
          password: '',
          passwordConfirmation: '',

          roleIds: response.user.roles.map(
            (role) => role.id,
          ),
        });
      } catch (error: unknown) {
        if (requestWasCancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setFormErrorMessage(
            error.message,
          );
        } else {
          setFormErrorMessage(
            'No se han podido cargar los datos del usuario.',
          );
        }
      } finally {
        if (!requestWasCancelled) {
          setIsLoadingUserDetail(false);
        }
      }
    }

    void loadUserDetail(selectedUserId);

    return () => {
      requestWasCancelled = true;
    };
  }, [
    formMode,
    selectedUserId,
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
        setFormMode(null);
        setSelectedUserId(null);
        setForm(createEmptyUserForm());
        setFieldErrors({});
        setFormErrorMessage(null);
        setIsLoadingUserDetail(false);
      }
    }

    document.body.style.overflow = 'hidden';

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
    modalIsOpen,
    isSubmitting,
  ]);

  function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusChange(
    newStatus: UserStatusFilter,
  ): void {
    setPage(1);
    setStatus(newStatus);
  }

  function clearFieldError(
    field: string,
  ): void {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = {
        ...currentErrors,
      };

      delete nextErrors[field];

      return nextErrors;
    });
  }

  function updateTextField(
    field: UserFormTextField,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    clearFieldError(field);
    setFormErrorMessage(null);
  }

  function toggleRole(
    roleId: number,
  ): void {
    if (isEditingOwnUser) {
      return;
    }

    setForm((currentForm) => {
      const roleIsSelected =
        currentForm.roleIds.includes(roleId);

      return {
        ...currentForm,

        roleIds: roleIsSelected
          ? currentForm.roleIds.filter(
            (selectedRoleId) => (
              selectedRoleId !== roleId
            ),
          )
          : [
            ...currentForm.roleIds,
            roleId,
          ],
      };
    });

    clearFieldError('roleIds');
    setFormErrorMessage(null);
  }

  function resetModal(): void {
    setFormMode(null);
    setSelectedUserId(null);
    setForm(createEmptyUserForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setIsLoadingUserDetail(false);
  }

  function closeModal(): void {
    if (isSubmitting) {
      return;
    }

    resetModal();
  }

  function openCreateModal(): void {
    if (!canCreateUsers) {
      return;
    }

    setSuccessMessage(null);
    setForm(createEmptyUserForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setSelectedUserId(null);
    setFormMode('create');
  }

  function openEditModal(
    userId: number,
  ): void {
    if (!canEditUsers) {
      return;
    }

    setSuccessMessage(null);
    setForm(createEmptyUserForm());
    setFieldErrors({});
    setFormErrorMessage(null);
    setSelectedUserId(userId);
    setFormMode('edit');
  }

  function retryRolesLoading(): void {
    setRolesErrorMessage(null);
    setRolesLoaded(false);

    setRolesRequestVersion(
      (currentVersion) => (
        currentVersion + 1
      ),
    );
  }

  function refreshUsers(): void {
    setRefreshVersion(
      (currentVersion) => (
        currentVersion + 1
      ),
    );
  }

  async function handleUserFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (formMode === null) {
      return;
    }

    const validationErrors =
      validateUserForm(
        form,
        formMode,
      );

    setFieldErrors(validationErrors);
    setFormErrorMessage(null);

    if (
      Object.keys(validationErrors).length
      > 0
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      let response: UserMutationResponse;

      if (formMode === 'create') {
        const input: CreateUserInput = {
          name: form.name.trim(),

          email:
            form.email.trim().toLowerCase(),

          password: form.password,

          passwordConfirmation:
            form.passwordConfirmation,

          roleIds: form.roleIds,
        };

        response = await createUser(input);
      } else {
        const userId = selectedUserId;

        if (userId === null) {
          throw new Error(
            'No se ha seleccionado ningún usuario.',
          );
        }

        const input: UpdateUserInput = {
          name: form.name.trim(),

          email:
            form.email.trim().toLowerCase(),

          roleIds: form.roleIds,
        };

        if (
          form.password.length > 0
          || form.passwordConfirmation.length > 0
        ) {
          input.password =
            form.password;

          input.passwordConfirmation =
            form.passwordConfirmation;
        }

        response = await updateUser(
          userId,
          input,
        );
      }

      setSuccessMessage(response.message);
      resetModal();

      setSearchInput('');
      setSearch('');
      setStatus('all');
      setPage(1);

      refreshUsers();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFieldErrors(
          getApiFieldErrors(error),
        );

        setFormErrorMessage(
          error.message,
        );
      } else {
        setFormErrorMessage(
          formMode === 'create'
            ? 'No se ha podido crear el usuario.'
            : 'No se ha podido actualizar el usuario.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function executeUserAction(
    userId: number,
    action: () => Promise<UserMutationResponse>,
  ): Promise<void> {
    setActionUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await action();

      setSuccessMessage(response.message);
      refreshUsers();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido completar la operación.',
        );
      }
    } finally {
      setActionUserId(null);
    }
  }

  async function handleToggleActiveStatus(
    user: UserListItem,
  ): Promise<void> {
    const newStatus = !user.isActive;

    const confirmationMessage = newStatus
      ? `¿Quieres activar a "${user.name}"?`
      : `¿Quieres desactivar a "${user.name}"? Sus sesiones activas se cerrarán.`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    await executeUserAction(
      user.id,
      () => setUserActiveStatus(
        user.id,
        newStatus,
      ),
    );
  }

  async function handleArchiveUser(
    user: UserListItem,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres archivar a "${user.name}"? El usuario no podrá iniciar sesión, pero conservará su historial.`,
    );

    if (!confirmed) {
      return;
    }

    await executeUserAction(
      user.id,
      () => archiveUser(user.id),
    );
  }

  async function handleRestoreUser(
    user: UserListItem,
  ): Promise<void> {
    const confirmed = window.confirm(
      `¿Quieres restaurar a "${user.name}"? El usuario volverá a quedar activo.`,
    );

    if (!confirmed) {
      return;
    }

    await executeUserAction(
      user.id,
      () => restoreUser(user.id),
    );
  }

  const pagination = result?.pagination;

  const modalTitle =
    formMode === 'create'
      ? 'Crear usuario'
      : 'Editar usuario';

  const submitButtonText =
    formMode === 'create'
      ? 'Crear usuario'
      : 'Guardar cambios';

  const submittingButtonText =
    formMode === 'create'
      ? 'Creando usuario...'
      : 'Guardando cambios...';

  return (
    <main className="users-page">
      <section className="users-header">
        <div>
          <p className="eyebrow">
            Administración
          </p>

          <h2>Usuarios</h2>

          <p>
            Consulta y administra los usuarios,
            sus estados y los roles asignados.
          </p>
        </div>

        <button
          className="button button-primary"
          type="button"
          disabled={!canCreateUsers}
          title={
            canCreateUsers
              ? 'Crear un nuevo usuario.'
              : 'No tienes permisos para crear usuarios y asignar roles.'
          }
          onClick={openCreateModal}
        >
          Nuevo usuario
        </button>
      </section>

      <section className="users-panel">
        {successMessage && (
          <div
            className="alert alert-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <form
          className="users-filters"
          onSubmit={handleSearch}
        >
          <div className="users-search">
            <label htmlFor="users-search">
              Buscar
            </label>

            <input
              id="users-search"
              type="search"
              value={searchInput}
              placeholder="Nombre o correo electrónico"
              onChange={(event) => {
                setSearchInput(
                  event.target.value,
                );
              }}
            />
          </div>

          <div className="users-status-filter">
            <label htmlFor="users-status">
              Estado
            </label>

            <select
              id="users-status"
              value={status}
              onChange={(event) => {
                const selectedStatus =
                  event.target.value;

                if (
                  isUserStatusFilter(
                    selectedStatus,
                  )
                ) {
                  handleStatusChange(
                    selectedStatus,
                  );
                }
              }}
            >
              <option value="all">
                Todos
              </option>

              <option value="active">
                Activos
              </option>

              <option value="archived">
                Archivados
              </option>
            </select>
          </div>

          <button
            className="button button-secondary"
            type="submit"
          >
            Buscar
          </button>
        </form>

        {errorMessage && (
          <div
            className="alert alert-error"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="users-loading">
            Cargando usuarios...
          </div>
        )}

        {!isLoading
          && result
          && result.items.length === 0
          && (
            <div className="users-empty">
              No se han encontrado usuarios
              con los filtros seleccionados.
            </div>
          )}

        {!isLoading
          && result
          && result.items.length > 0
          && (
            <>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Roles</th>
                      <th>Estado</th>
                      <th>Último acceso</th>

                      {showActions && (
                        <th>Acciones</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {result.items.map((user) => {
                      const userStatus =
                        getUserStatus(user);

                      const isOwnUser =
                        user.id === currentUserId;

                      const actionIsRunning =
                        actionUserId === user.id;

                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="user-identity">
                              <strong>
                                {user.name}

                                {isOwnUser && (
                                  <span className="current-user-label">
                                    Tú
                                  </span>
                                )}
                              </strong>

                              <span>
                                {user.email}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="user-role-list">
                              {user.roles.length > 0
                                ? user.roles.map(
                                  (role) => (
                                    <span
                                      className="user-role-badge"
                                      key={role.slug}
                                    >
                                      {role.name}
                                    </span>
                                  ),
                                )
                                : (
                                  <span className="user-no-roles">
                                    Sin roles
                                  </span>
                                )}
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                `user-status ${userStatus.className}`
                              }
                            >
                              {userStatus.label}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              user.lastLoginAt,
                            )}
                          </td>

                          {showActions && (
                            <td>
                              <div className="users-actions">
                                {canEditUsers
                                  && !user.deletedAt
                                  && (
                                    <button
                                      className="button button-secondary button-small"
                                      type="button"
                                      disabled={
                                        actionIsRunning
                                      }
                                      onClick={() => {
                                        openEditModal(
                                          user.id,
                                        );
                                      }}
                                    >
                                      Editar
                                    </button>
                                  )}

                                {canChangeUserStatus
                                  && !user.deletedAt
                                  && (
                                    <button
                                      className={
                                        user.isActive
                                          ? 'button button-warning button-small'
                                          : 'button button-success button-small'
                                      }
                                      type="button"
                                      disabled={
                                        actionIsRunning
                                        || (
                                          isOwnUser
                                          && user.isActive
                                        )
                                      }
                                      title={
                                        isOwnUser
                                          && user.isActive
                                          ? 'No puedes desactivar tu propio usuario.'
                                          : undefined
                                      }
                                      onClick={() => {
                                        void handleToggleActiveStatus(
                                          user,
                                        );
                                      }}
                                    >
                                      {user.isActive
                                        ? 'Desactivar'
                                        : 'Activar'}
                                    </button>
                                  )}

                                {canArchiveUsers
                                  && !user.deletedAt
                                  && (
                                    <button
                                      className="button button-danger button-small"
                                      type="button"
                                      disabled={
                                        actionIsRunning
                                        || isOwnUser
                                      }
                                      title={
                                        isOwnUser
                                          ? 'No puedes archivar tu propio usuario.'
                                          : undefined
                                      }
                                      onClick={() => {
                                        void handleArchiveUser(
                                          user,
                                        );
                                      }}
                                    >
                                      Archivar
                                    </button>
                                  )}

                                {canArchiveUsers
                                  && user.deletedAt
                                  && (
                                    <button
                                      className="button button-success button-small"
                                      type="button"
                                      disabled={
                                        actionIsRunning
                                      }
                                      onClick={() => {
                                        void handleRestoreUser(
                                          user,
                                        );
                                      }}
                                    >
                                      Restaurar
                                    </button>
                                  )}

                                {actionIsRunning && (
                                  <span className="action-running">
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

              {pagination && (
                <footer className="users-pagination">
                  <p>
                    {pagination.total}
                    {' '}
                    usuario
                    {pagination.total === 1
                      ? ''
                      : 's'}
                  </p>

                  <div className="pagination-controls">
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={
                        pagination.page <= 1
                      }
                      onClick={() => {
                        setPage(
                          pagination.page - 1,
                        );
                      }}
                    >
                      Anterior
                    </button>

                    <span>
                      Página
                      {' '}
                      {pagination.page}
                      {' '}
                      de
                      {' '}
                      {Math.max(
                        pagination.totalPages,
                        1,
                      )}
                    </span>

                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={
                        pagination.page
                        >= pagination.totalPages
                      }
                      onClick={() => {
                        setPage(
                          pagination.page + 1,
                        );
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </footer>
              )}
            </>
          )}
      </section>

      {modalIsOpen && (
        <div
          className="users-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target
              === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <section
            className="users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
          >
            <header className="users-modal-header">
              <div>
                <p className="eyebrow">
                  Administración
                </p>

                <h2 id="user-form-title">
                  {modalTitle}
                </h2>

                <p>
                  {formMode === 'create'
                    ? 'Introduce los datos de acceso y selecciona al menos un rol.'
                    : 'Modifica los datos del usuario y guarda los cambios.'}
                </p>
              </div>

              <button
                className="users-modal-close"
                type="button"
                aria-label="Cerrar formulario"
                disabled={isSubmitting}
                onClick={closeModal}
              >
                ×
              </button>
            </header>

            <form
              className="create-user-form"
              onSubmit={(event) => {
                void handleUserFormSubmit(
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

              {isLoadingUserDetail && (
                <div className="user-detail-loading">
                  Cargando datos del usuario...
                </div>
              )}

              {!isLoadingUserDetail && (
                <>
                  {isEditingOwnUser && (
                    <div className="alert alert-information">
                      Puedes cambiar tu nombre y correo,
                      pero no tus propios roles ni tu
                      contraseña desde esta pantalla.
                    </div>
                  )}

                  <div className="create-user-grid">
                    <div className="create-user-field">
                      <label htmlFor="user-form-name">
                        Nombre completo
                      </label>

                      <input
                        id="user-form-name"
                        type="text"
                        autoComplete="name"
                        autoFocus
                        maxLength={150}
                        value={form.name}
                        aria-invalid={
                          Boolean(
                            fieldErrors.name,
                          )
                        }
                        onChange={(event) => {
                          updateTextField(
                            'name',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.name && (
                        <span className="field-error">
                          {fieldErrors.name}
                        </span>
                      )}
                    </div>

                    <div className="create-user-field">
                      <label htmlFor="user-form-email">
                        Correo electrónico
                      </label>

                      <input
                        id="user-form-email"
                        type="email"
                        autoComplete="email"
                        maxLength={191}
                        value={form.email}
                        aria-invalid={
                          Boolean(
                            fieldErrors.email,
                          )
                        }
                        onChange={(event) => {
                          updateTextField(
                            'email',
                            event.target.value,
                          );
                        }}
                      />

                      {fieldErrors.email && (
                        <span className="field-error">
                          {fieldErrors.email}
                        </span>
                      )}
                    </div>

                    {!isEditingOwnUser && (
                      <>
                        <div className="create-user-field">
                          <label htmlFor="user-form-password">
                            {formMode === 'create'
                              ? 'Contraseña'
                              : 'Nueva contraseña (opcional)'}
                          </label>

                          <input
                            id="user-form-password"
                            type="password"
                            autoComplete="new-password"
                            minLength={
                              MINIMUM_PASSWORD_LENGTH
                            }
                            maxLength={72}
                            value={form.password}
                            aria-invalid={
                              Boolean(
                                fieldErrors.password,
                              )
                            }
                            onChange={(event) => {
                              updateTextField(
                                'password',
                                event.target.value,
                              );
                            }}
                          />

                          <span className="field-help">
                            {formMode === 'create'
                              ? 'Mínimo 12 caracteres.'
                              : 'Déjala vacía para conservar la contraseña actual.'}
                          </span>

                          {fieldErrors.password && (
                            <span className="field-error">
                              {fieldErrors.password}
                            </span>
                          )}
                        </div>

                        <div className="create-user-field">
                          <label htmlFor="user-form-password-confirmation">
                            Confirmar contraseña
                          </label>

                          <input
                            id="user-form-password-confirmation"
                            type="password"
                            autoComplete="new-password"
                            minLength={
                              MINIMUM_PASSWORD_LENGTH
                            }
                            maxLength={72}
                            value={
                              form.passwordConfirmation
                            }
                            aria-invalid={
                              Boolean(
                                fieldErrors
                                  .passwordConfirmation,
                              )
                            }
                            onChange={(event) => {
                              updateTextField(
                                'passwordConfirmation',
                                event.target.value,
                              );
                            }}
                          />

                          {fieldErrors
                            .passwordConfirmation
                            && (
                              <span className="field-error">
                                {
                                  fieldErrors
                                    .passwordConfirmation
                                }
                              </span>
                            )}
                        </div>
                      </>
                    )}
                  </div>

                  <fieldset className="roles-fieldset">
                    <legend>Roles</legend>

                    <p>
                      Un usuario puede tener uno o varios
                      roles simultáneamente.
                    </p>

                    {isEditingOwnUser && (
                      <p className="roles-locked-message">
                        Tus propios roles están bloqueados
                        para evitar que pierdas el acceso
                        administrativo accidentalmente.
                      </p>
                    )}

                    {isLoadingRoles && (
                      <div className="roles-loading">
                        Cargando roles...
                      </div>
                    )}

                    {rolesErrorMessage && (
                      <div className="roles-error">
                        <div
                          className="alert alert-error"
                          role="alert"
                        >
                          {rolesErrorMessage}
                        </div>

                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={retryRolesLoading}
                        >
                          Reintentar
                        </button>
                      </div>
                    )}

                    {!isLoadingRoles
                      && !rolesErrorMessage
                      && roles.length === 0
                      && (
                        <div className="roles-empty">
                          No hay roles disponibles.
                        </div>
                      )}

                    {!isLoadingRoles
                      && !rolesErrorMessage
                      && roles.length > 0
                      && (
                        <div className="roles-grid">
                          {roles.map((role) => {
                            const roleIsSelected =
                              form.roleIds.includes(
                                role.id,
                              );

                            return (
                              <label
                                className={
                                  roleIsSelected
                                    ? 'role-option role-option-selected'
                                    : 'role-option'
                                }
                                key={role.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    roleIsSelected
                                  }
                                  disabled={
                                    isEditingOwnUser
                                  }
                                  onChange={() => {
                                    toggleRole(role.id);
                                  }}
                                />

                                <span className="role-option-content">
                                  <strong>
                                    {role.name}
                                  </strong>

                                  <span>
                                    {
                                      role.description
                                      ?? 'Sin descripción.'
                                    }
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                    {fieldErrors.roleIds && (
                      <span className="field-error">
                        {fieldErrors.roleIds}
                      </span>
                    )}
                  </fieldset>
                </>
              )}

              <footer className="users-modal-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isSubmitting}
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button
                  className="button button-primary"
                  type="submit"
                  disabled={
                    isSubmitting
                    || isLoadingUserDetail
                    || isLoadingRoles
                    || roles.length === 0
                    || Boolean(
                      rolesErrorMessage,
                    )
                  }
                >
                  {isSubmitting
                    ? submittingButtonText
                    : submitButtonText}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
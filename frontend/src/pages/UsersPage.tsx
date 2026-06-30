import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
} from '../services/api.service';

import {
  getUsers,
} from '../services/users.service';

import type {
  ListUsersResponse,
  UserListItem,
  UserStatusFilter,
} from '../types/users';

import './UsersPage.css';

const PAGE_SIZE = 10;

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

export function UsersPage() {
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
    search,
    status,
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

  const pagination = result?.pagination;

  return (
    <main className="users-page">
      <section className="users-header">
        <div>
          <p className="eyebrow">
            Administración
          </p>

          <h2>Usuarios</h2>

          <p>
            Consulta los usuarios registrados,
            sus estados y los roles asignados.
          </p>
        </div>

        <button
          className="button button-primary"
          type="button"
          disabled
          title="La creación de usuarios se incorporará en el siguiente bloque."
        >
          Nuevo usuario
        </button>
      </section>

      <section className="users-panel">
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
                setSearchInput(event.target.value);
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
                  event.target.value as UserStatusFilter;

                handleStatusChange(selectedStatus);
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
                    </tr>
                  </thead>

                  <tbody>
                    {result.items.map((user) => {
                      const userStatus =
                        getUserStatus(user);

                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="user-identity">
                              <strong>
                                {user.name}
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
                      disabled={pagination.page <= 1}
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
    </main>
  );
}
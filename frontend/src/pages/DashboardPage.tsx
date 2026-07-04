import {
  useState,
  type ReactNode,
} from 'react';

import {
  logout,
} from '../services/auth.service';

import type {
  AuthenticatedUser,
} from '../types/auth';

import {
  AcademicYearsPage,
} from './AcademicYearsPage';

import {
  CentresPage,
} from './CentresPage';

import {
  UsersPage,
} from './UsersPage';

import {
  VocationalProgrammesPage,
} from './VocationalProgrammesPage';

import './DashboardPage.css';

interface DashboardPageProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

type ActiveSection =
  | 'dashboard'
  | 'users'
  | 'academic-years'
  | 'centres'
  | 'vocational-programmes';

function formatRole(role: string): string {
  return role
    .split('-')
    .map((part) => (
      part.charAt(0).toUpperCase()
      + part.slice(1)
    ))
    .join(' ');
}

export function DashboardPage({
  user,
  onLogout,
}: DashboardPageProps) {
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>('dashboard');

  const canListUsers =
    user.permissions.includes(
      'users.list',
    );

  const canCreateUsers =
    user.permissions.includes(
      'users.create',
    )
    && user.permissions.includes(
      'roles.list',
    )
    && user.permissions.includes(
      'roles.assign',
    );

  const canEditUsers =
    user.permissions.includes(
      'users.view',
    )
    && user.permissions.includes(
      'users.update',
    )
    && user.permissions.includes(
      'roles.list',
    )
    && user.permissions.includes(
      'roles.assign',
    );

  const canChangeUserStatus =
    user.permissions.includes(
      'users.update',
    );

  const canArchiveUsers =
    user.permissions.includes(
      'users.archive',
    );

  const canListAcademicYears =
    user.permissions.includes(
      'academic-years.list',
    );

  const canCreateAcademicYears =
    user.permissions.includes(
      'academic-years.create',
    );

  const canEditAcademicYears =
    user.permissions.includes(
      'academic-years.view',
    )
    && user.permissions.includes(
      'academic-years.update',
    );

  const canSetCurrentAcademicYear =
    user.permissions.includes(
      'academic-years.set-current',
    );

  const canArchiveAcademicYears =
    user.permissions.includes(
      'academic-years.archive',
    );

  const canListCentres =
    user.permissions.includes(
      'centres.list',
    );

  const canCreateCentres =
    user.permissions.includes(
      'centres.create',
    );

  const canEditCentres =
    user.permissions.includes(
      'centres.view',
    )
    && user.permissions.includes(
      'centres.update',
    );

  const canArchiveCentres =
    user.permissions.includes(
      'centres.archive',
    );

  const canListVocationalProgrammes =
    user.permissions.includes(
      'vocational-programmes.list',
    );

  const canCreateVocationalProgrammes =
    user.permissions.includes(
      'vocational-programmes.create',
    );

  const canEditVocationalProgrammes =
    user.permissions.includes(
      'vocational-programmes.view',
    )
    && user.permissions.includes(
      'vocational-programmes.update',
    );

  const canArchiveVocationalProgrammes =
    user.permissions.includes(
      'vocational-programmes.archive',
    );

  async function handleLogout():
  Promise<void> {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      onLogout();
      setIsLoggingOut(false);
    }
  }

  let pageEyebrow = 'Panel principal';

  let pageTitle =
    `Bienvenido, ${user.name}`;

  if (activeSection === 'users') {
    pageEyebrow = 'Administración';
    pageTitle = 'Gestión de usuarios';
  }

  if (
    activeSection === 'academic-years'
  ) {
    pageEyebrow =
      'Estructura académica';

    pageTitle =
      'Cursos académicos';
  }

  if (activeSection === 'centres') {
    pageEyebrow =
      'Estructura académica';

    pageTitle =
      'Centros';
  }

  if (
    activeSection
    === 'vocational-programmes'
  ) {
    pageEyebrow =
      'Estructura académica';

    pageTitle =
      'Ciclos formativos';
  }

  let activeContent: ReactNode;

  if (activeSection === 'users') {
    activeContent = (
      <UsersPage
        currentUserId={user.id}
        canCreateUsers={
          canCreateUsers
        }
        canEditUsers={
          canEditUsers
        }
        canChangeUserStatus={
          canChangeUserStatus
        }
        canArchiveUsers={
          canArchiveUsers
        }
      />
    );
  } else if (
    activeSection === 'academic-years'
  ) {
    activeContent = (
      <AcademicYearsPage
        canCreateAcademicYears={
          canCreateAcademicYears
        }
        canEditAcademicYears={
          canEditAcademicYears
        }
        canSetCurrentAcademicYear={
          canSetCurrentAcademicYear
        }
        canArchiveAcademicYears={
          canArchiveAcademicYears
        }
      />
    );
  } else if (
    activeSection === 'centres'
  ) {
    activeContent = (
      <CentresPage
        canCreateCentres={
          canCreateCentres
        }
        canEditCentres={
          canEditCentres
        }
        canArchiveCentres={
          canArchiveCentres
        }
      />
    );
  } else if (
    activeSection
    === 'vocational-programmes'
  ) {
    activeContent = (
      <VocationalProgrammesPage
        canCreateVocationalProgrammes={
          canCreateVocationalProgrammes
        }
        canEditVocationalProgrammes={
          canEditVocationalProgrammes
        }
        canArchiveVocationalProgrammes={
          canArchiveVocationalProgrammes
        }
      />
    );
  } else {
    activeContent = (
      <main className="dashboard-content">
        <section className="welcome-card">
          <div>
            <p className="eyebrow">
              Sesión activa
            </p>

            <h2>
              SAFA Twin está conectado
            </h2>

            <p>
              El frontend React está
              comunicándose correctamente con
              la API y la sesión está almacenada
              en MariaDB.
            </p>
          </div>

          <span className="status-badge">
            Sistema operativo
          </span>
        </section>

        <section className="dashboard-grid">
          <article className="info-card">
            <h2>Usuario</h2>

            <dl className="user-details">
              <div>
                <dt>Nombre</dt>
                <dd>{user.name}</dd>
              </div>

              <div>
                <dt>Correo</dt>
                <dd>{user.email}</dd>
              </div>
            </dl>
          </article>

          <article className="info-card">
            <h2>Roles asignados</h2>

            <div className="role-list">
              {user.roles.map(
                (role) => (
                  <span
                    className="role-badge"
                    key={role}
                  >
                    {formatRole(role)}
                  </span>
                ),
              )}
            </div>
          </article>

          <article className="info-card">
            <h2>Estado del sistema</h2>

            <ul className="status-list">
              <li>
                Autenticación y sesiones
              </li>

              <li>
                Roles y permisos
              </li>

              <li>
                Gestión de usuarios
              </li>

              <li>
                Estructura académica del backend
              </li>

              <li>
                Gestión de cursos académicos
              </li>

              <li>
                Gestión de centros
              </li>

              <li>
                Gestión de ciclos formativos
              </li>
            </ul>
          </article>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark brand-mark-small">
            ST
          </div>

          <div>
            <strong>SAFA Twin</strong>
            <span>Gestión académica</span>
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Navegación principal"
        >
          <button
            className={
              activeSection === 'dashboard'
                ? 'nav-link nav-button nav-link-active'
                : 'nav-link nav-button'
            }
            type="button"
            onClick={() => {
              setActiveSection(
                'dashboard',
              );
            }}
          >
            Panel principal
          </button>

          <p className="nav-section-label">
            Administración
          </p>

          {canListUsers
            ? (
              <button
                className={
                  activeSection === 'users'
                    ? 'nav-link nav-button nav-link-active'
                    : 'nav-link nav-button'
                }
                type="button"
                onClick={() => {
                  setActiveSection(
                    'users',
                  );
                }}
              >
                Usuarios
              </button>
            )
            : (
              <span className="nav-link nav-link-disabled">
                Usuarios
              </span>
            )}

          <p className="nav-section-label">
            Estructura académica
          </p>

          {canListAcademicYears
            ? (
              <button
                className={
                  activeSection
                    === 'academic-years'
                    ? 'nav-link nav-button nav-link-active'
                    : 'nav-link nav-button'
                }
                type="button"
                onClick={() => {
                  setActiveSection(
                    'academic-years',
                  );
                }}
              >
                Cursos académicos
              </button>
            )
            : (
              <span className="nav-link nav-link-disabled">
                Cursos académicos
              </span>
            )}

          {canListCentres
            ? (
              <button
                className={
                  activeSection === 'centres'
                    ? 'nav-link nav-button nav-link-active'
                    : 'nav-link nav-button'
                }
                type="button"
                onClick={() => {
                  setActiveSection(
                    'centres',
                  );
                }}
              >
                Centros
              </button>
            )
            : (
              <span className="nav-link nav-link-disabled">
                Centros
              </span>
            )}

          {canListVocationalProgrammes
            ? (
              <button
                className={
                  activeSection
                    === 'vocational-programmes'
                    ? 'nav-link nav-button nav-link-active'
                    : 'nav-link nav-button'
                }
                type="button"
                onClick={() => {
                  setActiveSection(
                    'vocational-programmes',
                  );
                }}
              >
                Ciclos formativos
              </button>
            )
            : (
              <span className="nav-link nav-link-disabled">
                Ciclos formativos
              </span>
            )}

          <span className="nav-link nav-link-disabled">
            Niveles
          </span>

          <span className="nav-link nav-link-disabled">
            Módulos
          </span>

          <span className="nav-link nav-link-disabled">
            Ofertas académicas
          </span>

          <p className="nav-section-label">
            Gestión académica
          </p>

          <span className="nav-link nav-link-disabled">
            Alumnado
          </span>

          <span className="nav-link nav-link-disabled">
            Evaluaciones
          </span>

          <span className="nav-link nav-link-disabled">
            Gemelo digital
          </span>
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {pageEyebrow}
            </p>

            <h1>{pageTitle}</h1>
          </div>

          <button
            className="button button-secondary"
            type="button"
            disabled={isLoggingOut}
            onClick={() => {
              void handleLogout();
            }}
          >
            {isLoggingOut
              ? 'Cerrando sesión...'
              : 'Cerrar sesión'}
          </button>
        </header>

        <nav
          className="mobile-navigation"
          aria-label="Navegación móvil"
        >
          <button
            className={
              activeSection === 'dashboard'
                ? 'mobile-nav-button mobile-nav-button-active'
                : 'mobile-nav-button'
            }
            type="button"
            onClick={() => {
              setActiveSection(
                'dashboard',
              );
            }}
          >
            Panel
          </button>

          {canListUsers && (
            <button
              className={
                activeSection === 'users'
                  ? 'mobile-nav-button mobile-nav-button-active'
                  : 'mobile-nav-button'
              }
              type="button"
              onClick={() => {
                setActiveSection(
                  'users',
                );
              }}
            >
              Usuarios
            </button>
          )}

          {canListAcademicYears && (
            <button
              className={
                activeSection
                  === 'academic-years'
                  ? 'mobile-nav-button mobile-nav-button-active'
                  : 'mobile-nav-button'
              }
              type="button"
              onClick={() => {
                setActiveSection(
                  'academic-years',
                );
              }}
            >
              Cursos
            </button>
          )}

          {canListCentres && (
            <button
              className={
                activeSection === 'centres'
                  ? 'mobile-nav-button mobile-nav-button-active'
                  : 'mobile-nav-button'
              }
              type="button"
              onClick={() => {
                setActiveSection(
                  'centres',
                );
              }}
            >
              Centros
            </button>
          )}

          {canListVocationalProgrammes && (
            <button
              className={
                activeSection
                  === 'vocational-programmes'
                  ? 'mobile-nav-button mobile-nav-button-active'
                  : 'mobile-nav-button'
              }
              type="button"
              onClick={() => {
                setActiveSection(
                  'vocational-programmes',
                );
              }}
            >
              Ciclos
            </button>
          )}
        </nav>

        {activeContent}
      </div>
    </div>
  );
}

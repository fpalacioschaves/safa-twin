import {
  useState,
} from 'react';

import {
  logout,
} from '../services/auth.service';

import type {
  AuthenticatedUser,
} from '../types/auth';

import {
  UsersPage,
} from './UsersPage';

import './DashboardPage.css';

interface DashboardPageProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

type ActiveSection =
  | 'dashboard'
  | 'users';

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
    user.permissions.includes('users.list');

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      onLogout();
      setIsLoggingOut(false);
    }
  }

  const pageTitle =
    activeSection === 'users'
      ? 'Gestión de usuarios'
      : `Bienvenido, ${user.name}`;

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
              setActiveSection('dashboard');
            }}
          >
            Panel principal
          </button>

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
                  setActiveSection('users');
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

          <span className="nav-link nav-link-disabled">
            Cursos y grupos
          </span>

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
              {activeSection === 'users'
                ? 'Administración'
                : 'Panel principal'}
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

        {activeSection === 'users'
          ? (
            <UsersPage />
          )
          : (
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
                    {user.roles.map((role) => (
                      <span
                        className="role-badge"
                        key={role}
                      >
                        {formatRole(role)}
                      </span>
                    ))}
                  </div>
                </article>

                <article className="info-card">
                  <h2>Estado de la Fase 1</h2>

                  <ul className="status-list">
                    <li>
                      Base de datos conectada
                    </li>

                    <li>
                      Administrador creado
                    </li>

                    <li>
                      Sesión persistente activa
                    </li>

                    <li>
                      Gestión de usuarios iniciada
                    </li>
                  </ul>
                </article>
              </section>
            </main>
          )}
      </div>
    </div>
  );
}
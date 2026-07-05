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
  AcademicLevelsPage,
} from './AcademicLevelsPage';

import {
  AcademicYearsPage,
} from './AcademicYearsPage';

import {
  AssessmentSchemesPage,
} from './AssessmentSchemesPage';

import {
  CentresPage,
} from './CentresPage';

import {
  EnrolmentsPage,
} from './EnrolmentsPage';

import {
  EvaluationsPage,
} from './EvaluationsPage';

import {
  GradesPage,
} from './GradesPage';

import {
  ModulesPage,
} from './ModulesPage';

import {
  StatisticsPage,
} from './StatisticsPage';

import {
  StudentsPage,
} from './StudentsPage';

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
  | 'vocational-programmes'
  | 'academic-levels'
  | 'modules'
  | 'students'
  | 'enrolments'
  | 'evaluations'
  | 'assessment-schemes'
  | 'grades'
  | 'statistics';

function formatRole(role: string): string {
  return role
    .split('-')
    .map((part) => (
      part.charAt(0).toUpperCase()
      + part.slice(1)
    ))
    .join(' ');
}

function MainNavButton({
  activeSection,
  id,
  label,
  onSelect,
}: {
  activeSection: ActiveSection;
  id: ActiveSection;
  label: string;
  onSelect: (section: ActiveSection) => void;
}) {
  return (
    <button
      className={
        activeSection === id
          ? 'nav-link nav-button nav-link-active'
          : 'nav-link nav-button'
      }
      type="button"
      onClick={() => {
        onSelect(id);
      }}
    >
      {label}
    </button>
  );
}

function MobileNavButton({
  activeSection,
  id,
  label,
  onSelect,
}: {
  activeSection: ActiveSection;
  id: ActiveSection;
  label: string;
  onSelect: (section: ActiveSection) => void;
}) {
  return (
    <button
      className={
        activeSection === id
          ? 'mobile-nav-button mobile-nav-button-active'
          : 'mobile-nav-button'
      }
      type="button"
      onClick={() => {
        onSelect(id);
      }}
    >
      {label}
    </button>
  );
}

export function DashboardPage({
  user,
  onLogout,
}: DashboardPageProps) {
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>('dashboard');

  /*
   * MVP:
   *
   * El menú muestra siempre los módulos ya construidos.
   * La seguridad real queda en el backend, mediante
   * requirePermission en cada endpoint.
   *
   * No se usan permisos para pintar el menú porque eso
   * bloqueaba la navegación durante el desarrollo de
   * nuevos módulos.
   */
  const canUseBuiltModules = true;

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

  let pageEyebrow =
    'Panel principal';

  let pageTitle =
    `Bienvenido, ${user.name}`;

  if (activeSection === 'users') {
    pageEyebrow =
      'Administración';

    pageTitle =
      'Gestión de usuarios';
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
    activeSection === 'vocational-programmes'
  ) {
    pageEyebrow =
      'Estructura académica';

    pageTitle =
      'Ciclos formativos';
  }

  if (
    activeSection === 'academic-levels'
  ) {
    pageEyebrow =
      'Estructura académica';

    pageTitle =
      'Niveles académicos';
  }

  if (activeSection === 'modules') {
    pageEyebrow =
      'Estructura académica';

    pageTitle =
      'Módulos profesionales';
  }

  if (activeSection === 'students') {
    pageEyebrow =
      'Gestión académica';

    pageTitle =
      'Alumnado';
  }

  if (activeSection === 'enrolments') {
    pageEyebrow =
      'Gestión académica';

    pageTitle =
      'Matrículas modulares';
  }

  if (activeSection === 'evaluations') {
    pageEyebrow =
      'Evaluación académica';

    pageTitle =
      'Evaluaciones y estados';
  }

  if (activeSection === 'assessment-schemes') {
    pageEyebrow =
      'Evaluación académica';

    pageTitle =
      'Sistemas de calificación';
  }

  if (activeSection === 'grades') {
    pageEyebrow =
      'Evaluación académica';

    pageTitle =
      'Calificaciones';
  }

  if (activeSection === 'statistics') {
    pageEyebrow =
      'Estadísticas académicas';

    pageTitle =
      'Panel de estadísticas';
  }

  let activeContent: ReactNode;

  if (activeSection === 'users') {
    activeContent = (
      <UsersPage
        currentUserId={user.id}
        canCreateUsers={
          canUseBuiltModules
        }
        canEditUsers={
          canUseBuiltModules
        }
        canChangeUserStatus={
          canUseBuiltModules
        }
        canArchiveUsers={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'academic-years'
  ) {
    activeContent = (
      <AcademicYearsPage
        canCreateAcademicYears={
          canUseBuiltModules
        }
        canEditAcademicYears={
          canUseBuiltModules
        }
        canSetCurrentAcademicYear={
          canUseBuiltModules
        }
        canArchiveAcademicYears={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'centres'
  ) {
    activeContent = (
      <CentresPage
        canCreateCentres={
          canUseBuiltModules
        }
        canEditCentres={
          canUseBuiltModules
        }
        canArchiveCentres={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'vocational-programmes'
  ) {
    activeContent = (
      <VocationalProgrammesPage
        canCreateVocationalProgrammes={
          canUseBuiltModules
        }
        canEditVocationalProgrammes={
          canUseBuiltModules
        }
        canArchiveVocationalProgrammes={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'academic-levels'
  ) {
    activeContent = (
      <AcademicLevelsPage
        canCreateAcademicLevels={
          canUseBuiltModules
        }
        canEditAcademicLevels={
          canUseBuiltModules
        }
        canArchiveAcademicLevels={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'modules'
  ) {
    activeContent = (
      <ModulesPage
        canCreateModules={
          canUseBuiltModules
        }
        canEditModules={
          canUseBuiltModules
        }
        canArchiveModules={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'students'
  ) {
    activeContent = (
      <StudentsPage
        canCreateStudents={
          canUseBuiltModules
        }
        canEditStudents={
          canUseBuiltModules
        }
        canArchiveStudents={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'enrolments'
  ) {
    activeContent = (
      <EnrolmentsPage
        canCreateEnrolments={
          canUseBuiltModules
        }
        canEditEnrolments={
          canUseBuiltModules
        }
        canArchiveEnrolments={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'evaluations'
  ) {
    activeContent = (
      <EvaluationsPage
        canCreateEvaluations={
          canUseBuiltModules
        }
        canEditEvaluations={
          canUseBuiltModules
        }
        canArchiveEvaluations={
          canUseBuiltModules
        }
        canCreateGradeStatuses={
          canUseBuiltModules
        }
        canEditGradeStatuses={
          canUseBuiltModules
        }
        canArchiveGradeStatuses={
          canUseBuiltModules
        }
      />
    );
  } else if (
    activeSection === 'assessment-schemes'
  ) {
    activeContent = (
      <AssessmentSchemesPage />
    );
  } else if (
    activeSection === 'grades'
  ) {
    activeContent = (
      <GradesPage />
    );
  } else if (
    activeSection === 'statistics'
  ) {
    activeContent = (
      <StatisticsPage />
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
                Roles y permisos en backend
              </li>

              <li>
                Gestión de usuarios
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

              <li>
                Gestión de niveles académicos
              </li>

              <li>
                Gestión de módulos profesionales
              </li>

              <li>
                Gestión de alumnado
              </li>

              <li>
                Matrícula modular por asignaturas
              </li>

              <li>
                Gestión de evaluaciones y estados
              </li>

              <li>
                Estadísticas académicas
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
          <MainNavButton
            activeSection={activeSection}
            id="dashboard"
            label="Panel principal"
            onSelect={setActiveSection}
          />

          <p className="nav-section-label">
            Administración
          </p>

          <MainNavButton
            activeSection={activeSection}
            id="users"
            label="Usuarios"
            onSelect={setActiveSection}
          />

          <p className="nav-section-label">
            Estructura académica
          </p>

          <MainNavButton
            activeSection={activeSection}
            id="academic-years"
            label="Cursos académicos"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="centres"
            label="Centros"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="vocational-programmes"
            label="Ciclos formativos"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="academic-levels"
            label="Niveles"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="modules"
            label="Módulos"
            onSelect={setActiveSection}
          />

          <span className="nav-link nav-link-disabled">
            Ofertas académicas
          </span>

          <p className="nav-section-label">
            Gestión académica
          </p>

          <MainNavButton
            activeSection={activeSection}
            id="students"
            label="Alumnado"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="enrolments"
            label="Matrículas"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="evaluations"
            label="Evaluaciones"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="assessment-schemes"
            label="Sistemas calificación"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="grades"
            label="Calificaciones"
            onSelect={setActiveSection}
          />

          <MainNavButton
            activeSection={activeSection}
            id="statistics"
            label="Estadísticas"
            onSelect={setActiveSection}
          />

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
          <MobileNavButton
            activeSection={activeSection}
            id="dashboard"
            label="Panel"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="users"
            label="Usuarios"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="academic-years"
            label="Cursos"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="centres"
            label="Centros"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="vocational-programmes"
            label="Ciclos"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="academic-levels"
            label="Niveles"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="modules"
            label="Módulos"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="students"
            label="Alumnado"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="enrolments"
            label="Matrículas"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="evaluations"
            label="Evaluaciones"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="assessment-schemes"
            label="Sistemas"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="grades"
            label="Notas"
            onSelect={setActiveSection}
          />

          <MobileNavButton
            activeSection={activeSection}
            id="statistics"
            label="Estadísticas"
            onSelect={setActiveSection}
          />
        </nav>

        {activeContent}
      </div>
    </div>
  );
}

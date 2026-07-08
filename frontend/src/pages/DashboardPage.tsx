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
  CompanyTrainingPage,
} from './CompanyTrainingPage';
import {
  CompanyTrainingReportsPage,
} from './CompanyTrainingReportsPage';
import {
  CurriculumPage,
} from './CurriculumPage';
import {
  DigitalTwinPage,
} from './DigitalTwinPage';
import {
  DocumentTemplatesPage,
} from './DocumentTemplatesPage';
import {
  EnrolmentsPage,
} from './EnrolmentsPage';
import {
  EvaluationsPage,
} from './EvaluationsPage';
import {
  GeneratedDocumentsPage,
} from './GeneratedDocumentsPage';
import {
  GradesPage,
} from './GradesPage';
import {
  HelpPage,
} from './HelpPage';
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
  | 'curriculum'
  | 'students'
  | 'enrolments'
  | 'evaluations'
  | 'assessment-schemes'
  | 'grades'
  | 'statistics'
  | 'company-training'
  | 'company-training-reports'
  | 'document-templates'
  | 'generated-documents'
  | 'digital-twin'
  | 'help';

interface NavigationButtonProps {
  activeSection: ActiveSection;
  id: ActiveSection;
  label: string;
  onSelect: (section: ActiveSection) => void;
  variant?: 'desktop' | 'mobile';
}

function formatRole(role: string): string {
  return role
    .split('-')
    .map((part) => (
      part.charAt(0).toUpperCase()
      + part.slice(1)
    ))
    .join(' ');
}

function NavigationButton({
  activeSection,
  id,
  label,
  onSelect,
  variant = 'desktop',
}: NavigationButtonProps) {
  const isActive = activeSection === id;

  if (variant === 'mobile') {
    return (
      <button
        className={
          isActive
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

  return (
    <button
      className={
        isActive
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

function getPageHeader(
  activeSection: ActiveSection,
  user: AuthenticatedUser,
): {
  eyebrow: string;
  title: string;
} {
  const headers: Record<ActiveSection, {
    eyebrow: string;
    title: string;
  }> = {
    dashboard: {
      eyebrow: 'Panel principal',
      title: `Bienvenido, ${user.name}`,
    },
    users: {
      eyebrow: 'Administración',
      title: 'Gestión de usuarios',
    },
    'academic-years': {
      eyebrow: 'Estructura académica',
      title: 'Cursos académicos',
    },
    centres: {
      eyebrow: 'Estructura académica',
      title: 'Centros',
    },
    'vocational-programmes': {
      eyebrow: 'Estructura académica',
      title: 'Ciclos formativos',
    },
    'academic-levels': {
      eyebrow: 'Estructura académica',
      title: 'Niveles académicos',
    },
    modules: {
      eyebrow: 'Estructura académica',
      title: 'Módulos profesionales',
    },
    curriculum: {
      eyebrow: 'Currículo académico',
      title: 'Resultados de Aprendizaje y Acciones Formativas',
    },
    students: {
      eyebrow: 'Gestión académica',
      title: 'Alumnado',
    },
    enrolments: {
      eyebrow: 'Gestión académica',
      title: 'Matrículas modulares',
    },
    evaluations: {
      eyebrow: 'Evaluación académica',
      title: 'Evaluaciones y estados',
    },
    'assessment-schemes': {
      eyebrow: 'Evaluación académica',
      title: 'Sistemas de calificación',
    },
    grades: {
      eyebrow: 'Evaluación académica',
      title: 'Calificaciones',
    },
    statistics: {
      eyebrow: 'Estadísticas académicas',
      title: 'Panel de estadísticas',
    },
    'company-training': {
      eyebrow: 'Formación en empresa',
      title: 'Empresas y estancias formativas',
    },
    'company-training-reports': {
      eyebrow: 'Formación en empresa',
      title: 'Informes y documentación',
    },
    'document-templates': {
      eyebrow: 'Plantillas documentales',
      title: 'Catálogo de plantillas',
    },
    'generated-documents': {
      eyebrow: 'Documentos generados',
      title: 'Historial documental',
    },
    'digital-twin': {
      eyebrow: 'Gemelo digital',
      title: 'Asistente académico con IA local',
    },
    help: {
      eyebrow: 'Ayuda',
      title: 'Guía de uso de SAFA Twin',
    },
  };

  return headers[activeSection];
}

function DashboardHome({
  user,
}: {
  user: AuthenticatedUser;
}) {
  return (
    <main className="dashboard-content">
      <section className="welcome-card">
        <div>
          <p className="eyebrow">Sesión activa</p>
          <h2>SAFA Twin está conectado</h2>
          <p>
            El frontend React está comunicándose correctamente con la API
            y la sesión está almacenada en MariaDB.
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
          <h2>Estado del sistema</h2>
          <ul className="status-list">
            <li>Autenticación y sesiones</li>
            <li>Roles y permisos en backend</li>
            <li>Gestión de estructura académica</li>
            <li>Currículo de módulos profesionales</li>
            <li>Gestión de alumnado y matrículas</li>
            <li>Evaluaciones, sistemas de calificación y notas</li>
            <li>Estadísticas académicas</li>
            <li>Formación en empresa</li>
            <li>Informes de formación en empresa</li>
            <li>Plantillas documentales</li>
            <li>Historial documental</li>
            <li>Gemelo digital con Ollama</li>
            <li>Ayuda integrada de la aplicación</li>
          </ul>
        </article>
      </section>
    </main>
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

  const canUseBuiltModules = true;
  const pageHeader = getPageHeader(activeSection, user);

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      onLogout();
      setIsLoggingOut(false);
    }
  }

  let activeContent: ReactNode;

  if (activeSection === 'users') {
    activeContent = (
      <UsersPage
        currentUserId={user.id}
        canCreateUsers={canUseBuiltModules}
        canEditUsers={canUseBuiltModules}
        canChangeUserStatus={canUseBuiltModules}
        canArchiveUsers={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'academic-years') {
    activeContent = (
      <AcademicYearsPage
        canCreateAcademicYears={canUseBuiltModules}
        canEditAcademicYears={canUseBuiltModules}
        canSetCurrentAcademicYear={canUseBuiltModules}
        canArchiveAcademicYears={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'centres') {
    activeContent = (
      <CentresPage
        canCreateCentres={canUseBuiltModules}
        canEditCentres={canUseBuiltModules}
        canArchiveCentres={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'vocational-programmes') {
    activeContent = (
      <VocationalProgrammesPage
        canCreateVocationalProgrammes={canUseBuiltModules}
        canEditVocationalProgrammes={canUseBuiltModules}
        canArchiveVocationalProgrammes={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'academic-levels') {
    activeContent = (
      <AcademicLevelsPage
        canCreateAcademicLevels={canUseBuiltModules}
        canEditAcademicLevels={canUseBuiltModules}
        canArchiveAcademicLevels={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'modules') {
    activeContent = (
      <ModulesPage
        canCreateModules={canUseBuiltModules}
        canEditModules={canUseBuiltModules}
        canArchiveModules={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'curriculum') {
    activeContent = <CurriculumPage />;
  } else if (activeSection === 'students') {
    activeContent = (
      <StudentsPage
        canCreateStudents={canUseBuiltModules}
        canEditStudents={canUseBuiltModules}
        canArchiveStudents={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'enrolments') {
    activeContent = (
      <EnrolmentsPage
        canCreateEnrolments={canUseBuiltModules}
        canEditEnrolments={canUseBuiltModules}
        canArchiveEnrolments={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'evaluations') {
    activeContent = (
      <EvaluationsPage
        canCreateEvaluations={canUseBuiltModules}
        canEditEvaluations={canUseBuiltModules}
        canArchiveEvaluations={canUseBuiltModules}
        canCreateGradeStatuses={canUseBuiltModules}
        canEditGradeStatuses={canUseBuiltModules}
        canArchiveGradeStatuses={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'assessment-schemes') {
    activeContent = <AssessmentSchemesPage />;
  } else if (activeSection === 'grades') {
    activeContent = <GradesPage />;
  } else if (activeSection === 'statistics') {
    activeContent = <StatisticsPage />;
  } else if (activeSection === 'company-training') {
    activeContent = (
      <CompanyTrainingPage
        canManageCompanies={canUseBuiltModules}
        canManageTutors={canUseBuiltModules}
        canManagePlacements={canUseBuiltModules}
        canManageFollowups={canUseBuiltModules}
        canManageIncidents={canUseBuiltModules}
      />
    );
  } else if (activeSection === 'company-training-reports') {
    activeContent = <CompanyTrainingReportsPage />;
  } else if (activeSection === 'document-templates') {
    activeContent = <DocumentTemplatesPage />;
  } else if (activeSection === 'generated-documents') {
    activeContent = <GeneratedDocumentsPage />;
  } else if (activeSection === 'digital-twin') {
    activeContent = <DigitalTwinPage />;
  } else if (activeSection === 'help') {
    activeContent = <HelpPage />;
  } else {
    activeContent = <DashboardHome user={user} />;
  }

  const mobileSections: {
    id: ActiveSection;
    label: string;
  }[] = [
    { id: 'dashboard', label: 'Panel' },
    { id: 'users', label: 'Usuarios' },
    { id: 'academic-years', label: 'Cursos' },
    { id: 'centres', label: 'Centros' },
    { id: 'vocational-programmes', label: 'Ciclos' },
    { id: 'academic-levels', label: 'Niveles' },
    { id: 'modules', label: 'Módulos' },
    { id: 'curriculum', label: 'Currículo' },
    { id: 'students', label: 'Alumnado' },
    { id: 'enrolments', label: 'Matrículas' },
    { id: 'evaluations', label: 'Evaluaciones' },
    { id: 'assessment-schemes', label: 'Sistemas' },
    { id: 'grades', label: 'Notas' },
    { id: 'statistics', label: 'Estadísticas' },
    { id: 'company-training', label: 'Empresa' },
    { id: 'company-training-reports', label: 'Inf. empresa' },
    { id: 'document-templates', label: 'Plantillas' },
    { id: 'generated-documents', label: 'Documentos' },
    { id: 'digital-twin', label: 'Gemelo digital' },
    { id: 'help', label: 'Ayuda' },
  ];

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
          <NavigationButton
            activeSection={activeSection}
            id="dashboard"
            label="Panel principal"
            onSelect={setActiveSection}
          />

          <p className="nav-section-label">Administración</p>
          <NavigationButton
            activeSection={activeSection}
            id="users"
            label="Usuarios"
            onSelect={setActiveSection}
          />

          <p className="nav-section-label">Estructura académica</p>
          <NavigationButton
            activeSection={activeSection}
            id="academic-years"
            label="Cursos académicos"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="centres"
            label="Centros"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="vocational-programmes"
            label="Ciclos formativos"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="academic-levels"
            label="Niveles"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="modules"
            label="Módulos"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="curriculum"
            label="Currículo RA/AF"
            onSelect={setActiveSection}
          />
          <span className="nav-link nav-link-disabled">
            Ofertas académicas
          </span>

          <p className="nav-section-label">Gestión académica</p>
          <NavigationButton
            activeSection={activeSection}
            id="students"
            label="Alumnado"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="enrolments"
            label="Matrículas"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="evaluations"
            label="Evaluaciones"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="assessment-schemes"
            label="Sistemas calificación"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="grades"
            label="Calificaciones"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="statistics"
            label="Estadísticas"
            onSelect={setActiveSection}
          />

          <p className="nav-section-label">Formación y documentos</p>
          <NavigationButton
            activeSection={activeSection}
            id="company-training"
            label="Formación en empresa"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="company-training-reports"
            label="Informes de empresa"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="document-templates"
            label="Plantillas documentales"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="generated-documents"
            label="Historial documental"
            onSelect={setActiveSection}
          />
          <NavigationButton
            activeSection={activeSection}
            id="digital-twin"
            label="Gemelo digital"
            onSelect={setActiveSection}
          />

          <p className="nav-section-label">Soporte</p>
          <NavigationButton
            activeSection={activeSection}
            id="help"
            label="Ayuda"
            onSelect={setActiveSection}
          />
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {pageHeader.eyebrow}
            </p>
            <h1>{pageHeader.title}</h1>
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
          {mobileSections.map((section) => (
            <NavigationButton
              activeSection={activeSection}
              id={section.id}
              key={section.id}
              label={section.label}
              onSelect={setActiveSection}
              variant="mobile"
            />
          ))}
        </nav>

        {activeContent}
      </div>
    </div>
  );
}

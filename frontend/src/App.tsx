import {
  useEffect,
  useState,
} from 'react';

import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

import {
  ApiError,
  getCurrentUser,
} from './services/auth.service';

import type {
  AuthenticatedUser,
} from './types/auth';

export default function App() {
  const [user, setUser] =
    useState<AuthenticatedUser | null>(null);

  const [
    isCheckingSession,
    setIsCheckingSession,
  ] = useState(true);

  const [
    startupError,
    setStartupError,
  ] = useState<string | null>(null);

  useEffect(() => {
    async function restoreSession(): Promise<void> {
      try {
        const currentUser =
          await getCurrentUser();

        setUser(currentUser);
      } catch (error: unknown) {
        if (
          error instanceof ApiError
          && error.status === 401
        ) {
          setUser(null);
          return;
        }

        setStartupError(
          'No se ha podido conectar con el servidor.',
        );
      } finally {
        setIsCheckingSession(false);
      }
    }

    void restoreSession();
  }, []);

  if (isCheckingSession) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="spinner" />
          <p>Comprobando la sesión...</p>
        </div>
      </main>
    );
  }

  if (startupError) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <h1>SAFA Twin</h1>

          <div className="alert alert-error">
            {startupError}
          </div>

          <p>
            Comprueba que el backend se está
            ejecutando en el puerto 3000.
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={(authenticatedUser) => {
          setUser(authenticatedUser);
        }}
      />
    );
  }

  return (
    <DashboardPage
      user={user}
      onLogout={() => {
        setUser(null);
      }}
    />
  );
}
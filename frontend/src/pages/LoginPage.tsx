import {
  useState,
  type FormEvent,
} from 'react';

import {
  ApiError,
  login,
} from '../services/auth.service';

import type {
  AuthenticatedUser,
} from '../types/auth';

interface LoginPageProps {
  onLogin: (user: AuthenticatedUser) => void;
}

export function LoginPage({
  onLogin,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await login({
        email,
        password,
      });

      onLogin(user);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'No se ha podido conectar con el servidor.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <header className="login-header">
          <div className="brand-mark">
            ST
          </div>

          <div>
            <p className="eyebrow">
              Gestión académica
            </p>

            <h1>SAFA Twin</h1>

            <p className="login-description">
              Accede al panel de gestión académica
              y al gemelo digital.
            </p>
          </div>
        </header>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              autoComplete="username"
              placeholder="usuario@centro.es"
              required
              disabled={isSubmitting}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">
              Contraseña
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder="Introduce tu contraseña"
              required
              disabled={isSubmitting}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </div>

          {errorMessage && (
            <div
              className="alert alert-error"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Iniciando sesión...'
              : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  );
}
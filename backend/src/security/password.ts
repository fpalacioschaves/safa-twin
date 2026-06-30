import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;
const MINIMUM_PASSWORD_LENGTH = 12;

export function validatePassword(password: string): void {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error(
      `La contraseña debe tener al menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`,
    );
  }

  if (bcrypt.truncates(password)) {
    throw new Error(
      'La contraseña supera el máximo de 72 bytes admitido por bcrypt.',
    );
  }
}

export async function hashPassword(
  password: string,
): Promise<string> {
  validatePassword(password);

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (bcrypt.truncates(password)) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}
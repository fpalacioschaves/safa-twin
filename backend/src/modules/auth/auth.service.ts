import {
  createHash,
  randomBytes,
} from 'node:crypto';

import { prisma } from '../../config/database.js';
import { verifyPassword } from '../../security/password.js';

export const SESSION_COOKIE_NAME = 'safa_twin_session';

const SESSION_DURATION_MILLISECONDS =
  8 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface LoginResult {
  user: AuthenticatedUser;
  sessionToken: string;
  expiresAt: Date;
}

function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashSessionToken(token: string): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<LoginResult | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isActive: true,
      deletedAt: true,

      userRoles: {
        select: {
          role: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (
    !user
    || !user.isActive
    || user.deletedAt !== null
  ) {
    return null;
  }

  const passwordIsValid = await verifyPassword(
    password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    return null;
  }

  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + SESSION_DURATION_MILLISECONDS,
  );

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lt: now,
        },
      },
    }),

    prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        lastUsedAt: now,
      },
    }),

    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: now,
      },
    }),
  ]);

  return {
    sessionToken,
    expiresAt,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.userRoles.map(
        (userRole) => userRole.role.slug,
      ),
    },
  };
}

export async function getAuthenticatedUser(
  sessionToken: string,
): Promise<AuthenticatedUser | null> {
  const tokenHash = hashSessionToken(sessionToken);
  const now = new Date();

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    select: {
      expiresAt: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          deletedAt: true,

          userRoles: {
            select: {
              role: {
                select: {
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const sessionIsExpired =
    session.expiresAt.getTime() <= now.getTime();

  const userIsUnavailable =
    !session.user.isActive
    || session.user.deletedAt !== null;

  if (sessionIsExpired || userIsUnavailable) {
    await prisma.session.deleteMany({
      where: {
        tokenHash,
      },
    });

    return null;
  }

  await prisma.session.update({
    where: {
      tokenHash,
    },
    data: {
      lastUsedAt: now,
    },
  });

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roles: session.user.userRoles.map(
      (userRole) => userRole.role.slug,
    ),
  };
}

export async function deleteSession(
  sessionToken: string,
): Promise<void> {
  const tokenHash = hashSessionToken(sessionToken);

  await prisma.session.deleteMany({
    where: {
      tokenHash,
    },
  });
}
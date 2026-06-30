import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'La variable de entorno DATABASE_URL no está configurada.',
  );
}

const parsedDatabaseUrl = new URL(databaseUrl);

if (parsedDatabaseUrl.protocol !== 'mysql:') {
  throw new Error(
    'DATABASE_URL debe utilizar el protocolo mysql://.',
  );
}

const databaseName = decodeURIComponent(
  parsedDatabaseUrl.pathname.replace(/^\//, ''),
);

if (!databaseName) {
  throw new Error(
    'DATABASE_URL no contiene el nombre de la base de datos.',
  );
}

const port = parsedDatabaseUrl.port
  ? Number.parseInt(parsedDatabaseUrl.port, 10)
  : 3306;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(
    'El puerto indicado en DATABASE_URL no es válido.',
  );
}

const adapter = new PrismaMariaDb({
  host: parsedDatabaseUrl.hostname,
  port,
  user: decodeURIComponent(parsedDatabaseUrl.username),
  password: decodeURIComponent(parsedDatabaseUrl.password),
  database: databaseName,
  connectionLimit: 5,
});

export const prisma = new PrismaClient({
  adapter,
});
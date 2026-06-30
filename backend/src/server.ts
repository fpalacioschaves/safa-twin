import 'dotenv/config';

import { createApp } from './app.js';

const host = process.env.HOST ?? '127.0.0.1';
const portText = process.env.PORT ?? '3000';
const port = Number.parseInt(portText, 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(
    `El valor PORT="${portText}" no es válido. Debe ser un número entre 1 y 65535.`,
  );
}

const app = createApp();

app.listen(port, host, () => {
  console.log('SAFA Twin API iniciada correctamente.');
  console.log(`Entorno: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`http://${host}:${port}/api/health`);
});
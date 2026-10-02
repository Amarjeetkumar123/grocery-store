// Starts the real API on a fresh local test database, with fake logins.
// Needs TEST_DATABASE_URL (see .env.test.example).
import { readFileSync } from 'node:fs';
import { createDatabasePool } from '../src/dbHelper/databaseConnection.js';
import { createApplication } from '../src/application.js';

export const skipWithoutDatabase = process.env.TEST_DATABASE_URL ? false : 'TEST_DATABASE_URL is not set';

export const fakeProductImageStorage = {
  isConfigured: true,
  uploadedImages: [],
  publicUrlFor: (imagePath) => (imagePath ? `https://storage.test/${imagePath}` : null),
  async uploadProductImage(productId, bytes, contentType) {
    this.uploadedImages.push({ productId, size: bytes.length, contentType });
    return `products/${productId}-test.${contentType.split('/')[1]}`;
  },
};

async function resetDatabase(database, extraSql) {
  await database.query('drop schema public cascade; create schema public;');
  await database.query(readFileSync(new URL('../database/001_schema.sql', import.meta.url), 'utf8'));
  await database.query(readFileSync(new URL('../database/002_sample_data.sql', import.meta.url), 'utf8'));
  if (extraSql) await database.query(extraSql);
}

export async function startTestServer({ usersByToken, extraSql }) {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!new URL(testDatabaseUrl).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a database whose name ends with _test; it gets wiped.');
  }
  const database = createDatabasePool(testDatabaseUrl);
  await resetDatabase(database, extraSql);

  const application = createApplication({
    database,
    verifyAccessToken: async (accessToken) => usersByToken[accessToken] ?? null,
    productImageStorage: fakeProductImageStorage,
    allowedOrigins: ['http://localhost:5173'],
  });
  const server = await new Promise((resolve) => {
    const listeningServer = application.listen(0, () => resolve(listeningServer));
  });
  const baseUrl = `http://localhost:${server.address().port}`;

  async function callApi(path, { token, method = 'GET', body, rawBody, contentType } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (contentType) headers['Content-Type'] = contentType;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(baseUrl + path, {
      method, headers, body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    return { status: response.status, body: await response.json() };
  }

  async function stop() {
    server.close();
    await database.end();
  }
  return { database, callApi, stop };
}

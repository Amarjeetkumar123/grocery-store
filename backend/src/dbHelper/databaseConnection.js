import { readFileSync } from 'node:fs';
import pg from 'pg';

// Postgres sends bigint ids and numeric amounts as strings. Every id and
// rupee amount in this app fits safely in a JavaScript number.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);
// Keep dates like best-before as "2027-03-31" text, so no timezone shifts them.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const uniqueViolationErrorCode = '23505';
export const foreignKeyViolationErrorCode = '23503';

export function createDatabasePool(connectionString, certificateAuthorityPath) {
  return new pg.Pool({
    connectionString,
    // Supabase needs TLS verified against its own certificate authority.
    ssl: certificateAuthorityPath ? { ca: readFileSync(certificateAuthorityPath, 'utf8') } : undefined,
    max: 10,
  });
}

// Runs work(client) inside one transaction: everything is saved, or nothing.
// Every dbHelper function accepts either the pool or this client.
export async function withTransaction(database, work) {
  const client = await database.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

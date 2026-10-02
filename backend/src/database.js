import { readFileSync } from 'node:fs';
import pg from 'pg';

// Postgres sends bigint ids and numeric amounts as strings. Every id and
// rupee amount in this app fits safely in a JavaScript number.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

export function createDatabasePool(connectionString, certificateAuthorityPath) {
  return new pg.Pool({
    connectionString,
    // Supabase needs TLS verified against its own certificate authority.
    ssl: certificateAuthorityPath ? { ca: readFileSync(certificateAuthorityPath, 'utf8') } : undefined,
    max: 10,
  });
}

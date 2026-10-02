import { createApplication } from './application.js';
import { createDatabasePool } from './database.js';
import { createSupabaseTokenVerifier } from './authentication.js';

const requiredVariables = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'ALLOWED_ORIGINS'];
const missingVariables = requiredVariables.filter((variableName) => !process.env[variableName]);
if (missingVariables.length > 0) {
  console.error(`Missing environment variables: ${missingVariables.join(', ')}. See .env.example.`);
  process.exit(1);
}

const database = createDatabasePool(process.env.DATABASE_URL, process.env.DATABASE_CA_CERTIFICATE_PATH);

const application = createApplication({
  database,
  verifyAccessToken: createSupabaseTokenVerifier(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY),
  allowedOrigins: process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
  trustProxy: process.env.TRUST_PROXY,
});

const port = Number(process.env.PORT ?? 3000);
application.listen(port, () => console.log(`Grocery store API listening on port ${port}`));

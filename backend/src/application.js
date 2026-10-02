import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { requireSignedIn } from './authentication.js';
import { createPublicRouter } from './routes/publicRoutes.js';
import { createAccountRouter } from './routes/accountRoutes.js';

export function createApplication({ database, verifyAccessToken, allowedOrigins, trustProxy }) {
  const application = express();

  if (trustProxy) {
    application.set('trust proxy', Number.isNaN(Number(trustProxy)) ? trustProxy : Number(trustProxy));
  }
  application.use(helmet());
  application.use(cors({ origin: allowedOrigins }));
  application.use(express.json({ limit: '100kb' }));
  application.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a few minutes and try again.' },
  }));

  application.get('/api/health', (request, response) => response.json({ status: 'ok' }));
  application.use('/api', createPublicRouter(database));
  application.use('/api/account', requireSignedIn(verifyAccessToken, database), createAccountRouter(database));

  application.use('/api', (request, response) => response.status(404).json({ error: 'Not found.' }));

  application.use((error, request, response, next) => {
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'The request was not valid JSON.' });
    }
    console.error(error);
    response.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return application;
}

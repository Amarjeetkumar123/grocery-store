import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { requireRole, requireSignedIn } from './authentication.js';
import { ServiceError } from './services/serviceError.js';
import { createStoreService } from './services/storeService.js';
import { createAccountService } from './services/accountService.js';
import { createCatalogueService } from './services/catalogueService.js';
import { createProductService } from './services/productService.js';
import { createProductImportService } from './services/productImportService.js';
import { createStockService } from './services/stockService.js';
import { createCheckoutService } from './services/checkoutService.js';
import { createCustomerOrderService } from './services/customerOrderService.js';
import { createZoneService } from './services/zoneService.js';
import { createAdminOrderService } from './services/adminOrderService.js';
import { createPeopleService } from './services/peopleService.js';
import { createDeliveryService } from './services/deliveryService.js';
import { createMoneyService } from './services/moneyService.js';
import { createPublicRouter } from './routes/publicRoutes.js';
import { createAccountRouter } from './routes/accountRoutes.js';
import { createAdminProductRouter } from './routes/adminProductRoutes.js';
import { createAdminStockRouter } from './routes/adminStockRoutes.js';
import { createAdminZoneRouter } from './routes/adminZoneRoutes.js';
import { createAdminOrderRouter } from './routes/adminOrderRoutes.js';
import { createAdminPeopleRouter } from './routes/adminPeopleRoutes.js';
import { createAdminMoneyRouter } from './routes/adminMoneyRoutes.js';
import { createRiderRouter } from './routes/riderRoutes.js';
import { createCheckoutRouter } from './routes/checkoutRoutes.js';
import { createCustomerOrderRouter } from './routes/customerOrderRoutes.js';

function createServices(dependencies) {
  return {
    storeService: createStoreService(dependencies),
    accountService: createAccountService(dependencies),
    catalogueService: createCatalogueService(dependencies),
    productService: createProductService(dependencies),
    productImportService: createProductImportService(dependencies),
    stockService: createStockService(dependencies),
    checkoutService: createCheckoutService(dependencies),
    customerOrderService: createCustomerOrderService(dependencies),
    zoneService: createZoneService(dependencies),
    adminOrderService: createAdminOrderService(dependencies),
    peopleService: createPeopleService(dependencies),
    deliveryService: createDeliveryService(dependencies),
    moneyService: createMoneyService(dependencies),
  };
}

function applySecurityMiddleware(application, { allowedOrigins, trustProxy }) {
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
}

// ServiceError -> its own status and message. Anything else is a bug:
// it is logged, and the user only sees a general message.
function applyErrorHandling(application) {
  application.use('/api', (request, response) => response.status(404).json({ error: 'Not found.' }));
  application.use((error, request, response, next) => {
    if (error instanceof ServiceError) {
      return response.status(error.status).json({ error: error.message, ...error.extraResponseFields });
    }
    if (error.type === 'entity.parse.failed') return response.status(400).json({ error: 'The request was not valid JSON.' });
    if (error.type === 'entity.too.large') return response.status(413).json({ error: 'That file is too large.' });
    console.error(error);
    response.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
}

export function createApplication({ database, verifyAccessToken, productImageStorage, allowedOrigins, trustProxy }) {
  const application = express();
  applySecurityMiddleware(application, { allowedOrigins, trustProxy });
  const services = createServices({ database, productImageStorage });
  const signedIn = requireSignedIn(verifyAccessToken, database);

  application.get('/api/health', (request, response) => response.json({ status: 'ok' }));
  application.use('/api', createPublicRouter(services));
  application.use('/api/account', signedIn, createAccountRouter(services));
  application.use('/api/checkout', signedIn, createCheckoutRouter(services));
  application.use('/api/orders', signedIn, createCustomerOrderRouter(services));
  application.use('/api/admin', signedIn, requireRole('owner', 'packer'),
    createAdminStockRouter(services), createAdminProductRouter(services), createAdminZoneRouter(services),
    createAdminOrderRouter(services), createAdminPeopleRouter(services), createAdminMoneyRouter(services));
  application.use('/api/rider', signedIn, requireRole('rider'), createRiderRouter(services));

  applyErrorHandling(application);
  return application;
}

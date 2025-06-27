import Fastify from 'fastify';
import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './routes/health';
import pdfRoutes from './routes/pdf';
import apiRoutes from './routes/api';

// Create Fastify app
const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register plugins
async function registerPlugins() {
  // Security middleware
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  });

  // CORS configuration
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Multipart support for file uploads (up to 100MB)
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 10, // Maximum 10 files per request
      fieldSize: 1024 * 1024, // 1MB per field
    },
  });
}

// Register routes
async function registerRoutes() {
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(pdfRoutes, { prefix: '/api/v1/pdf' });
  await app.register(apiRoutes, { prefix: '/api/v1' });
}

// Root route
app.get('/', async (request, reply) => {
  return {
    message: '🚀 DeckCraft AI Backend API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      pdf: '/api/v1/pdf',
      docs: '/api/v1/docs'
    },
    features: ['PDF Ingestion', 'Text Extraction', 'OCR Processing', 'Metadata Tagging']
  };
});

// Global error handler
app.setErrorHandler(async (error, request, reply) => {
  request.log.error(error, 'Unhandled error occurred');
  
  const statusCode = error.statusCode || 500;
  const response = {
    error: true,
    message: statusCode === 500 ? 'Internal Server Error' : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  return reply.status(statusCode).send(response);
});

// 404 handler
app.setNotFoundHandler(async (request, reply) => {
  return reply.status(404).send({
    error: true,
    message: 'Route not found',
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /health/detailed',
      'POST /api/v1/pdf/upload',
      'POST /api/v1/pdf/batch',
      'GET /api/v1/pdf/:id',
      'GET /api/v1'
    ]
  });
});

// Initialize the app
async function build() {
  try {
    await registerPlugins();
    await registerRoutes();
    return app;
  } catch (error) {
    app.log.error(error, 'Failed to build application');
    process.exit(1);
  }
}

export { build };
export default app; 
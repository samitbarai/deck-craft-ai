import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Plugin function for Fastify
export default async function apiRoutes(fastify: FastifyInstance) {
  // API documentation endpoint
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      name: 'DeckCraft AI API',
      version: '1.0.0',
      description: 'Modern AI-powered pitch deck analysis and content generation platform',
      documentation: {
        swagger: '/api/v1/docs',
        postman: '/api/v1/postman.json'
      },
      endpoints: {
        pdf: {
          upload: 'POST /api/v1/pdf/upload',
          batch: 'POST /api/v1/pdf/batch',
          ocr: 'POST /api/v1/pdf/ocr',
          health: 'GET /api/v1/pdf/health'
        },
        health: {
          basic: 'GET /health',
          detailed: 'GET /health/detailed'
        }
      },
      features: [
        'PDF Text Extraction using pdf-parse',
        'OCR Processing with Tesseract.js',
        'Image Optimization with Sharp',
        'Batch Processing Support',
        'Metadata Tagging',
        'Modern Fastify Framework'
      ],
      limits: {
        maxFileSize: '100MB',
        maxBatchSize: 10,
        supportedFormats: ['PDF', 'Images']
      }
    });
  });

  // Future feature endpoints
  fastify.post('/generate/outline', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({
      error: false,
      message: 'Outline generation coming soon!',
      status: 'not_implemented',
      expected: 'Q2 2024'
    });
  });

  fastify.post('/generate/content', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({
      error: false,
      message: 'Content generation coming soon!',
      status: 'not_implemented',
      expected: 'Q2 2024'
    });
  });

  fastify.post('/generate/deck', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({
      error: false,
      message: 'Full deck generation coming soon!',
      status: 'not_implemented',
      expected: 'Q3 2024'
    });
  });
} 
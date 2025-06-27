import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Plugin function for Fastify
export default async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    
    return reply.status(200).send({
      status: 'healthy',
      timestamp,
      uptime: Math.floor(uptime),
      environment: process.env.NODE_ENV || 'development',
      service: 'DeckCraft AI Backend'
    });
  });

  // Detailed health check
  fastify.get('/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    const memoryUsage = process.memoryUsage();
    
    return reply.status(200).send({
      status: 'healthy',
      timestamp,
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`
      },
      environment: process.env.NODE_ENV || 'development',
      service: 'DeckCraft AI Backend',
      version: '1.0.0',
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        architecture: process.arch
      },
      features: {
        pdf_processing: 'enabled',
        ocr: 'enabled',
        batch_upload: 'enabled',
        image_extraction: 'enabled'
      }
    });
  });
} 
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'DeckCraft AI Backend is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

router.get('/detailed', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    },
    database: {
      postgresql: 'Not connected', // Will be updated when DB is connected
      vespa: 'Not connected', // Will be updated when Vespa is connected
    },
  };

  res.status(200).json(healthCheck);
});

export default router; 
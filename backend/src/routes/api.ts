import { Router, Request, Response } from 'express';

const router = Router();

// API Info endpoint
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'DeckCraft AI API v1',
    version: '1.0.0',
    endpoints: [
      'GET /api/v1/health - API health check',
      'POST /api/v1/pdf/upload - Upload PDF for ingestion (Coming soon)',
      'POST /api/v1/content/generate-outline - Generate content outline (Coming soon)',
      'GET /api/v1/content/retrieve-assets - Retrieve content assets (Coming soon)',
      'POST /api/v1/figma/create-slides - Create Figma slides (Coming soon)',
      'GET /api/v1/merchant/profile - Get merchant profile (Coming soon)',
    ],
    documentation: 'https://api.deckcraft.ai/docs',
  });
});

// Placeholder routes for main API endpoints from PRD
router.post('/pdf/upload', (req: Request, res: Response) => {
  res.status(501).json({
    message: 'PDF upload endpoint - Coming soon',
    description: 'This endpoint will handle PDF ingestion and processing',
  });
});

router.post('/content/generate-outline', (req: Request, res: Response) => {
  res.status(501).json({
    message: 'Content outline generation endpoint - Coming soon',
    description: 'This endpoint will generate content outlines based on merchant data',
  });
});

router.get('/content/retrieve-assets', (req: Request, res: Response) => {
  res.status(501).json({
    message: 'Asset retrieval endpoint - Coming soon',
    description: 'This endpoint will retrieve relevant content assets from vector database',
  });
});

router.post('/figma/create-slides', (req: Request, res: Response) => {
  res.status(501).json({
    message: 'Figma slide creation endpoint - Coming soon',
    description: 'This endpoint will create Figma slide templates',
  });
});

router.get('/merchant/profile', (req: Request, res: Response) => {
  res.status(501).json({
    message: 'Merchant profile endpoint - Coming soon',
    description: 'This endpoint will return merchant profile data',
  });
});

export default router; 
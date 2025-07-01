import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { googleSlidesService } from '../services/google-slides';

// Type definitions for request bodies
interface CreatePresentationRequest {
  templateId?: string;
  title: string;
  userId: string;
}

interface UpdatePresentationRequest {
  slideUpdates: Array<{
    slideId: string;
    title?: string;
    content?: string;
    imageUrl?: string;
  }>;
  userId: string;
}

interface GetTemplatesRequest {
  userId: string;
  folderId?: string;
}

// Plugin function for Fastify
export default async function slidesRoutes(fastify: FastifyInstance) {
  
  // GET /slides/templates - Fetch available templates
  fastify.get('/templates', {
    schema: {
      description: 'Fetch Google Slides templates',
      tags: ['slides'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID for authentication' },
          folderId: { type: 'string', description: 'Optional folder ID to filter templates' }
        },
        required: ['userId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            templates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  thumbnailUrl: { type: 'string' },
                  slideCount: { type: 'number' },
                  description: { type: 'string' }
                }
              }
            },
            count: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: GetTemplatesRequest }>, reply: FastifyReply) => {
    try {
      const { userId, folderId } = request.query;

      // Validate user authentication
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Fetch templates
      const templates = await googleSlidesService.getTemplates(userId, folderId);

      return reply.status(200).send({
        success: true,
        templates,
        count: templates.length,
        message: `Found ${templates.length} templates`
      });

    } catch (error) {
      fastify.log.error('Error fetching templates:', error);
      
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch templates',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // POST /slides/presentations - Create new presentation from template or blank
  fastify.post('/presentations', {
    schema: {
      description: 'Create a new Google Slides presentation',
      tags: ['slides'],
      body: {
        type: 'object',
        properties: {
          templateId: { type: 'string', description: 'Template ID to copy from (optional)' },
          title: { type: 'string', description: 'Title for the new presentation' },
          userId: { type: 'string', description: 'User ID for authentication' }
        },
        required: ['title', 'userId']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            presentation: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                url: { type: 'string' },
                slideCount: { type: 'number' },
                thumbnailUrl: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CreatePresentationRequest }>, reply: FastifyReply) => {
    try {
      const { templateId, title, userId } = request.body;

      // Validate input
      if (!title.trim()) {
        return reply.status(400).send({
          success: false,
          error: 'Title is required and cannot be empty',
          code: 'INVALID_INPUT'
        });
      }

      // Validate user authentication
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Create presentation
      let presentation;
      if (templateId) {
        presentation = await googleSlidesService.createPresentationFromTemplate(
          userId, 
          templateId, 
          title
        );
      } else {
        presentation = await googleSlidesService.createBlankPresentation(userId, title);
      }

      return reply.status(201).send({
        success: true,
        presentation,
        message: `Successfully created presentation: ${presentation.title}`
      });

    } catch (error) {
      fastify.log.error('Error creating presentation:', error);
      
      const errorMessage = (error as Error).message || '';
      
      // Handle specific Google API errors
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return reply.status(404).send({
          success: false,
          error: 'Template not found or not accessible',
          code: 'TEMPLATE_NOT_FOUND'
        });
      }

      if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to access template',
          code: 'PERMISSION_DENIED'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to create presentation',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // GET /slides/presentations/:presentationId - Get presentation details
  fastify.get('/presentations/:presentationId', {
    schema: {
      description: 'Get Google Slides presentation details',
      tags: ['slides'],
      params: {
        type: 'object',
        properties: {
          presentationId: { type: 'string', description: 'Presentation ID' }
        },
        required: ['presentationId']
      },
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID for authentication' }
        },
        required: ['userId']
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { presentationId: string },
    Querystring: { userId: string }
  }>, reply: FastifyReply) => {
    try {
      const { presentationId } = request.params;
      const { userId } = request.query;

      // Validate user authentication
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Get presentation info
      const presentation = await googleSlidesService.getPresentationInfo(userId, presentationId);

      return reply.status(200).send({
        success: true,
        presentation
      });

    } catch (error) {
      fastify.log.error('Error fetching presentation:', error);
      
      const errorMessage = (error as Error).message || '';
      
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return reply.status(404).send({
          success: false,
          error: 'Presentation not found or not accessible',
          code: 'PRESENTATION_NOT_FOUND'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch presentation details',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // GET /slides/presentations/:presentationId/content - Get presentation content
  fastify.get('/presentations/:presentationId/content', {
    schema: {
      description: 'Get all slide content from a Google Slides presentation',
      tags: ['slides'],
      params: {
        type: 'object',
        properties: {
          presentationId: { type: 'string', description: 'Presentation ID' }
        },
        required: ['presentationId']
      },
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID for authentication' }
        },
        required: ['userId']
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { presentationId: string },
    Querystring: { userId: string }
  }>, reply: FastifyReply) => {
    try {
      const { presentationId } = request.params;
      const { userId } = request.query;

      // Validate user authentication
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Get presentation content
      const presentationContent = await googleSlidesService.getPresentationContent(userId, presentationId);

      return reply.status(200).send({
        success: true,
        ...presentationContent,
        message: `Retrieved content from ${presentationContent.slides.length} slides`
      });

    } catch (error) {
      fastify.log.error('Error fetching presentation content:', error);
      
      const errorMessage = (error as Error).message || '';
      
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return reply.status(404).send({
          success: false,
          error: 'Presentation not found or not accessible',
          code: 'PRESENTATION_NOT_FOUND'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch presentation content',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // PUT /slides/presentations/:presentationId - Update presentation content
  fastify.put('/presentations/:presentationId', {
    schema: {
      description: 'Update Google Slides presentation content',
      tags: ['slides'],
      params: {
        type: 'object',
        properties: {
          presentationId: { type: 'string', description: 'Presentation ID' }
        },
        required: ['presentationId']
      },
      body: {
        type: 'object',
        properties: {
          slideUpdates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slideId: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                imageUrl: { type: 'string' }
              },
              required: ['slideId']
            }
          },
          userId: { type: 'string', description: 'User ID for authentication' }
        },
        required: ['slideUpdates', 'userId']
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { presentationId: string },
    Body: UpdatePresentationRequest
  }>, reply: FastifyReply) => {
    try {
      const { presentationId } = request.params;
      const { slideUpdates, userId } = request.body;

      // Validate input
      if (!slideUpdates || slideUpdates.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'At least one slide update is required',
          code: 'INVALID_INPUT'
        });
      }

      // Validate user authentication
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Update each slide
      const updatePromises = slideUpdates.map(update => 
        googleSlidesService.updateSlideContent(userId, presentationId, update.slideId, update)
      );

      await Promise.all(updatePromises);

      // Get updated presentation info
      const updatedPresentation = await googleSlidesService.getPresentationInfo(userId, presentationId);

      return reply.status(200).send({
        success: true,
        presentation: updatedPresentation,
        updatedSlides: slideUpdates.length,
        message: `Successfully updated ${slideUpdates.length} slide(s)`
      });

    } catch (error) {
      fastify.log.error('Error updating presentation:', error);
      
      const errorMessage = (error as Error).message || '';
      
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return reply.status(404).send({
          success: false,
          error: 'Presentation or slide not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions to edit presentation',
          code: 'PERMISSION_DENIED'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to update presentation',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // POST /slides/presentations/:presentationId/slides - Add new slide
  fastify.post('/presentations/:presentationId/slides', {
    schema: {
      description: 'Add a new slide to Google Slides presentation',
      tags: ['slides'],
      params: {
        type: 'object',
        properties: {
          presentationId: { type: 'string', description: 'Presentation ID' }
        },
        required: ['presentationId']
      },
      body: {
        type: 'object',
        properties: {
          layoutId: { type: 'string', description: 'Layout ID for the new slide (optional)' },
          userId: { type: 'string', description: 'User ID for authentication' }
        },
        required: ['userId']
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { presentationId: string },
    Body: { layoutId?: string, userId: string }
  }>, reply: FastifyReply) => {
    try {
      const { presentationId } = request.params;
      const { layoutId, userId } = request.body;

      // Validate user authentication
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Add slide
      const slideId = await googleSlidesService.addSlide(userId, presentationId, layoutId);

      return reply.status(201).send({
        success: true,
        slideId,
        message: 'Successfully added new slide'
      });

    } catch (error) {
      fastify.log.error('Error adding slide:', error);
      
      const errorMessage = (error as Error).message || '';
      
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return reply.status(404).send({
          success: false,
          error: 'Presentation not found',
          code: 'PRESENTATION_NOT_FOUND'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to add slide',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // GET /slides/auth/status - Check authentication status
  fastify.get('/auth/status', {
    schema: {
      description: 'Check Google Slides authentication status',
      tags: ['slides'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to check' }
        },
        required: ['userId']
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.query;
      
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      
      let userProfile = null;
      if (isAuthenticated) {
        try {
          userProfile = await googleSlidesService.getUserProfile(userId);
        } catch (error) {
          fastify.log.warn('Could not fetch user profile:', error);
        }
      }

      return reply.status(200).send({
        success: true,
        authenticated: isAuthenticated,
        userProfile,
        message: isAuthenticated ? 'User is authenticated' : 'User authentication required'
      });

    } catch (error) {
      fastify.log.error('Error checking auth status:', error);
      
      return reply.status(500).send({
        success: false,
        error: 'Failed to check authentication status',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });
}

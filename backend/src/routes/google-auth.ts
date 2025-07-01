import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { generateAuthUrl, oauth2Client } from '../config/google-auth';
import { tokenManager } from '../services/token-manager';
import { googleSlidesService } from '../services/google-slides';

// Interface for OAuth state parameter (stored in session/memory)
interface OAuthState {
  state: string;
  userId: string;
  createdAt: Date;
}

// In-memory store for OAuth states (in production, use Redis or database)
const oauthStates = new Map<string, OAuthState>();

// Clean up expired OAuth states (older than 10 minutes)
setInterval(() => {
  const now = new Date();
  for (const [key, value] of oauthStates.entries()) {
    if (now.getTime() - value.createdAt.getTime() > 10 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export default async function googleAuthRoutes(fastify: FastifyInstance) {
  
  // Initiate Google OAuth flow
  fastify.get('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // In a real app, you'd get userId from session or JWT
      // For now, we'll expect it as a query parameter or use a demo user
      const userId = (request.query as any)?.userId || '90b2d2a2-83e2-4b10-be5d-0721bb20279b';
      
      // Generate secure state parameter for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state with user association
      oauthStates.set(state, {
        state,
        userId,
        createdAt: new Date()
      });

      // Generate authorization URL
      const authUrl = generateAuthUrl(state);

      return reply.send({
        success: true,
        authUrl,
        message: 'Redirect user to this URL to authorize Google Slides access'
      });

    } catch (error) {
      request.log.error('Error initiating Google OAuth:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to initiate Google authentication'
      });
    }
  });

  // Handle OAuth callback
  fastify.get('/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code, state, error } = request.query as any;
    let oauthState: OAuthState | undefined;

    try {
      // Check for OAuth errors
      if (error) {
        return reply.status(400).send({
          success: false,
          error: `OAuth error: ${error}`
        });
      }

      // Validate required parameters
      if (!code || !state) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required OAuth parameters'
        });
      }

      // Validate state parameter (CSRF protection)
      oauthState = oauthStates.get(state);
      if (!oauthState) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid or expired OAuth state'
        });
      }

      // Clean up used state
      oauthStates.delete(state);

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Store tokens in database
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
      
      await tokenManager.storeTokens({
        user_id: oauthState.userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope,
        expires_at: expiresAt
      });

      request.log.info(`Google OAuth successful for user: ${oauthState.userId}`);

      // In a real app, you might redirect to frontend with success message
      return reply.send({
        success: true,
        message: 'Google authentication successful',
        user_id: oauthState.userId,
        scopes: tokens.scope?.split(' ') || []
      });

    } catch (error) {
      request.log.error('Error handling OAuth callback:', error);
      request.log.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        code: code || 'No code',
        state: state || 'No state',
        userId: oauthState?.userId || 'No user'
      });
      return reply.status(500).send({
        success: false,
        error: 'Failed to complete Google authentication',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Check authentication status
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // In a real app, get userId from authenticated session
      const userId = (request.query as any)?.userId || '90b2d2a2-83e2-4b10-be5d-0721bb20279b';

      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);

      if (isAuthenticated) {
        // Get user's Google profile info
        try {
          const profile = await googleSlidesService.getUserProfile(userId);
          const providers = await tokenManager.getUserProviders(userId);

          return reply.send({
            success: true,
            authenticated: true,
            user: {
              id: userId,
              email: profile.email,
              name: profile.name,
              picture: profile.picture
            },
            providers,
            message: 'User is authenticated with Google'
          });
        } catch (profileError) {
          // User is authenticated but can't get profile (possibly expired token)
          return reply.send({
            success: true,
            authenticated: true,
            user: { id: userId },
            message: 'User is authenticated but profile unavailable (token may need refresh)'
          });
        }
      } else {
        return reply.send({
          success: true,
          authenticated: false,
          message: 'User is not authenticated with Google'
        });
      }

    } catch (error) {
      request.log.error('Error checking auth status:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to check authentication status'
      });
    }
  });

  // Refresh access token
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // In a real app, get userId from authenticated session
      const userId = (request.body as any)?.userId || '90b2d2a2-83e2-4b10-be5d-0721bb20279b';

      const tokens = await tokenManager.getTokens(userId, 'google');
      
      if (!tokens || !tokens.refresh_token) {
        return reply.status(404).send({
          success: false,
          error: 'No refresh token found for user'
        });
      }

      // Refresh the token
      oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update tokens in database
      const expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
      
      await tokenManager.updateTokens(userId, 'google', {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expires_at: expiresAt
      });

      return reply.send({
        success: true,
        message: 'Access token refreshed successfully',
        expires_at: expiresAt
      });

    } catch (error) {
      request.log.error('Error refreshing token:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to refresh access token'
      });
    }
  });

  // Disconnect (revoke) Google authentication
  fastify.delete('/disconnect', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // In a real app, get userId from authenticated session
      const userId = (request.body as any)?.userId || (request.query as any)?.userId || '90b2d2a2-83e2-4b10-be5d-0721bb20279b';

      const tokens = await tokenManager.getTokens(userId, 'google');
      
      if (tokens) {
        // Revoke token with Google
        try {
          await oauth2Client.revokeCredentials();
        } catch (revokeError) {
          request.log.warn('Failed to revoke token with Google:', revokeError);
          // Continue anyway to clean up local tokens
        }

        // Delete tokens from database
        await tokenManager.deleteTokens(userId, 'google');
      }

      return reply.send({
        success: true,
        message: 'Google authentication disconnected successfully'
      });

    } catch (error) {
      request.log.error('Error disconnecting Google auth:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to disconnect Google authentication'
      });
    }
  });

  // Test endpoint to check Google Slides API access
  fastify.get('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.query as any)?.userId || '90b2d2a2-83e2-4b10-be5d-0721bb20279b';

      // Test if user can access Google Slides
      const isAuthenticated = await googleSlidesService.isUserAuthenticated(userId);
      
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google'
        });
      }

      // Try to fetch templates
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const templates = await googleSlidesService.getTemplates(userId, folderId);

      return reply.send({
        success: true,
        message: 'Google Slides API access working',
        templatesFound: templates.length,
        templates: templates.slice(0, 3) // Show first 3 templates
      });

    } catch (error) {
      request.log.error('Error testing Google Slides access:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to test Google Slides access',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

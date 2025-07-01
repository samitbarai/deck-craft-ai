import { google } from 'googleapis';
import { createAuthenticatedClient } from '../config/google-auth';
import { tokenManager, OAuthTokens } from './token-manager';

export interface SlideTemplate {
  id: string;
  name: string;
  thumbnailUrl?: string;
  slideCount?: number;
  description?: string;
}

export interface PresentationInfo {
  id: string;
  title: string;
  url: string;
  slideCount: number;
  thumbnailUrl?: string;
}

export interface SlideContent {
  slideId: string;
  title?: string;
  content?: string;
  imageUrl?: string;
}

export class GoogleSlidesService {
  
  // Get authenticated Google Slides API client for a user
  private async getAuthenticatedClient(userId: string) {
    const tokens = await tokenManager.getTokens(userId, 'google');
    
    if (!tokens) {
      throw new Error('No Google authentication found for user');
    }

    // Check if token is expired and refresh if needed
    if (tokenManager.isTokenExpired(tokens)) {
      const auth = createAuthenticatedClient(tokens);
      try {
        const { credentials } = await auth.refreshAccessToken();
        
        // Update tokens in database
        const expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
        await tokenManager.updateTokens(userId, 'google', {
          access_token: credentials.access_token!,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          expires_at: expiresAt
        });

        return createAuthenticatedClient(credentials);
      } catch (error) {
        throw new Error(`Failed to refresh Google access token: ${error}`);
      }
    }

    return createAuthenticatedClient(tokens);
  }

  // List Google Slides templates from a specific folder
  async getTemplates(userId: string, folderId?: string): Promise<SlideTemplate[]> {
    const auth = await this.getAuthenticatedClient(userId);
    const drive = google.drive({ version: 'v3', auth });

    try {
      let query = "mimeType='application/vnd.google-apps.presentation'";
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const response = await drive.files.list({
        q: query,
        fields: 'files(id,name,thumbnailLink,description)',
        pageSize: 50
      });

      const templates: SlideTemplate[] = [];

      for (const file of response.data.files || []) {
        if (file.id && file.name) {
          // Get slide count for each presentation
          let slideCount = 0;
          try {
            const slides = google.slides({ version: 'v1', auth });
            const presentation = await slides.presentations.get({
              presentationId: file.id
            });
            slideCount = presentation.data.slides?.length || 0;
          } catch (error) {
            console.warn(`Could not get slide count for ${file.name}:`, error);
          }

          templates.push({
            id: file.id,
            name: file.name,
            thumbnailUrl: file.thumbnailLink || undefined,
            slideCount,
            description: file.description || undefined
          });
        }
      }

      return templates;
    } catch (error) {
      throw new Error(`Failed to fetch Google Slides templates: ${error}`);
    }
  }

  // Create a new presentation from a template
  async createPresentationFromTemplate(
    userId: string, 
    templateId: string, 
    title: string
  ): Promise<PresentationInfo> {
    const auth = await this.getAuthenticatedClient(userId);
    const drive = google.drive({ version: 'v3', auth });
    const slides = google.slides({ version: 'v1', auth });

    try {
      // Copy the template presentation
      const copiedFile = await drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: title
        }
      });

      if (!copiedFile.data.id) {
        throw new Error('Failed to copy template presentation');
      }

      // Get presentation details
      const presentation = await slides.presentations.get({
        presentationId: copiedFile.data.id
      });

      const presentationUrl = `https://docs.google.com/presentation/d/${copiedFile.data.id}/edit`;

      return {
        id: copiedFile.data.id,
        title: presentation.data.title || title,
        url: presentationUrl,
        slideCount: presentation.data.slides?.length || 0,
        thumbnailUrl: undefined // Google Slides API doesn't provide thumbnails directly
      };
    } catch (error) {
      throw new Error(`Failed to create presentation from template: ${error}`);
    }
  }

  // Create a blank presentation
  async createBlankPresentation(userId: string, title: string): Promise<PresentationInfo> {
    const auth = await this.getAuthenticatedClient(userId);
    const slides = google.slides({ version: 'v1', auth });

    try {
      const presentation = await slides.presentations.create({
        requestBody: {
          title
        }
      });

      if (!presentation.data.presentationId) {
        throw new Error('Failed to create presentation');
      }

      const presentationUrl = `https://docs.google.com/presentation/d/${presentation.data.presentationId}/edit`;

      return {
        id: presentation.data.presentationId,
        title: presentation.data.title || title,
        url: presentationUrl,
        slideCount: presentation.data.slides?.length || 0
      };
    } catch (error) {
      throw new Error(`Failed to create blank presentation: ${error}`);
    }
  }

  // Get presentation details
  async getPresentationInfo(userId: string, presentationId: string): Promise<PresentationInfo> {
    const auth = await this.getAuthenticatedClient(userId);
    const slides = google.slides({ version: 'v1', auth });

    try {
      const presentation = await slides.presentations.get({
        presentationId
      });

      const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

      return {
        id: presentationId,
        title: presentation.data.title || 'Untitled',
        url: presentationUrl,
        slideCount: presentation.data.slides?.length || 0
      };
    } catch (error) {
      throw new Error(`Failed to get presentation info: ${error}`);
    }
  }

  // Update slide content
  async updateSlideContent(
    userId: string,
    presentationId: string,
    slideId: string,
    content: SlideContent
  ): Promise<void> {
    const auth = await this.getAuthenticatedClient(userId);
    const slides = google.slides({ version: 'v1', auth });

    try {
      const requests: any[] = [];

      // Update title if provided
      if (content.title) {
        requests.push({
          replaceAllText: {
            containsText: {
              text: '{{TITLE}}',
              matchCase: false
            },
            replaceText: content.title
          }
        });
      }

      // Update content if provided
      if (content.content) {
        requests.push({
          replaceAllText: {
            containsText: {
              text: '{{CONTENT}}',
              matchCase: false
            },
            replaceText: content.content
          }
        });
      }

      // Execute batch update if there are requests
      if (requests.length > 0) {
        await slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests
          }
        });
      }
    } catch (error) {
      throw new Error(`Failed to update slide content: ${error}`);
    }
  }

  // Add a new slide to presentation
  async addSlide(
    userId: string,
    presentationId: string,
    layoutId?: string
  ): Promise<string> {
    const auth = await this.getAuthenticatedClient(userId);
    const slides = google.slides({ version: 'v1', auth });

    try {
      const response = await slides.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests: [{
            createSlide: {
              insertionIndex: 1,
              slideLayoutReference: layoutId ? { predefinedLayout: layoutId } : undefined
            }
          }]
        }
      });

      const slideId = response.data.replies?.[0]?.createSlide?.objectId;
      if (!slideId) {
        throw new Error('Failed to get created slide ID');
      }

      return slideId;
    } catch (error) {
      throw new Error(`Failed to add slide: ${error}`);
    }
  }

  // Check if user has valid Google authentication
  async isUserAuthenticated(userId: string): Promise<boolean> {
    try {
      const tokens = await tokenManager.getTokens(userId, 'google');
      return tokens !== null;
    } catch (error) {
      return false;
    }
  }

  // Get user's Google profile info
  async getUserProfile(userId: string): Promise<any> {
    const auth = await this.getAuthenticatedClient(userId);
    const oauth2 = google.oauth2({ version: 'v2', auth });

    try {
      const response = await oauth2.userinfo.get();
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error}`);
    }
  }
}

// Export singleton instance
export const googleSlidesService = new GoogleSlidesService();
export default googleSlidesService;

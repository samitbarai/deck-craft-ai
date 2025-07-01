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

export interface SlideInfo {
  objectId: string;
  index: number;
}

export interface PresentationInfo {
  id: string;
  title: string;
  url: string;
  slideCount: number;
  slides?: SlideInfo[];
  thumbnailUrl?: string;
}

export interface TextUpdate {
  index?: number;     // Optional: Update by position (0-based, sorted by size)
  objectId?: string;  // Optional: Update by specific Google Slides object ID
  text: string;       // Required: New text content
}

export interface TextElement {
  index: number;
  text: string;
  size: 'small' | 'medium' | 'large';
  objectId: string;
}

export interface ImageElement {
  index: number;
  objectId: string;
  imageUrl?: string;
  sourceUrl?: string;
  size: 'small' | 'medium' | 'large';
  dimensions?: {
    width: number;
    height: number;
  };
  altText?: string;
}

export interface SlideContentData {
  slideId: string;
  index: number;
  textElements: TextElement[];
  imageElements: ImageElement[];
}

export interface PresentationContentResponse {
  presentation: {
    id: string;
    title: string;
    slideCount: number;
  };
  slides: SlideContentData[];
}

export interface SlideContent {
  slideId: string;
  title?: string;
  content?: string;
  imageUrl?: string;
  textUpdates?: TextUpdate[];  // New: Array for updating text by index
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
        presentationId,
        fields: 'presentationId,title,slides.objectId'
      });

      const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

      // Extract slide information
      const slideInfo: SlideInfo[] = presentation.data.slides?.map((slide, index) => ({
        objectId: slide.objectId || '',
        index
      })) || [];

      return {
        id: presentationId,
        title: presentation.data.title || 'Untitled',
        url: presentationUrl,
        slideCount: presentation.data.slides?.length || 0,
        slides: slideInfo
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
      // First, get the presentation to understand the slide structure
      const presentation = await slides.presentations.get({
        presentationId,
        fields: 'slides.pageElements.shape.text,slides.objectId'
      });

      // Find the target slide
      const targetSlide = presentation.data.slides?.find(slide => slide.objectId === slideId);
      if (!targetSlide) {
        throw new Error(`Slide with ID ${slideId} not found`);
      }

      const requests: any[] = [];

      // Get all text elements in the slide
      const textElements = targetSlide.pageElements?.filter(element => 
        element.shape?.text?.textElements
      ) || [];

      if (textElements.length === 0) {
        throw new Error('No text elements found in the slide');
      }

      // Sort text elements by size (larger text boxes first - likely titles)
      textElements.sort((a, b) => {
        const aSize = (a.size?.width?.magnitude || 0) * (a.size?.height?.magnitude || 0);
        const bSize = (b.size?.width?.magnitude || 0) * (b.size?.height?.magnitude || 0);
        return bSize - aSize;
      });

      // Helper function to update text at specific index
      const updateTextAtIndex = (index: number, newText: string) => {
        if (index >= textElements.length) {
          throw new Error(`Text element index ${index} not found. Slide has ${textElements.length} text elements.`);
        }

        const element = textElements[index];
        const currentText = this.extractTextFromElement(element);
        
        if (currentText && currentText.trim().length > 0) {
          requests.push({
            replaceAllText: {
              containsText: {
                text: currentText,
                matchCase: false
              },
              replaceText: newText,
              pageObjectIds: [slideId]
            }
          });
        } else {
          // If no existing text, insert new text
          requests.push({
            insertText: {
              objectId: element.objectId,
              text: newText,
              insertionIndex: 0
            }
          });
        }
      };

      // Helper function to update text by object ID
      const updateTextByObjectId = (objectId: string, newText: string) => {
        const element = textElements.find(el => el.objectId === objectId);
        if (!element) {
          throw new Error(`Text element with object ID '${objectId}' not found in slide.`);
        }

        const currentText = this.extractTextFromElement(element);
        
        if (currentText && currentText.trim().length > 0) {
          requests.push({
            replaceAllText: {
              containsText: {
                text: currentText,
                matchCase: false
              },
              replaceText: newText,
              pageObjectIds: [slideId]
            }
          });
        } else {
          // If no existing text, insert new text
          requests.push({
            insertText: {
              objectId: element.objectId,
              text: newText,
              insertionIndex: 0
            }
          });
        }
      };

      // Backward compatibility: Update title (index 0)
      if (content.title && textElements.length > 0) {
        updateTextAtIndex(0, content.title);
      }

      // Backward compatibility: Update content (index 1)  
      if (content.content && textElements.length > 1) {
        updateTextAtIndex(1, content.content);
      }

      // Enhanced feature: Update text by index OR object ID
      if (content.textUpdates && content.textUpdates.length > 0) {
        for (const textUpdate of content.textUpdates) {
          // Validate that either index or objectId is provided
          if (textUpdate.index === undefined && !textUpdate.objectId) {
            throw new Error('Text update must specify either index or objectId');
          }
          
          if (textUpdate.index !== undefined && textUpdate.objectId) {
            throw new Error('Text update cannot specify both index and objectId - choose one method');
          }

          // Update by object ID (more precise)
          if (textUpdate.objectId) {
            updateTextByObjectId(textUpdate.objectId, textUpdate.text);
          } 
          // Update by index (fallback for backward compatibility)
          else if (textUpdate.index !== undefined) {
            updateTextAtIndex(textUpdate.index, textUpdate.text);
          }
        }
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

  // Helper method to extract text from a text element
  private extractTextFromElement(element: any): string {
    if (!element.shape?.text?.textElements) {
      return '';
    }

    return element.shape.text.textElements
      .map((textElement: any) => textElement.textRun?.content || '')
      .join('')
      .trim();
  }

  // Helper method to categorize text element size
  private categorizeTextSize(element: any): 'small' | 'medium' | 'large' {
    const area = (element.size?.width?.magnitude || 0) * (element.size?.height?.magnitude || 0);
    
    if (area > 50000) return 'large';
    if (area > 15000) return 'medium';
    return 'small';
  }

  // Helper method to categorize image element size
  private categorizeImageSize(element: any): 'small' | 'medium' | 'large' {
    const area = (element.size?.width?.magnitude || 0) * (element.size?.height?.magnitude || 0);
    
    if (area > 80000) return 'large';
    if (area > 25000) return 'medium';
    return 'small';
  }

  // Helper method to extract image information from an image element
  private extractImageInfo(element: any): Omit<ImageElement, 'index'> {
    const imageProps = element.image?.imageProperties;
    const size = element.size;
    
    return {
      objectId: element.objectId || '',
      imageUrl: imageProps?.contentUrl || undefined,
      sourceUrl: imageProps?.sourceUrl || undefined,
      size: this.categorizeImageSize(element),
      dimensions: size ? {
        width: Math.round(size.width?.magnitude || 0),
        height: Math.round(size.height?.magnitude || 0)
      } : undefined,
      altText: element.description || undefined
    };
  }

  // Get all slide content from a presentation
  async getPresentationContent(userId: string, presentationId: string): Promise<PresentationContentResponse> {
    const auth = await this.getAuthenticatedClient(userId);
    const slides = google.slides({ version: 'v1', auth });

    try {
      // Get presentation with full slide content including images
      const presentation = await slides.presentations.get({
        presentationId,
        fields: 'presentationId,title,slides.objectId,slides.pageElements.shape.text,slides.pageElements.image,slides.pageElements.image.imageProperties,slides.pageElements.objectId,slides.pageElements.size,slides.pageElements.description'
      });

      if (!presentation.data.slides) {
        throw new Error('No slides found in presentation');
      }

      const slideContentData: SlideContentData[] = [];

      // Process each slide
      presentation.data.slides.forEach((slide, slideIndex) => {
        // Process text elements
        const textElements = slide.pageElements?.filter(element => 
          element.shape?.text?.textElements && element.objectId
        ) || [];

        // Sort text elements by size (larger first)
        textElements.sort((a, b) => {
          const aSize = (a.size?.width?.magnitude || 0) * (a.size?.height?.magnitude || 0);
          const bSize = (b.size?.width?.magnitude || 0) * (b.size?.height?.magnitude || 0);
          return bSize - aSize;
        });

        // Extract text content with metadata
        const textElementsData: TextElement[] = textElements.map((element, index) => ({
          index,
          text: this.extractTextFromElement(element),
          size: this.categorizeTextSize(element),
          objectId: element.objectId || ''
        })).filter(textEl => textEl.text.length > 0); // Only include elements with actual text

        // Process image elements
        const imageElements = slide.pageElements?.filter(element => 
          element.image && element.objectId
        ) || [];

        // Sort image elements by size (larger first)
        imageElements.sort((a, b) => {
          const aSize = (a.size?.width?.magnitude || 0) * (a.size?.height?.magnitude || 0);
          const bSize = (b.size?.width?.magnitude || 0) * (b.size?.height?.magnitude || 0);
          return bSize - aSize;
        });

        // Extract image content with metadata
        const imageElementsData: ImageElement[] = imageElements.map((element, index) => ({
          index,
          ...this.extractImageInfo(element)
        }));

        slideContentData.push({
          slideId: slide.objectId || '',
          index: slideIndex,
          textElements: textElementsData,
          imageElements: imageElementsData
        });
      });

      return {
        presentation: {
          id: presentationId,
          title: presentation.data.title || 'Untitled',
          slideCount: presentation.data.slides.length
        },
        slides: slideContentData
      };
    } catch (error) {
      throw new Error(`Failed to get presentation content: ${error}`);
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

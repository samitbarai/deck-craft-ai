---
description: Best practices for Google API integrations with bidirectional content management and object ID targeting patterns.
globs: backend/src/services/*google*.ts, backend/src/routes/*slides*.ts, backend/src/config/*google*.ts
alwaysApply: true
---

- **Bidirectional Content Management Pattern:**
  - Always implement both READ and WRITE capabilities for content APIs
  - Reading endpoints should return structured metadata for precise targeting
  - Writing endpoints should support both convenience methods and precision methods
  - Example: Content reading endpoint returns object IDs for precise updates

- **Object ID Targeting Interface Design:**
  ```typescript
  // ✅ DO: Support both convenience and precision targeting
  interface UpdateElement {
    index?: number;     // Optional: Position-based (convenient)
    objectId?: string;  // Optional: ID-based (precise)
    content: string;    // Required: New content
  }
  
  // Validation: Require exactly one targeting method
  if (!element.index && !element.objectId) {
    throw new Error('Must specify either index or objectId');
  }
  if (element.index !== undefined && element.objectId) {
    throw new Error('Cannot specify both index and objectId');
  }
  ```

- **Content Classification and Metadata:**
  - Automatically classify content elements by size, type, or importance
  - Sort elements by relevance (e.g., size for slides, hierarchy for documents)
  - Include metadata that helps users understand element relationships
  - Provide both machine-readable and human-readable classifications

- **Google API Authentication Integration:**
  ```typescript
  // ✅ DO: Reuse existing token management
  private async getAuthenticatedClient(userId: string) {
    const tokens = await tokenManager.getTokens(userId, 'google');
    
    if (!tokens) {
      throw new Error('No Google authentication found for user');
    }

    // Auto-refresh expired tokens
    if (tokenManager.isTokenExpired(tokens)) {
      const auth = createAuthenticatedClient(tokens);
      const { credentials } = await auth.refreshAccessToken();
      
      await tokenManager.updateTokens(userId, 'google', {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expires_at: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
      });

      return createAuthenticatedClient(credentials);
    }

    return createAuthenticatedClient(tokens);
  }
  ```

- **Error Handling for External APIs:**
  - Distinguish between different error types (auth, not found, permission, rate limit)
  - Provide helpful error messages with actionable suggestions
  - Include error codes for programmatic handling
  - Log errors appropriately without exposing sensitive data

- **Fastify Route Structure for Google APIs:**
  ```typescript
  // ✅ DO: Consistent authentication and error handling
  fastify.get('/api/route', {
    schema: { /* comprehensive schema */ }
  }, async (request, reply) => {
    try {
      const { userId } = request.query;

      // Always validate authentication first
      const isAuthenticated = await googleService.isUserAuthenticated(userId);
      if (!isAuthenticated) {
        return reply.status(401).send({
          success: false,
          error: 'User not authenticated with Google',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Perform the operation
      const result = await googleService.performOperation(userId, params);

      return reply.status(200).send({
        success: true,
        ...result,
        message: 'Operation completed successfully'
      });

    } catch (error) {
      fastify.log.error('Operation failed:', error);
      
      const errorMessage = (error as Error).message || '';
      
      // Handle specific Google API errors
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return reply.status(404).send({
          success: false,
          error: 'Resource not found or not accessible',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Operation failed',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });
  ```

- **Content Reading Response Structure:**
  ```typescript
  // ✅ DO: Return structured, actionable data
  interface ContentResponse {
    resource: {
      id: string;
      title: string;
      metadata: object;
    };
    elements: Array<{
      id: string;           // For precise targeting
      index: number;        // For convenience targeting
      content: string;      // Actual content
      type: string;         // Classification
      size: 'small' | 'medium' | 'large';
      metadata?: object;    // Additional context
    }>;
    message: string;        // Human-readable summary
  }
  ```

- **Batch Operations Support:**
  - Support updating multiple elements in a single request
  - Validate all elements before performing any updates
  - Use atomic operations where possible
  - Provide detailed feedback on which operations succeeded/failed

- **Postman Documentation Pattern:**
  - Group related endpoints logically (Read, Write, Management)
  - Include workflow-oriented request examples
  - Document both simple and advanced usage patterns
  - Provide troubleshooting tips in test scripts
  - Show error scenarios with helpful debugging information

- **Service Class Organization:**
  ```typescript
  // ✅ DO: Organize methods by capability
  export class GoogleApiService {
    // Authentication & Setup
    private async getAuthenticatedClient(userId: string) { }
    async isUserAuthenticated(userId: string): Promise<boolean> { }
    
    // Content Reading (Input)
    async getResourceContent(userId: string, resourceId: string) { }
    async getResourceInfo(userId: string, resourceId: string) { }
    
    // Content Writing (Output)  
    async updateResourceContent(userId: string, resourceId: string, updates: UpdateRequest) { }
    async createResource(userId: string, options: CreateOptions) { }
    
    // Helper Methods
    private extractContentFromElement(element: any): string { }
    private categorizeElement(element: any): ElementType { }
    private validateUpdate(update: UpdateElement): void { }
  }
  ```

- **TypeScript Interface Best Practices:**
  - Use optional properties for flexible APIs
  - Provide clear property descriptions in comments
  - Export interfaces for reuse across services
  - Use union types for controlled vocabularies
  - Include examples in interface documentation

- **Testing Strategy for Google APIs:**
  - Test authentication flows end-to-end
  - Mock Google API responses for unit tests
  - Test error scenarios (expired tokens, missing resources)
  - Validate request/response schemas
  - Test both authenticated and unauthenticated scenarios
  - Include performance testing for batch operations

These patterns ensure reliable, maintainable, and user-friendly Google API integrations with maximum flexibility and precision.

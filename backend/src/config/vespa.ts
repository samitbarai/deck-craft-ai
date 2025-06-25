// Vespa configuration for vector database operations
export interface VespaConfig {
  endpoint: string;
  certificate?: string;
  privateKey?: string;
  timeout: number;
}

export const vespaConfig: VespaConfig = {
  endpoint: process.env.VESPA_ENDPOINT || 'http://localhost:8080',
  certificate: process.env.VESPA_CERT,
  privateKey: process.env.VESPA_PRIVATE_KEY,
  timeout: parseInt(process.env.VESPA_TIMEOUT || '5000'),
};

// Vespa client class (basic implementation)
export class VespaClient {
  private config: VespaConfig;

  constructor(config: VespaConfig) {
    this.config = config;
  }

  async ping(): Promise<boolean> {
    try {
      // Basic health check for Vespa
      const response = await fetch(`${this.config.endpoint}/ApplicationStatus`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Vespa connection failed:', error);
      return false;
    }
  }

  async search(query: string, hits: number = 10): Promise<any> {
    try {
      const searchUrl = `${this.config.endpoint}/search/`;
      const params = new URLSearchParams({
        yql: `select * from content where userQuery()`,
        query: query,
        hits: hits.toString(),
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Vespa search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Vespa search error:', error);
      throw error;
    }
  }

  async document(docId: string, document: any): Promise<any> {
    try {
      const docUrl = `${this.config.endpoint}/document/v1/deckcraft/content/docid/${docId}`;
      
      const response = await fetch(docUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Vespa document indexing failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Vespa document indexing error:', error);
      throw error;
    }
  }
}

// Create and export default Vespa client instance
export const vespaClient = new VespaClient(vespaConfig);

// Test Vespa connection
export const connectVespa = async (): Promise<void> => {
  try {
    const isConnected = await vespaClient.ping();
    if (isConnected) {
      console.log('✅ Vespa vector database connected successfully');
    } else {
      console.log('⚠️  Vespa connection failed - running without vector search capabilities');
    }
  } catch (error) {
    console.error('❌ Vespa connection error:', error);
    // Don't exit the process - allow the app to start without Vespa
    console.log('⚠️  Running without Vespa vector search capabilities');
  }
}; 
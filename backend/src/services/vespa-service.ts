import axios, { AxiosInstance } from 'axios';
import { EmbeddingResult } from './embedding-service';

export interface VespaDocument {
  id: string;
  content: string;
  embedding: { [key: string]: number }; // Vespa tensor format
  chunk_index: number;
  source_file: string;
  file_type: string;
  created_at: number;
  metadata?: string;
  chunk_size: number;
  slide_number?: number;
}

export interface VespaSearchResult {
  id: string;
  relevance: number;
  fields: {
    id: string;
    content: string;
    chunk_index: number;
    source_file: string;
    file_type: string;
    slide_number?: number;
    chunk_size: number;
    created_at: number;
    metadata?: string;
  };
}

export interface VespaQueryResponse {
  root: {
    id: string;
    relevance: number;
    fields: {
      totalCount: number;
    };
    children?: VespaSearchResult[];
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  rankProfile?: 'vector_similarity' | 'hybrid_search' | 'text_search';
  textWeight?: number;
  vectorWeight?: number;
}

export class VespaService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly documentEndpoint: string;
  private readonly searchEndpoint: string;

  constructor(vespaUrl: string = 'http://localhost:8080') {
    this.baseUrl = vespaUrl;
    this.documentEndpoint = `${this.baseUrl}/document/v1/slide_chunk/slide_chunk/docid`;
    this.searchEndpoint = `${this.baseUrl}/search/`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Transform embedding result to Vespa document format
   */
  private transformToVespaDocument(result: EmbeddingResult): VespaDocument {
    // Use the proper tensor format with "values" array
    const embedding = {
      "values": result.embedding
    };

    return {
      id: result.id,
      content: result.content,
      embedding: embedding as any,
      chunk_index: Number(result.chunkIndex), // Ensure int type
      source_file: result.sourceFile,
      file_type: result.fileType,
      created_at: Number(result.createdAt), // Ensure long type
      chunk_size: Number(result.chunkSize), // Ensure int type
      slide_number: Number(result.slideNumber || 0), // Schema requires int, default to 0
      metadata: result.metadata ? JSON.stringify(result.metadata) : "", // Schema requires string, default to empty
    };
  }

  /**
   * Transform query embedding to Vespa tensor format
   */
  private transformQueryEmbedding(embedding: number[]): any {
    // Use the proper tensor format with "values" array for queries
    return {
      "values": embedding
    };
  }

  /**
   * Index a single document in Vespa
   */
  public async indexDocument(result: EmbeddingResult): Promise<boolean> {
    try {
      const document = this.transformToVespaDocument(result);
      const documentId = encodeURIComponent(result.id);
      
      const response = await this.client.put(
        `${this.documentEndpoint}/${documentId}`,
        {
          fields: document,
        }
      );

      if (response.status === 200) {
        console.log(`✅ Successfully indexed document: ${result.id}`);
        return true;
      } else {
        console.error(`❌ Failed to index document ${result.id}:`, response.statusText);
        if (response.data) {
          console.error(`❌ Response data:`, response.data);
        }
        return false;
      }
    } catch (error) {
      console.error(`❌ Error indexing document ${result.id}:`);
      console.error(`❌ Error message:`, (error as Error).message);
      
      if ((error as any).response?.data) {
        console.error(`❌ Vespa error details:`, JSON.stringify((error as any).response.data, null, 2));
      }
      if ((error as any).response?.status) {
        console.error(`❌ HTTP Status:`, (error as any).response.status);
      }
      if ((error as any).response?.statusText) {
        console.error(`❌ HTTP Status Text:`, (error as any).response.statusText);
      }
      
      return false; // Don't throw, just return false to continue with other docs
    }
  }

  /**
   * Index multiple documents in batch
   */
  public async indexDocuments(results: EmbeddingResult[]): Promise<{ success: number; failed: number }> {
    if (results.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`📄 Indexing ${results.length} documents to Vespa...`);
    
    let success = 0;
    let failed = 0;

    // Process documents in smaller batches to avoid overwhelming Vespa
    const batchSize = 10;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (result) => {
          try {
            const indexed = await this.indexDocument(result);
            if (indexed) {
              success++;
            } else {
              failed++;
            }
          } catch (error) {
            console.error(`Failed to index ${result.id}:`, error);
            failed++;
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < results.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Indexing complete: ${success} successful, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Perform vector similarity search
   */
  public async vectorSearch(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<VespaSearchResult[]> {
    const {
      limit = 10,
      offset = 0,
      filter,
      rankProfile = 'vector_similarity'
    } = options;

    try {
      const tensorQuery = this.transformQueryEmbedding(queryEmbedding);
      
      const queryParams = new URLSearchParams({
        yql: `select * from slide_chunk where true${filter ? ` and ${filter}` : ''}`,
        limit: limit.toString(),
        offset: offset.toString(),
        ranking: rankProfile,
        'input.query(query_embedding)': JSON.stringify(tensorQuery),
      });

      const response = await this.client.get<VespaQueryResponse>(
        `${this.searchEndpoint}?${queryParams.toString()}`
      );

      return response.data.root.children || [];
    } catch (error) {
      console.error('Vector search error:', error);
      throw new Error(`Vector search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Perform text search using BM25
   */
  public async textSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<VespaSearchResult[]> {
    const {
      limit = 10,
      offset = 0,
      filter,
      rankProfile = 'text_search'
    } = options;

    try {
      const queryParams = new URLSearchParams({
        yql: `select * from slide_chunk where userQuery()${filter ? ` and ${filter}` : ''}`,
        query: query,
        limit: limit.toString(),
        offset: offset.toString(),
        ranking: rankProfile,
      });

      const response = await this.client.get<VespaQueryResponse>(
        `${this.searchEndpoint}?${queryParams.toString()}`
      );

      return response.data.root.children || [];
    } catch (error) {
      console.error('Text search error:', error);
      throw new Error(`Text search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Perform hybrid search (combination of text and vector)
   */
  public async hybridSearch(
    query: string,
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<VespaSearchResult[]> {
    const {
      limit = 10,
      offset = 0,
      filter,
      textWeight = 0.3,
      vectorWeight = 0.7,
      rankProfile = 'hybrid_search'
    } = options;

    try {
      const tensorQuery = this.transformQueryEmbedding(queryEmbedding);
      
      const queryParams = new URLSearchParams({
        yql: `select * from slide_chunk where userQuery()${filter ? ` and ${filter}` : ''}`,
        query: query,
        limit: limit.toString(),
        offset: offset.toString(),
        ranking: rankProfile,
        'input.query(query_embedding)': JSON.stringify(tensorQuery),
        'input.query(text_weight)': textWeight.toString(),
        'input.query(vector_weight)': vectorWeight.toString(),
      });

      const response = await this.client.get<VespaQueryResponse>(
        `${this.searchEndpoint}?${queryParams.toString()}`
      );

      return response.data.root.children || [];
    } catch (error) {
      console.error('Hybrid search error:', error);
      throw new Error(`Hybrid search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a document by ID
   */
  public async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const encodedId = encodeURIComponent(documentId);
      const response = await this.client.delete(`${this.documentEndpoint}/${encodedId}`);
      
      if (response.status === 200) {
        console.log(`✅ Successfully deleted document: ${documentId}`);
        return true;
      } else {
        console.error(`❌ Failed to delete document ${documentId}:`, response.statusText);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error deleting document ${documentId}:`, error);
      throw new Error(`Failed to delete document: ${(error as Error).message}`);
    }
  }

  /**
   * Get document by ID
   */
  public async getDocument(documentId: string): Promise<VespaDocument | null> {
    try {
      const encodedId = encodeURIComponent(documentId);
      const response = await this.client.get(`${this.documentEndpoint}/${encodedId}`);
      
      if (response.status === 200) {
        return response.data.fields as VespaDocument;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting document ${documentId}:`, error);
      return null;
    }
  }

  /**
   * Health check for Vespa cluster
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/ApplicationStatus');
      return response.status === 200;
    } catch (error) {
      console.error('Vespa health check failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  public getStats() {
    return {
      baseUrl: this.baseUrl,
      documentEndpoint: this.documentEndpoint,
      searchEndpoint: this.searchEndpoint,
      timeout: this.client.defaults.timeout,
    };
  }
}

// Export a singleton instance
export const vespaService = new VespaService();

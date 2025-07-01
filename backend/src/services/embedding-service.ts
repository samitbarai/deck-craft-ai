import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TextChunk {
  id: string;
  content: string;
  chunkIndex: number;
  sourceFile: string;
  fileType: string;
  slideNumber?: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  id: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  sourceFile: string;
  fileType: string;
  slideNumber?: number;
  metadata?: Record<string, any>;
  chunkSize: number;
  createdAt: number;
}

export interface ChunkingOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  minChunkSize?: number;
}

export class EmbeddingService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly MODEL = 'text-embedding-004'; // Default model
  private readonly EMBEDDING_DIMENSION = 768; // text-embedding-004 dimension
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_OVERLAP = 200;
  private readonly MIN_CHUNK_SIZE = 100;
  private readonly MAX_BATCH_SIZE = 100; // Process in batches for efficiency

  constructor() {
    // Lazy load Google AI client when needed
  }

  private getGoogleAIClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('GOOGLE_AI_API_KEY environment variable is required for embedding generation');
      }
      
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Split text into chunks with optional overlap
   */
  public chunkText(
    text: string,
    sourceFile: string,
    fileType: string,
    slideNumber?: number,
    options: ChunkingOptions = {}
  ): TextChunk[] {
    const {
      maxChunkSize = this.DEFAULT_CHUNK_SIZE,
      overlapSize = this.DEFAULT_OVERLAP,
      minChunkSize = this.MIN_CHUNK_SIZE,
    } = options;

    // Clean and normalize text
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    if (cleanedText.length <= maxChunkSize) {
      return [{
        id: `${sourceFile}-${slideNumber || 0}-0`,
        content: cleanedText,
        chunkIndex: 0,
        sourceFile,
        fileType,
        slideNumber,
      }];
    }

    const chunks: TextChunk[] = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < cleanedText.length) {
      let endPosition = Math.min(currentPosition + maxChunkSize, cleanedText.length);

      // Try to break at word boundaries
      if (endPosition < cleanedText.length) {
        const lastSpaceIndex = cleanedText.lastIndexOf(' ', endPosition);
        if (lastSpaceIndex > currentPosition + minChunkSize) {
          endPosition = lastSpaceIndex;
        }
      }

      const chunk = cleanedText.substring(currentPosition, endPosition).trim();

      if (chunk.length >= minChunkSize) {
        chunks.push({
          id: `${sourceFile}-${slideNumber || 0}-${chunkIndex}`,
          content: chunk,
          chunkIndex,
          sourceFile,
          fileType,
          slideNumber,
        });
        chunkIndex++;
      }

      // Move position forward with overlap
      currentPosition = Math.max(endPosition - overlapSize, currentPosition + minChunkSize);
    }

    return chunks;
  }

  /**
   * Generate embedding for a single text chunk
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const genAI = this.getGoogleAIClient();
      const model = genAI.getGenerativeModel({ model: this.MODEL });

      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('No embedding data returned from Google AI');
      }

      const embedding = result.embedding.values;

      if (embedding.length !== this.EMBEDDING_DIMENSION) {
        throw new Error(
          `Expected embedding dimension ${this.EMBEDDING_DIMENSION}, got ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${(error as Error).message}`);
    }
  }

  /**
   * Generate embeddings for multiple text chunks with batching
   */
  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const results: number[][] = [];

    // Process individually since Google AI doesn't support batch embedding in the same way
    // We can still process in batches to manage rate limits
    for (let i = 0; i < texts.length; i += this.MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + this.MAX_BATCH_SIZE);
      
      try {
        const batchResults = await Promise.all(
          batch.map(text => this.generateEmbedding(text))
        );

        results.push(...batchResults);

        // Add small delay between batches to respect rate limits
        if (i + this.MAX_BATCH_SIZE < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing batch ${i / this.MAX_BATCH_SIZE + 1}:`, error);
        throw new Error(`Failed to process embedding batch: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Process text chunks and generate embeddings
   */
  public async processChunks(chunks: TextChunk[]): Promise<EmbeddingResult[]> {
    if (chunks.length === 0) {
      return [];
    }

    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await this.generateEmbeddings(texts);

    const results: EmbeddingResult[] = chunks.map((chunk, index) => ({
      id: chunk.id,
      content: chunk.content,
      embedding: embeddings[index],
      chunkIndex: chunk.chunkIndex,
      sourceFile: chunk.sourceFile,
      fileType: chunk.fileType,
      slideNumber: chunk.slideNumber,
      metadata: chunk.metadata,
      chunkSize: chunk.content.length,
      createdAt: Date.now(),
    }));

    return results;
  }

  /**
   * Complete pipeline: chunk text and generate embeddings
   */
  public async processSlideContent(
    content: string,
    sourceFile: string,
    fileType: string,
    slideNumber?: number,
    options: ChunkingOptions = {}
  ): Promise<EmbeddingResult[]> {
    try {
      // Step 1: Chunk the text
      const chunks = this.chunkText(content, sourceFile, fileType, slideNumber, options);
      
      if (chunks.length === 0) {
        console.warn(`No chunks generated for ${sourceFile} slide ${slideNumber}`);
        return [];
      }

      console.log(`Generated ${chunks.length} chunks for ${sourceFile} slide ${slideNumber}`);

      // Step 2: Generate embeddings
      const results = await this.processChunks(chunks);

      console.log(`Generated embeddings for ${results.length} chunks from ${sourceFile}`);
      
      return results;
    } catch (error) {
      console.error(`Error processing slide content from ${sourceFile}:`, error);
      throw new Error(`Failed to process slide content: ${(error as Error).message}`);
    }
  }

  /**
   * Generate query embedding for search
   */
  public async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    return this.generateEmbedding(query.trim());
  }

  /**
   * Normalize embedding vector (L2 normalization)
   */
  public normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      throw new Error('Cannot normalize zero vector');
    }
    return embedding.map(val => val / magnitude);
  }

  /**
   * Get embedding service statistics
   */
  public getStats() {
    return {
      model: this.MODEL,
      embeddingDimension: this.EMBEDDING_DIMENSION,
      defaultChunkSize: this.DEFAULT_CHUNK_SIZE,
      defaultOverlap: this.DEFAULT_OVERLAP,
      minChunkSize: this.MIN_CHUNK_SIZE,
      maxBatchSize: this.MAX_BATCH_SIZE,
    };
  }
}

// Export a singleton instance
export const embeddingService = new EmbeddingService();

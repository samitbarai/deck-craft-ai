import { vespaClient } from '../config/vespa';
import { embeddingService } from './embedding.service';
import { v4 as uuidv4 } from 'uuid';

export interface VespaDocument {
  put: string;
  fields: {
    id: string;
    content: string;
    embedding: {
      values: number[];
    };
    metadata: any;
  };
}

class VespaService {

  async indexBatchTextChunks(chunks: { content: string; metadata: any }[]): Promise<any> {
    try {
      const contents = chunks.map((chunk) => chunk.content);
      const embeddings = await embeddingService.generateBatchEmbeddings(contents);

      const indexedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const docId = uuidv4();

        const document = {
          put: `id:deckcraft:slide_chunk::${docId}`,
          fields: {
            id: docId,
            content: chunk.content,
            embedding: {
              values: embedding,
            },
            metadata: JSON.stringify(chunk.metadata),
          },
        };

        await vespaClient.document(docId, document);
        indexedChunks.push({ ...chunk, docId });
        
        // Add a small delay to avoid overwhelming Vespa
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return indexedChunks;
    } catch (error) {
      console.error('Error indexing batch documents in Vespa:', error);
      throw new Error('Failed to index batch documents in Vespa.');
    }
  }
}

export const vespaService = new VespaService();

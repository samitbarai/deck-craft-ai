import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

class EmbeddingService {
  private model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      const embedding = result.embedding;
      return embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding.');
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const requests = texts.map((text) => ({
        content: { parts: [{ text }], role: 'user' },
      }));
      const result = await this.model.batchEmbedContents({ requests });
      const embeddings = result.embeddings.map((emb) => emb.values);
      return embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw new Error('Failed to generate batch embeddings.');
    }
  }
}

export const embeddingService = new EmbeddingService();

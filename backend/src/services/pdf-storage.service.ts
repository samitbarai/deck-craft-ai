import { PrismaClient } from '../generated/prisma';
import { vespaService } from './vespa.service';

// Lazy initialization of Prisma Client
let prisma: PrismaClient;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Increase the transaction timeout to 30 seconds
      transactionOptions: {
        maxWait: 30000,
        timeout: 30000,
      },
    });
  }
  return prisma;
}

export interface PitchDeckData {
  merchant_id?: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_path?: string;
  mime_type: string;
  page_count: number;
}

export interface ContentChunkData {
  pitch_deck_id: string;
  page_number: number;
  chunk_type: 'text' | 'image';
  content?: string;
  image_url?: string;
  metadata?: any;
  vector_id?: string;
}

export class PDFStorageService {
  private getPrisma() {
    return getPrismaClient();
  }

  async storePitchDeck(data: PitchDeckData) {
    return this.getPrisma().pitch_decks.create({
      data: {
        ...data,
        upload_status: 'completed',
        processing_status: 'pending',
      },
    });
  }

  async storeContentChunk(data: ContentChunkData) {
    return this.getPrisma().content_chunks.create({
      data,
    });
  }

  async storePitchDeckWithContent(pitchDeckData: PitchDeckData, pages: string[]) {
    const prisma = this.getPrisma();

    return prisma.$transaction(async (tx) => {
      // 1. Create the main pitch deck record
      const pitchDeck = await tx.pitch_decks.create({
        data: {
          ...pitchDeckData,
          upload_status: 'completed',
          processing_status: 'pending',
        },
      });

      // 2. Prepare chunks for Vespa indexing
      const chunksToIndex = pages.map((page, i) => ({
        content: page.replace(/\u0000/g, ''), // Sanitize content
        metadata: {
          pitch_deck_id: pitchDeck.id,
          page_number: i + 1,
        },
      }));

      // 3. Index chunks in Vespa to get back document IDs
      const indexedChunks = await vespaService.indexBatchTextChunks(chunksToIndex);

      // 4. Create all content chunk records in the database
      await tx.content_chunks.createMany({
        data: indexedChunks.map((chunk: any, i: number) => ({
          pitch_deck_id: pitchDeck.id,
          page_number: i + 1,
          chunk_type: 'text' as const,
          content: chunk.content,
          vector_id: chunk.docId, // Store the Vespa document ID
        })),
      });

      // 5. Update the pitch deck status to 'processed'
      await tx.pitch_decks.update({
        where: { id: pitchDeck.id },
        data: { processing_status: 'completed', processed_at: new Date() },
      });

      return pitchDeck;
    });
  }
}

export const pdfStorageService = new PDFStorageService();
export default pdfStorageService;

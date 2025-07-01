import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

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
}

export class PDFStorageService {
  async storePitchDeck(data: PitchDeckData) {
    return prisma.pitch_decks.create({
      data: {
        ...data,
        upload_status: 'completed',
        processing_status: 'pending',
      },
    });
  }

  async storeContentChunk(data: ContentChunkData) {
    return prisma.content_chunks.create({
      data,
    });
  }

  async storePitchDeckWithContent(pitchDeckData: PitchDeckData, content: string) {
    const pitchDeck = await this.storePitchDeck(pitchDeckData);

    // Sanitize the content to remove null characters
    const sanitizedContent = content.replace(/\u0000/g, '');

    const contentChunkData: ContentChunkData = {
      pitch_deck_id: pitchDeck.id,
      page_number: 1, // Assuming content is for the whole document for now
      chunk_type: 'text',
      content: sanitizedContent,
    };

    await this.storeContentChunk(contentChunkData);

    return pitchDeck;
  }
}

export const pdfStorageService = new PDFStorageService();
export default pdfStorageService;

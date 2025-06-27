import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import PDF from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Types for request bodies
interface UploadBody {
  pdf: File;
  industry?: string;
  geography?: string;
}

interface UploadQuery {
  industry?: string;
  geography?: string;
}

interface BatchUploadBody {
  files: File[];
  metadata?: Record<string, any>;
}

interface PDFResult {
  id: string;
  filename: string;
  text: string;
  images: string[];
  ocrText: string;
  metadata: {
    industry?: string;
    geography?: string;
    pageCount: number;
    fileSize: number;
    extractedAt: string;
    processingTime: number;
  };
}

// PDF processing service
class PDFProcessor {
  private static ocrWorker: any = null;

  static async initializeOCR() {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('eng', 1, {
        logger: (m: any) => console.log(`OCR: ${m.status} - ${Math.round(m.progress * 100)}%`)
      });
    }
    return this.ocrWorker;
  }

  static async processPDF(buffer: Buffer, filename: string, metadata: any): Promise<PDFResult> {
    const id = randomUUID();
    const startTime = Date.now();
    const extractedAt = new Date().toISOString();

    try {
      // Parse PDF using pdf-parse
      const data = await PDF(buffer, {
        max: 0, // No page limit
        version: 'v1.10.100'
      });

      let extractedText = data.text || '';
      const pageCount = data.numpages || 0;
      let ocrText = '';
      const extractedImages: string[] = [];

      // If very little text was extracted, the PDF might be image-based
      // In this case, we'll use OCR on the whole document
      if (extractedText.trim().length < 100) {
        try {
          // For image-based PDFs, we'll convert to images and use OCR
          // This is a simplified approach - in production, you'd use pdf2pic or similar
          console.log(`PDF appears to be image-based (${extractedText.trim().length} chars), attempting OCR...`);
          
          const worker = await this.initializeOCR();
          
          // For now, we'll just note that OCR is needed but the PDF text is minimal
          ocrText = `[OCR Required] This PDF appears to be image-based with minimal extractable text. Full OCR processing would require additional image conversion tools.`;
          
        } catch (ocrError) {
          console.error('Error performing OCR:', ocrError);
          ocrText = '[OCR Error] Could not perform OCR processing on this PDF.';
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        id,
        filename,
        text: extractedText.trim(),
        images: extractedImages,
        ocrText: ocrText.trim(),
        metadata: {
          industry: metadata.industry,
          geography: metadata.geography,
          pageCount,
          fileSize: buffer.length,
          extractedAt,
          processingTime
        }
      };

    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async processImageWithOCR(imageBuffer: Buffer): Promise<string> {
    try {
      // Optimize image for OCR using Sharp
      const optimizedImage = await sharp(imageBuffer)
        .resize({ width: 1200, height: 1600, fit: 'inside', withoutEnlargement: true })
        .sharpen()
        .normalize()
        .greyscale()
        .png({ quality: 90 })
        .toBuffer();

      // Perform OCR on the image
      const worker = await this.initializeOCR();
      const { data: { text } } = await worker.recognize(optimizedImage);
      
      return text.trim();
    } catch (error) {
      console.error('Error processing image with OCR:', error);
      return '[OCR Error] Could not extract text from image.';
    }
  }
}

// Plugin function for Fastify
export default async function pdfRoutes(fastify: FastifyInstance) {
  // Single PDF upload endpoint
  fastify.post('/upload', async (request: FastifyRequest<{ Querystring: UploadQuery }>, reply: FastifyReply) => {
    try {
      console.log('📥 Processing upload request...');
      console.log('📋 Request content-type:', request.headers['content-type']);
      console.log('📋 Request method:', request.method);
      
      const data = await request.file();
      
      if (!data) {
        console.log('❌ No file data received');
        return reply.status(400).send({
          error: true,
          message: 'No PDF file provided. Please upload a file with field name "pdf"',
          debug: {
            contentType: request.headers['content-type'],
            method: request.method,
            hasFile: false
          }
        });
      }

      console.log(`📋 File data received: fieldname=${data.fieldname}, filename=${data.filename}, mimetype=${data.mimetype}`);
      
      if (data.fieldname !== 'pdf') {
        return reply.status(400).send({
          error: true,
          message: `Expected field name "pdf", but received "${data.fieldname}"`,
          debug: {
            receivedFieldname: data.fieldname,
            expectedFieldname: 'pdf'
          }
        });
      }

      if (!data.mimetype?.includes('pdf')) {
        return reply.status(400).send({
          error: true,
          message: 'Only PDF files are allowed',
          received: data.mimetype
        });
      }

      console.log(`✅ PDF file validated: ${data.filename}`);

      const startTime = Date.now();

      // Convert file stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Validate file size (100MB limit)
      if (buffer.length > 100 * 1024 * 1024) {
        return reply.status(413).send({
          error: true,
          message: 'File too large. Maximum size is 100MB',
          size: `${Math.round(buffer.length / 1024 / 1024)}MB`
        });
      }

      // Get metadata from query parameters
      const metadata = {
        industry: request.query?.industry || '',
        geography: request.query?.geography || '',
      };

      // Process the PDF
      const result = await PDFProcessor.processPDF(buffer, data.filename, metadata);

      return reply.status(200).send({
        success: true,
        message: 'PDF processed successfully',
        data: result,
        processing: {
          time: `${result.metadata.processingTime}ms`,
          textLength: result.text.length,
          hasOCR: !!result.ocrText
        }
      });

    } catch (error) {
      request.log.error(error, 'Error in PDF upload');
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'Failed to process PDF'
      });
    }
  });

  // Batch PDF upload endpoint
  fastify.post('/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parts = request.parts();
      const files: any[] = [];
      let metadata: any = {};

      // Collect all parts
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'pdfs') {
          if (!part.mimetype?.includes('pdf')) {
            return reply.status(400).send({
              error: true,
              message: `File ${part.filename} is not a PDF`,
              received: part.mimetype
            });
          }
          files.push(part);
        } else if (part.type === 'field') {
          const value = (part as any).value;
          metadata[part.fieldname] = value;
        }
      }

      if (files.length === 0) {
        return reply.status(400).send({
          error: true,
          message: 'No PDF files provided. Please upload files with field name "pdfs"'
        });
      }

      if (files.length > 10) {
        return reply.status(400).send({
          error: true,
          message: 'Too many files. Maximum 10 files per batch',
          received: files.length
        });
      }

      // Process all PDFs in parallel
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const chunks: Buffer[] = [];
          for await (const chunk of file.file) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          
          return PDFProcessor.processPDF(buffer, file.filename, metadata);
        })
      );

      const successful = results
        .filter((result): result is PromiseFulfilledResult<PDFResult> => result.status === 'fulfilled')
        .map(result => result.value);

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      const totalProcessingTime = successful.reduce((sum, result) => sum + result.metadata.processingTime, 0);

      return reply.status(200).send({
        success: true,
        message: `Processed ${successful.length} of ${files.length} files`,
        data: {
          successful,
          failed: failed.map(err => ({ error: err.message || err })),
          summary: {
            total: files.length,
            successful: successful.length,
            failed: failed.length,
            totalProcessingTime: `${totalProcessingTime}ms`,
            averageProcessingTime: `${Math.round(totalProcessingTime / successful.length)}ms`
          }
        }
      });

    } catch (error) {
      request.log.error(error, 'Error in batch PDF upload');
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'Failed to process batch'
      });
    }
  });

  // Image OCR endpoint for separate image processing
  fastify.post('/ocr', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parts = request.parts();
      let imageFile: any = null;

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'image') {
          if (!part.mimetype?.startsWith('image/')) {
            return reply.status(400).send({
              error: true,
              message: 'Only image files are allowed',
              received: part.mimetype
            });
          }
          imageFile = part;
          break;
        }
      }

      if (!imageFile) {
        return reply.status(400).send({
          error: true,
          message: 'No image file provided. Please upload a file with field name "image"'
        });
      }

      // Convert file stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of imageFile.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const startTime = Date.now();
      const text = await PDFProcessor.processImageWithOCR(buffer);
      const processingTime = Date.now() - startTime;

      return reply.status(200).send({
        success: true,
        message: 'Image OCR completed',
        data: {
          filename: imageFile.filename,
          text,
          processingTime: `${processingTime}ms`,
          textLength: text.length
        }
      });

    } catch (error) {
      request.log.error(error, 'Error in image OCR');
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'Failed to process image'
      });
    }
  });

  // Health check for PDF service
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Test OCR worker
      const worker = await PDFProcessor.initializeOCR();
      const isOcrReady = !!worker;

      return reply.status(200).send({
        status: 'healthy',
        services: {
          'pdf-parse': 'ready',
          ocr: isOcrReady ? 'ready' : 'initializing',
          sharp: 'ready'
        },
        capabilities: [
          'PDF text extraction',
          'OCR text recognition',
          'Image optimization',
          'Batch processing',
          'Metadata tagging'
        ],
        limits: {
          maxFileSize: '100MB',
          maxBatchSize: 10,
          supportedFormats: ['PDF', 'Images for OCR']
        },
        tech_stack: {
          pdf_engine: 'pdf-parse v1.1.1',
          ocr_engine: 'tesseract.js v5.1.1',
          image_processing: 'sharp v0.33.5',
          web_framework: 'fastify v5.1.0'
        }
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Service unavailable'
      });
    }
  });
} 
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import PDF from 'pdf-parse';
import { pdfStorageService } from '../services/pdf-storage.service';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
// Use pdf2pic for PDF to image conversion
import pdf2pic from 'pdf2pic';

// Types for pdf2pic
interface ConvertOptions {
  density?: number;
  saveFilename?: string;
  savePath?: string;
  format?: string;
  width?: number;
  height?: number;
  quality?: number;
}

interface ConvertResult {
  name: string;
  size: number;
  path: string;
  page: number;
}

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
  pages: string[];
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
      const pages = this.splitTextIntoPages(extractedText, pageCount);

      return {
        id,
        filename,
        text: extractedText.trim(),
        pages,
        images: extractedImages,
        ocrText: ocrText.trim(),
        metadata: {
          industry: metadata.industry,
          geography: metadata.geography,
          pageCount,
          fileSize: buffer.length,
          extractedAt,
          processingTime,
        },
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

  static async processPDFWithOCR(pdfBuffer: Buffer): Promise<{ text: string; pages: Array<{ page: number; text: string }> }> {
    try {
      console.log('🎯 Starting enhanced pdf2pic + Tesseract PDF processing (optimized for presentation slides)...');
      
      // Get total pages first
      const pageCount = await this.getPDFPageCount(pdfBuffer);
      console.log(`📄 PDF has ${pageCount} pages`);

      // Step 1: Extract regular text first (fast baseline)
      let regularText = '';
      try {
        const pdfData = await PDF(pdfBuffer);
        regularText = pdfData.text || '';
        console.log(`📝 Extracted ${regularText.length} characters of regular text from PDF`);
      } catch (textError) {
        console.log('📝 No regular text extracted, proceeding with OCR only');
      }

      // Step 2: Initialize Tesseract worker with optimal settings for slides
      const worker = await this.initializeOCR();
      
      // Configure for presentation slides (sparse text, mixed layouts)
      await worker.setParameters({
        tessedit_pageseg_mode: '11', // PSM 11: Sparse text - perfect for slides
        tessedit_char_whitelist: '', // Allow all characters
        preserve_interword_spaces: '1', // Maintain spacing
        tessedit_do_invert: '0', // Don't auto-invert (faster)
      });

      console.log('🎯 Tesseract configured for presentation slide processing (PSM 11: Sparse text)');

      const pageResults: Array<{ page: number; text: string }> = [];
      let combinedText = '';
      let successfulOcrPages = 0;

      // Include regular text if substantial
      if (regularText.trim().length > 100) {
        combinedText += `--- Document Text ---\n${regularText.trim()}\n\n`;
      }

      // Step 3: Convert PDF to images using pdf2pic, then OCR each page
      try {
        console.log('🔍 Converting PDF pages to images using pdf2pic...');
        
        // Create temporary directory for images
        const tempDir = '/tmp';
        const imageDir = path.join(tempDir, `pdf_images_${Date.now()}`);
        await fs.mkdir(imageDir, { recursive: true });
        
        try {
          // Setup pdf2pic converter
          const convert = pdf2pic.fromBuffer(pdfBuffer, {
            density: 200, // Good balance of quality and performance
            saveFilename: 'page',
            savePath: imageDir,
            format: 'png',
            width: 1600,
            height: 2200
          });

          console.log(`📁 Converting ${Math.min(pageCount, 20)} pages...`);

          // Process each page (limit to 20 pages for performance)
          for (let pageNum = 1; pageNum <= Math.min(pageCount, 20); pageNum++) {
            try {
              console.log(`🔍 Converting and processing page ${pageNum}/${Math.min(pageCount, 20)} with OCR...`);
              
              // Convert specific page to image
              const result = await convert(pageNum);
              
              if (result && result.path) {
                // Read the converted image
                const imageBuffer = await fs.readFile(result.path);
                
                // Optimize image for OCR using Sharp
                const optimizedImage = await sharp(imageBuffer)
                  .resize({ width: 1400, height: 1800, fit: 'inside', withoutEnlargement: true })
                  .sharpen()
                  .normalize()
                  .greyscale()
                  .png({ quality: 95 })
                  .toBuffer();

                // Perform OCR on the optimized image
                const { data: { text } } = await worker.recognize(optimizedImage);
                const pageText = text.trim();
                
                if (pageText.length > 0) {
                  successfulOcrPages++;
                  console.log(`✅ OCR extracted ${pageText.length} characters from page ${pageNum}`);
                }
                
                pageResults.push({
                  page: pageNum,
                  text: pageText || '[No text detected on this page]'
                });

                if (pageText.length > 0) {
                  combinedText += `--- Page ${pageNum} (OCR) ---\n${pageText}\n\n`;
                }

                // Clean up this page's image immediately
                try {
                  await fs.unlink(result.path);
                } catch (cleanupError) {
                  console.warn(`⚠️ Could not clean up image file: ${result.path}`, cleanupError);
                }
                
              } else {
                console.warn(`⚠️ Page ${pageNum} conversion returned no result`);
                pageResults.push({
                  page: pageNum,
                  text: '[Page conversion failed - no image generated]'
                });
              }
              
            } catch (pageOcrError) {
              console.error(`❌ OCR failed for page ${pageNum}:`, pageOcrError);
              pageResults.push({
                page: pageNum,
                text: `[OCR processing failed: ${pageOcrError instanceof Error ? pageOcrError.message : 'Unknown error'}]`
              });
            }
          }

          // Clean up temporary directory
          try {
            await fs.rmdir(imageDir);
          } catch (dirCleanupError) {
            console.warn(`⚠️ Could not clean up image directory: ${imageDir}`, dirCleanupError);
          }

        } catch (conversionError) {
          console.error('❌ PDF-to-image conversion failed:', conversionError);
          
          // Create placeholder results if conversion fails completely
          for (let pageNum = 1; pageNum <= Math.min(pageCount, 20); pageNum++) {
            pageResults.push({
              page: pageNum,
              text: `[PDF conversion failed: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}]`
            });
          }
        }

      } catch (processingError) {
        console.error('❌ Enhanced PDF processing failed:', processingError);
        
        // Create placeholder results
        for (let pageNum = 1; pageNum <= Math.min(pageCount, 20); pageNum++) {
          pageResults.push({
            page: pageNum,
            text: `[PDF processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}]`
          });
        }
      }

      console.log(`📊 OCR Summary: ${successfulOcrPages}/${pageCount} pages processed successfully`);

      // Smart combination of results
      if (successfulOcrPages === 0 && regularText.trim().length > 0) {
        console.log('💡 Using extracted text as primary result (OCR yielded no additional content)');
        return {
          text: regularText.trim(),
          pages: pageResults.length > 0 ? pageResults : [{ page: 1, text: '[Regular PDF text extraction used]' }]
        };
      }

      // Combine regular text and OCR results intelligently
      let finalText = combinedText.trim();
      if (finalText.length === 0) {
        finalText = regularText.trim() || '[No text could be extracted from this PDF]';
      }

      return {
        text: finalText,
        pages: pageResults
      };

    } catch (error) {
      console.error('❌ Fatal error in enhanced PDF OCR processing:', error);
      
      // Ultimate fallback: regular PDF text extraction
      try {
        console.log('🔄 Attempting final fallback to regular PDF text extraction...');
        const pdfData = await PDF(pdfBuffer);
        const fallbackText = pdfData.text || '';
        
        if (fallbackText.trim().length > 0) {
          console.log(`✅ Fallback successful: extracted ${fallbackText.length} characters`);
          return {
            text: fallbackText.trim(),
            pages: [{ page: 1, text: '[Fallback: Regular PDF text extraction used]' }]
          };
        }
      } catch (fallbackError) {
        console.error('❌ All processing methods failed:', fallbackError);
      }
      
      throw new Error(`Failed to process PDF with enhanced OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static splitTextIntoPages(text: string, pageCount: number): string[] {
    // Split text into logical pages based on common patterns
    const pages: string[] = [];
    
    // Try to split by form feed characters first
    let textParts = text.split('\f');
    
    // If no form feeds, split by large gaps or repeated patterns
    if (textParts.length === 1) {
      // Split by multiple newlines (likely page breaks)
      textParts = text.split(/\n\s*\n\s*\n+/);
    }
    
    // If still one part, split roughly by character count
    if (textParts.length === 1 && pageCount > 1) {
      const charsPerPage = Math.ceil(text.length / pageCount);
      textParts = [];
      for (let i = 0; i < pageCount; i++) {
        const start = i * charsPerPage;
        const end = Math.min(start + charsPerPage, text.length);
        textParts.push(text.substring(start, end));
      }
    }
    
    // Ensure we have at least pageCount pages
    while (textParts.length < pageCount) {
      textParts.push('');
    }
    
    // Trim to pageCount if we have too many
    return textParts.slice(0, pageCount);
  }

  static async getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
    try {
      const data = await PDF(pdfBuffer);
      return data.numpages || 1;
    } catch (error) {
      console.error('Error getting PDF page count:', error);
      return 1; // Default to 1 page if we can't determine
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

      // Store the pitch deck and its content
      const pitchDeck = await pdfStorageService.storePitchDeckWithContent(
        {
          // merchant_id: 'some-merchant-id', // TODO: Get from authenticated user
          original_filename: data.filename,
          filename: result.id, // Using the generated UUID as the filename for now
          file_size: result.metadata.fileSize,
          mime_type: data.mimetype,
          page_count: result.metadata.pageCount,
        },
        result.pages
      );

      return reply.status(200).send({
        success: true,
        message: 'PDF processed and stored successfully',
        data: {
          ...result,
          pitch_deck_id: pitchDeck.id,
        },
        processing: {
          time: `${result.metadata.processingTime}ms`,
          textLength: result.text.length,
          hasOCR: !!result.ocrText,
        },
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

  // Enhanced OCR endpoint for image and PDF processing
  fastify.post('/ocr', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parts = request.parts();
      let uploadedFile: any = null;

      for await (const part of parts) {
        if (part.type === 'file' && (part.fieldname === 'image' || part.fieldname === 'file')) {
          // Accept both images and PDFs
          if (!part.mimetype?.startsWith('image/') && !part.mimetype?.includes('pdf')) {
            return reply.status(400).send({
              error: true,
              message: 'Only image files (jpg, png, gif, etc.) and PDF files are allowed',
              received: part.mimetype,
              supportedTypes: ['image/*', 'application/pdf']
            });
          }
          uploadedFile = part;
          break;
        }
      }

      if (!uploadedFile) {
        return reply.status(400).send({
          error: true,
          message: 'No file provided. Please upload a file with field name "image" or "file"',
          expectedFields: ['image', 'file'],
          supportedTypes: ['image/*', 'application/pdf']
        });
      }

      console.log(`🔍 OCR processing: ${uploadedFile.filename} (${uploadedFile.mimetype})`);

      // Convert file stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of uploadedFile.file) {
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

      const startTime = Date.now();
      const isPDF = uploadedFile.mimetype?.includes('pdf');

      if (isPDF) {
        // Process PDF with comprehensive OCR
        const result = await PDFProcessor.processPDFWithOCR(buffer);
        const processingTime = Date.now() - startTime;

        return reply.status(200).send({
          success: true,
          message: 'PDF OCR completed',
          data: {
            filename: uploadedFile.filename,
            type: 'pdf',
            totalPages: result.pages.length,
            text: result.text,
            pages: result.pages,
            processingTime: `${processingTime}ms`,
            textLength: result.text.length,
            averageTimePerPage: result.pages.length > 0 ? `${Math.round(processingTime / result.pages.length)}ms` : '0ms'
          }
        });
      } else {
        // Process single image
        const text = await PDFProcessor.processImageWithOCR(buffer);
        const processingTime = Date.now() - startTime;

        return reply.status(200).send({
          success: true,
          message: 'Image OCR completed',
          data: {
            filename: uploadedFile.filename,
            type: 'image',
            text,
            processingTime: `${processingTime}ms`,
            textLength: text.length
          }
        });
      }

    } catch (error) {
      request.log.error(error, 'Error in OCR processing');
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'Failed to process file with OCR',
        details: 'Check server logs for more information'
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

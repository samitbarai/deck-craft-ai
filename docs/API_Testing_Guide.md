# DeckCraft AI - API Testing Guide

## Quick Start

### 1. Import the Postman Collection

1. Open Postman
2. Click **Import** button
3. Select **Upload Files**
4. Choose `docs/DeckCraft_AI_API_Collection.postman_collection.json`
5. Click **Import**

### 2. Import the Environment (Optional)

1. In Postman, click **Import** again
2. Select `docs/DeckCraft_AI_Development.postman_environment.json`
3. Click **Import**
4. Select **DeckCraft AI - Development** environment from the dropdown

### 3. Start Your Backend Server

```bash
cd backend
npm run dev
```

The server should be running on `http://localhost:8000`

## Collection Structure

### 📁 Health Checks
- **Basic Health Check** - `GET /health`
- **Detailed Health Check** - `GET /health/detailed`

### 📁 API Documentation
- **Get API Information** - `GET /api/v1/`

### 📁 PDF Processing
- **Single PDF Upload** - `POST /api/v1/pdf/upload`
- **Batch PDF Upload** - `POST /api/v1/pdf/batch`
- **Image OCR Processing** - `POST /api/v1/pdf/ocr`
- **PDF Service Health Check** - `GET /api/v1/pdf/health`

### 📁 Content Generation (Placeholders)
- **Generate Outline** - `POST /api/v1/generate/outline`
- **Generate Content** - `POST /api/v1/generate/content`
- **Generate Full Deck** - `POST /api/v1/generate/deck`

### 📁 Error Testing
- **PDF Upload - No File** - Tests error handling
- **PDF Upload - Wrong Field Name** - Tests validation

## Environment Variables

The collection uses these variables (automatically set if using the environment file):

- `{{baseUrl}}` - API base URL (default: `http://localhost:8000`)
- `{{apiVersion}}` - API version (default: `v1`)
- `{{industry}}` - Sample industry for testing (default: `technology`)
- `{{geography}}` - Sample geography for testing (default: `United States`)
- `{{lastPdfId}}` - Stores PDF ID from uploads for chaining requests

## Testing Different Endpoints

### 1. Health Checks (Start Here)

**Basic Health Check:**
- Simple endpoint to verify server is running
- No parameters needed
- Should return status: "healthy"

**Detailed Health Check:**
- More comprehensive system information
- Shows service status and capabilities

### 2. PDF Processing (Main Features)

**Single PDF Upload:**
- Upload one PDF file with metadata
- Use query parameters: `?industry=technology&geography=United States`
- Field name must be `pdf`
- Max file size: 100MB
- Returns extracted text, metadata, and processing time

**Batch PDF Upload:**
- Upload multiple PDFs (max 10)
- Field name must be `pdfs` for files
- Include `industry` and `geography` as form fields
- Returns summary of successful/failed processing

**Enhanced pdf2pic + Tesseract OCR Processing:**
- Upload **image files** (jpg, png, gif, etc.) OR **PDF files** for comprehensive text extraction
- **Field Name Flexibility:** Accepts files with either `image` or `file` field names
- **For Images:** Direct OCR processing using Tesseract.js with image optimization
- **For PDFs:** Advanced PDF-to-image + OCR processing optimized for **presentation slides**
  - **Step 1:** Converts PDF pages to high-quality PNG images using pdf2pic (buffer-based)
  - **Step 2:** Uses Tesseract PSM 11 (sparse text) - perfect for slide layouts
  - **Step 3:** Extracts text from charts, diagrams, and embedded images
  - **Step 4:** Combines regular PDF text + OCR results intelligently
  - **Step 5:** Handles mixed content (text blocks + images) in presentations
- Max file size: 100MB
- **Reliable pdf2pic conversion** - improved stability and buffer processing
- Smart fallback to regular text extraction if OCR fails
- Returns comprehensive page-by-page breakdown with processing metrics
- **Perfect for presentation slides** with mixed text and visual content

#### **Field Name Flexibility**

The OCR endpoint (`/api/v1/pdf/ocr`) demonstrates excellent API design by accepting two different field names:

**Option 1: Using 'image' field**
```bash
curl -X POST http://localhost:8000/api/v1/pdf/ocr \
  -F "image=@your-file.pdf"
```

**Option 2: Using 'file' field**  
```bash
curl -X POST http://localhost:8000/api/v1/pdf/ocr \
  -F "file=@your-file.pdf"
```

**When to Use Each:**
- **`image` field:** Ideal for image-specific uploads, semantic clarity, or when the client specifically handles images
- **`file` field:** Perfect for generic file uploads, standard HTML forms, or systems expecting generic file inputs

**Benefits:**
- ✅ **Better developer experience** - works with different client expectations
- ✅ **Frontend flexibility** - accommodates various form designs
- ✅ **Integration friendly** - easier to integrate with existing systems
- ✅ **Identical functionality** - both field names provide exactly the same processing

### 3. Error Testing

Test various error scenarios:
- No file provided
- Wrong field names
- Invalid file types
- Files too large

## Sample Test Files

Create test files in a `test-files/` directory:

```
test-files/
├── sample.pdf          # Small PDF for testing
├── large.pdf           # Large PDF (near 100MB limit)
├── image-text.jpg      # Image with text for OCR
├── invalid.txt         # Wrong file type
└── batch/              # Multiple PDFs for batch testing
    ├── doc1.pdf
    ├── doc2.pdf
    └── doc3.pdf
```

## Automated Testing

### Run Collection with Newman CLI

Install Newman:
```bash
npm install -g newman
```

Run all tests:
```bash
newman run docs/DeckCraft_AI_API_Collection.postman_collection.json \
  -e docs/DeckCraft_AI_Development.postman_environment.json
```

Run specific folder:
```bash
newman run docs/DeckCraft_AI_API_Collection.postman_collection.json \
  -e docs/DeckCraft_AI_Development.postman_environment.json \
  --folder "Health Checks"
```

### Generate HTML Report

```bash
newman run docs/DeckCraft_AI_API_Collection.postman_collection.json \
  -e docs/DeckCraft_AI_Development.postman_environment.json \
  -r html --reporter-html-export newman-report.html
```

## Test Scripts Included

Each request includes automatic tests that verify:

✅ **Status Codes** - Correct HTTP response codes
✅ **Response Structure** - Required fields are present
✅ **Data Types** - Fields have correct data types
✅ **Performance** - Response times under thresholds
✅ **Business Logic** - API behaves as expected

## Environment Setup for Different Stages

### Development
```json
{
  "baseUrl": "http://localhost:8000",
  "apiVersion": "v1"
}
```

### Staging
```json
{
  "baseUrl": "https://staging-api.deckcraft.ai",
  "apiVersion": "v1"
}
```

### Production
```json
{
  "baseUrl": "https://api.deckcraft.ai",
  "apiVersion": "v1"
}
```

## Troubleshooting

### Common Issues

**Server Not Running:**
- Error: `ECONNREFUSED`
- Solution: Start backend with `npm run dev`

**File Upload Fails:**
- Check field name is correct (`pdf`, `pdfs`, `image`)
- Verify file size under 100MB
- Ensure file type is supported

**Tests Failing:**
- Check server is running on correct port
- Verify environment variables are set
- Review server logs for errors

**Performance Issues:**
- OCR processing can take 5-30 seconds
- PDF parsing time depends on file size
- Check server logs for processing details

## Advanced Usage

### Chaining Requests

The collection automatically stores successful PDF upload IDs in `{{lastPdfId}}` for use in subsequent requests.

### Custom Scripts

Add custom pre-request or test scripts:

```javascript
// Pre-request: Generate timestamp
pm.environment.set("timestamp", Date.now());

// Test: Validate custom business logic
pm.test("Processing time under threshold", function () {
    const responseJson = pm.response.json();
    const processingTime = parseInt(responseJson.processing.time);
    pm.expect(processingTime).to.be.below(10000); // 10 seconds
});
```

### Load Testing

For load testing, use Newman with multiple iterations:

```bash
newman run collection.json -n 100 --delay-request 1000
```

## Contributing

To add new tests:

1. Create new request in appropriate folder
2. Add comprehensive test scripts
3. Update environment variables if needed
4. Document the new endpoint in this guide
5. Test locally before committing

## Support

- Backend logs: Check terminal where `npm run dev` is running
- Postman Console: View detailed request/response data
- Server health: Visit `http://localhost:8000/health`
- API docs: Visit `http://localhost:8000/api/v1/`

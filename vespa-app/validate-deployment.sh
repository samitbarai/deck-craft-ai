#!/bin/bash

# Vespa Deployment Validation Script
echo "🔍 Validating Vespa deployment..."

echo "1. Checking application status..."
curl -s http://localhost:8080/ApplicationStatus

echo -e "\n2. Checking search API..."
curl -s "http://localhost:8080/search/?yql=select+*+from+sources+*+where+true+limit+1"

echo -e "\n3. Checking document API..."
curl -s http://localhost:8080/document/v1/

echo -e "\n4. Testing schema validation with a sample document..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "id": "test-doc-1",
      "content": "This is a test slide chunk content",
      "embedding": {"type": "tensor<float>(x[1536])", "values": []},
      "chunk_index": 0,
      "source_file": "test.pdf",
      "file_type": "pdf",
      "created_at": 1704067200,
      "metadata": "test metadata",
      "chunk_size": 100,
      "slide_number": 1
    }
  }' \
  "http://localhost:8080/document/v1/slide_chunks/slide_chunk/docid/test-doc-1" || echo "Document API test failed (expected - need full embedding vector)"

echo -e "\n✅ Validation complete!"

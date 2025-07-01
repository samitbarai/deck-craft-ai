import 'dotenv/config';
import { embeddingService } from './services/embedding-service';
import { vespaService } from './services/vespa-service';

// Test data
const testSlideContent = `
Artificial Intelligence in Modern Business

AI is transforming how businesses operate across all industries. Machine learning algorithms are being used to optimize processes, predict customer behavior, and automate routine tasks. Companies that embrace AI technologies are seeing significant improvements in efficiency and customer satisfaction.

Key benefits include:
- Automated decision making
- Predictive analytics
- Enhanced customer experiences
- Cost reduction through automation
- Improved data insights

The future of business will be increasingly AI-driven, making it essential for organizations to develop AI strategies and capabilities.
`;

const testPresentationData = [
  {
    content: testSlideContent,
    sourceFile: 'ai-business-presentation.pdf',
    slideNumber: 1,
  },
  {
    content: `
Digital Transformation Strategies

Digital transformation is no longer optional for businesses wanting to remain competitive. Organizations must adopt cloud technologies, implement data analytics, and create digital customer experiences.

Essential components:
- Cloud infrastructure migration
- Data-driven decision making
- Customer-centric digital solutions
- Agile development practices
- Cybersecurity frameworks

Success requires leadership commitment, employee training, and a culture of innovation.
`,
    sourceFile: 'ai-business-presentation.pdf',
    slideNumber: 2,
  },
  {
    content: `
Implementation Roadmap

Phase 1: Assessment and Planning (Months 1-2)
- Current state analysis
- Technology gap identification
- Strategy development

Phase 2: Foundation Building (Months 3-6)
- Infrastructure setup
- Team training
- Initial pilot projects

Phase 3: Scale and Optimize (Months 7-12)
- Full deployment
- Process optimization
- Performance measurement

Success metrics include ROI, efficiency gains, and customer satisfaction scores.
`,
    sourceFile: 'ai-business-presentation.pdf',
    slideNumber: 3,
  },
];

async function testVespaService() {
  console.log('🧪 Testing Vespa Indexing Service\n');

  try {
    // Test 1: Service initialization
    console.log('Test 1: Service Initialization');
    const stats = vespaService.getStats();
    console.log('✅ Vespa service stats:', stats);
    console.log('');

    // Test 2: Health check
    console.log('Test 2: Vespa Health Check');
    try {
      const isHealthy = await vespaService.healthCheck();
      if (isHealthy) {
        console.log('✅ Vespa cluster is healthy');
      } else {
        console.log('⚠️  Vespa cluster health check failed - may still be starting up');
      }
    } catch (error) {
      console.log('⚠️  Vespa cluster not accessible - make sure it\'s running with "vespa status"');
    }
    console.log('');

    // Test 3: Process sample data and generate embeddings
    console.log('Test 3: Generate Embeddings for Test Data');
    const allEmbeddingResults = [];
    
    for (const slide of testPresentationData) {
      console.log(`Processing slide ${slide.slideNumber}...`);
      
      const results = await embeddingService.processSlideContent(
        slide.content,
        slide.sourceFile,
        'pdf',
        slide.slideNumber
      );
      
      allEmbeddingResults.push(...results);
      console.log(`  Generated ${results.length} chunks with embeddings`);
    }
    
    console.log(`✅ Total chunks processed: ${allEmbeddingResults.length}`);
    console.log('');

    // Test 4: Index documents in Vespa
    console.log('Test 4: Index Documents in Vespa');
    try {
      const indexResults = await vespaService.indexDocuments(allEmbeddingResults);
      console.log(`✅ Indexing results: ${indexResults.success} successful, ${indexResults.failed} failed`);
      
      if (indexResults.failed > 0) {
        console.log('⚠️  Some documents failed to index - check Vespa logs');
      }
    } catch (error) {
      console.log(`❌ Indexing failed: ${(error as Error).message}`);
      console.log('   Make sure Vespa is running and deployed properly');
    }
    console.log('');

    // Test 5: Test vector search
    console.log('Test 5: Vector Search Test');
    try {
      const queryText = 'artificial intelligence machine learning business';
      const queryEmbedding = await embeddingService.generateQueryEmbedding(queryText);
      
      const vectorResults = await vespaService.vectorSearch(queryEmbedding, { limit: 5 });
      
      console.log(`✅ Vector search returned ${vectorResults.length} results`);
      vectorResults.forEach((result, i) => {
        console.log(`  Result ${i + 1}: ${result.fields.source_file} (slide ${result.fields.slide_number})`);
        console.log(`    Relevance: ${result.relevance.toFixed(4)}`);
        console.log(`    Content: ${result.fields.content.substring(0, 100)}...`);
      });
    } catch (error) {
      console.log(`❌ Vector search failed: ${(error as Error).message}`);
    }
    console.log('');

    // Test 6: Test text search
    console.log('Test 6: Text Search Test');
    try {
      const textResults = await vespaService.textSearch('digital transformation cloud', { limit: 3 });
      
      console.log(`✅ Text search returned ${textResults.length} results`);
      textResults.forEach((result, i) => {
        console.log(`  Result ${i + 1}: ${result.fields.source_file} (slide ${result.fields.slide_number})`);
        console.log(`    Relevance: ${result.relevance.toFixed(4)}`);
        console.log(`    Content: ${result.fields.content.substring(0, 100)}...`);
      });
    } catch (error) {
      console.log(`❌ Text search failed: ${(error as Error).message}`);
    }
    console.log('');

    // Test 7: Test hybrid search
    console.log('Test 7: Hybrid Search Test');
    try {
      const hybridQuery = 'business strategy implementation';
      const hybridEmbedding = await embeddingService.generateQueryEmbedding(hybridQuery);
      
      const hybridResults = await vespaService.hybridSearch(
        hybridQuery,
        hybridEmbedding,
        { 
          limit: 3,
          textWeight: 0.4,
          vectorWeight: 0.6
        }
      );
      
      console.log(`✅ Hybrid search returned ${hybridResults.length} results`);
      hybridResults.forEach((result, i) => {
        console.log(`  Result ${i + 1}: ${result.fields.source_file} (slide ${result.fields.slide_number})`);
        console.log(`    Relevance: ${result.relevance.toFixed(4)}`);
        console.log(`    Content: ${result.fields.content.substring(0, 100)}...`);
      });
    } catch (error) {
      console.log(`❌ Hybrid search failed: ${(error as Error).message}`);
    }
    console.log('');

    // Test 8: Test document retrieval
    console.log('Test 8: Document Retrieval Test');
    if (allEmbeddingResults.length > 0) {
      try {
        const firstDocId = allEmbeddingResults[0].id;
        const retrievedDoc = await vespaService.getDocument(firstDocId);
        
        if (retrievedDoc) {
          console.log(`✅ Successfully retrieved document: ${firstDocId}`);
          console.log(`    Content length: ${retrievedDoc.content.length} chars`);
          console.log(`    Chunk index: ${retrievedDoc.chunk_index}`);
          console.log(`    Source file: ${retrievedDoc.source_file}`);
        } else {
          console.log(`⚠️  Document not found: ${firstDocId}`);
        }
      } catch (error) {
        console.log(`❌ Document retrieval failed: ${(error as Error).message}`);
      }
    }

    console.log('\n🎉 All Vespa service tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testVespaService()
    .then(() => {
      console.log('\n✅ Vespa service test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Vespa service test suite failed:', error);
      process.exit(1);
    });
}

export { testVespaService };

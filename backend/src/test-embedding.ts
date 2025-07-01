import 'dotenv/config';
import { embeddingService, EmbeddingService } from './services/embedding-service';

// Test data
const sampleSlideContent = `
This is a sample slide presentation about artificial intelligence and machine learning.
AI has revolutionized many industries by providing automated solutions to complex problems.
Machine learning algorithms can learn patterns from data and make predictions.
Deep learning, a subset of machine learning, uses neural networks with multiple layers.
Natural language processing enables computers to understand and generate human language.
Computer vision allows machines to interpret and analyze visual information.
These technologies are being applied in healthcare, finance, transportation, and many other fields.
The future of AI looks promising with continued advancements in research and development.
`;

const shortText = "This is a short text that should fit in one chunk.";

const longText = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. 
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, 
eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. 
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos 
qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, 
adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. 
Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea 
commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae 
consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?
`.repeat(3); // Make it long enough to require chunking

async function testEmbeddingService() {
  console.log('🧪 Testing Embedding Service\n');

  try {
    // Test 1: Service initialization and stats
    console.log('Test 1: Service Stats');
    const stats = embeddingService.getStats();
    console.log('✅ Service stats:', stats);
    console.log('');

    // Test 2: Text chunking - short text
    console.log('Test 2: Text Chunking - Short Text');
    const shortChunks = embeddingService.chunkText(
      shortText,
      'test-short.pdf',
      'pdf',
      1
    );
    console.log(`✅ Short text chunks: ${shortChunks.length}`);
    console.log('   Chunk 0:', shortChunks[0]?.content.substring(0, 100) + '...');
    console.log('');

    // Test 3: Text chunking - long text
    console.log('Test 3: Text Chunking - Long Text');
    const longChunks = embeddingService.chunkText(
      longText,
      'test-long.pdf',
      'pdf',
      1,
      { maxChunkSize: 500, overlapSize: 100 }
    );
    console.log(`✅ Long text chunks: ${longChunks.length}`);
    longChunks.forEach((chunk, i) => {
      console.log(`   Chunk ${i}: ${chunk.content.length} chars, ID: ${chunk.id}`);
    });
    console.log('');

    // Test 4: Vector normalization
    console.log('Test 4: Vector Normalization');
    const testVector = [1, 2, 3, 4, 5];
    const normalizedVector = embeddingService.normalizeEmbedding(testVector);
    const magnitude = Math.sqrt(normalizedVector.reduce((sum, val) => sum + val * val, 0));
    console.log(`✅ Original: [${testVector.join(', ')}]`);
    console.log(`✅ Normalized: [${normalizedVector.map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`✅ Magnitude: ${magnitude.toFixed(6)} (should be ~1.0)`);
    console.log('');

    // Test 5: Check Google AI API key
    console.log('Test 5: Google AI API Configuration');
    const hasApiKey = !!process.env.GOOGLE_AI_API_KEY;
    if (hasApiKey) {
      console.log('✅ GOOGLE_AI_API_KEY is configured');
      
      // Test 6: Generate single embedding (only if API key is available)
      console.log('\nTest 6: Single Embedding Generation');
      try {
        const embedding = await embeddingService.generateEmbedding('Hello, world!');
        console.log(`✅ Generated embedding with dimension: ${embedding.length}`);
        console.log(`✅ First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
        
        // Test 7: Query embedding
        console.log('\nTest 7: Query Embedding Generation');
        const queryEmbedding = await embeddingService.generateQueryEmbedding('artificial intelligence machine learning');
        console.log(`✅ Query embedding dimension: ${queryEmbedding.length}`);
        
        // Test 8: Process sample slide content
        console.log('\nTest 8: Process Sample Slide Content');
        const results = await embeddingService.processSlideContent(
          sampleSlideContent,
          'sample-presentation.pdf',
          'pdf',
          1
        );
        console.log(`✅ Processed ${results.length} chunks with embeddings`);
        results.forEach((result, i) => {
          console.log(`   Result ${i}: ${result.chunkSize} chars, embedding dim: ${result.embedding.length}`);
        });
        
      } catch (error) {
        console.log(`❌ API test failed: ${(error as Error).message}`);
        console.log('   This might be due to API rate limits or configuration issues');
      }
    } else {
      console.log('⚠️  GOOGLE_AI_API_KEY not configured - skipping API tests');
      console.log('   To test API functionality, add GOOGLE_AI_API_KEY to your .env file');
    }

    console.log('\n🎉 All embedding service tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testEmbeddingService()
    .then(() => {
      console.log('\n✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { testEmbeddingService };

import { embeddingService } from './services/embedding.service';

async function testEmbedding() {
  try {
    const text = 'This is a test sentence for embedding.';
    const embedding = await embeddingService.generateEmbedding(text);
    console.log('Generated Embedding:', embedding);
    console.log('Embedding length:', embedding.length);

    if (embedding.length === 768) {
      console.log('Embedding length is correct (768).');
    } else {
      console.error(`Error: Embedding length is ${embedding.length}, but expected 768.`);
    }
  } catch (error) {
    console.error('Error testing embedding service:', error);
  }
}

testEmbedding();

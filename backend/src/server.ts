import { build } from './app';

const PORT = process.env.PORT || 8000;

async function start() {
  try {
    const app = await build();
    
    // Start the server
    await app.listen({ 
      port: Number(PORT),
      host: '0.0.0.0'
    });
    
    app.log.info(`🚀 DeckCraft AI Backend Server is running on port ${PORT}`);
    app.log.info(`📚 API Documentation: http://localhost:${PORT}/api/v1`);
    app.log.info(`💚 Health Check: http://localhost:${PORT}/health`);
    app.log.info(`📄 PDF Services: http://localhost:${PORT}/api/v1/pdf`);
    app.log.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
start(); 
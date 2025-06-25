import React from 'react';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>DeckCraft AI</h1>
        <p>AI-powered pitch ingestion and slide-generation tool</p>
      </header>
      <main className="app-main">
        <div className="welcome-section">
          <h2>Welcome to DeckCraft AI</h2>
          <p>Transform your pitch decks with AI-powered automation</p>
          <div className="features">
            <div className="feature">
              <h3>📄 PDF Ingestion</h3>
              <p>Upload and analyze existing pitch decks</p>
            </div>
            <div className="feature">
              <h3>🧠 AI Content Generation</h3>
              <p>Generate contextual content strategies</p>
            </div>
            <div className="feature">
              <h3>🎨 Figma Integration</h3>
              <p>Automatically create Figma slide templates</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 
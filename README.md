# DeckCraft AI

An AI-powered pitch ingestion and slide-generation tool that learns from your existing pitch decks to craft tailored presentations via Figma templates.

## 🎯 Overview

DeckCraft AI revolutionizes the business development process by combining automated research acceleration with programmatic slide generation. The platform ingests historical PDF pitch decks and generates contextually relevant content strategies and Figma slide decks based on merchant industry and geography metadata.

## ✨ Key Features

### 🔍 Automated Ingestion & Research Acceleration

- **Batch PDF Import**: Upload multiple pitch PDFs containing text and images
- **Intelligent Content Analysis**: Extract and analyze text chunks using advanced OCR and vision pipelines
- **Contextual Strategy Generation**: Auto-generate pitch structure and content themes based on merchant profiles

### 🎨 Programmatic Slide Generation

- **Figma Integration**: Automatically populate Figma slide templates with AI-drafted content
- **Image Asset Management**: Extract and catalog images from PDFs with intelligent tagging
- **Brand Consistency**: Maintain standardized templates with style tokens

### 🧠 RAG-Powered Intelligence

- **Smart Content Retrieval**: Uses Vespa vector database for intelligent slide chunk embeddings
- **Contextual Recommendations**: Retrieves most relevant past slides based on merchant profiles
- **AI-Powered Writing**: Leverages OpenAI GPT-4 for content generation with your existing style

## 👥 User Personas

- **BD Executives**: Get quick content outlines and draft slides based on merchant profiles
- **Design Leads**: Review and approve AI-generated Figma slides for brand alignment
- **Product Owners**: Monitor metrics and iterate on templates for optimal performance

## 🛠 Tech Stack

- **Frontend**: Vite (React + TypeScript) for the review dashboard
- **Backend**: Node.js with Express framework
- **Database**: PostgreSQL for relational data storage
- **Vector Database**: Vespa for slide-chunk embeddings and RAG retrieval
- **AI/ML**:
  - OpenAI GPT-4 for content generation
  - OpenAI text-embedding-ada-002 for embeddings
- **Design Integration**: Figma REST API for automated slide creation
- **Cloud Storage**: S3 (or equivalent) for asset repository

## 🏗 Architecture

### Data Flow

1. **Upload & Tag**: Users upload PDFs and specify industry/geography metadata
2. **Embed & Index**: Backend extracts text chunks, generates embeddings, and stores in Vespa
3. **Outline Generation**: System retrieves relevant examples and generates content strategy
4. **Slide Creation**: Figma templates are populated automatically via API integration

### Core APIs

- `/generateOutline` - Returns section breakdown and key themes per slide
- `/retrieveAssets` - Returns recommended images for slide sections
- `/createFigmaSlides` - Generates Figma files with populated content and assets

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Vespa instance
- OpenAI API key
- Figma API access token

### Installation

```bash
# Clone the repository
git clone https://github.com/samitbarai/deck-craft-ai.git
cd deck-craft-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and database credentials

# Set up the database
npm run db:migrate

# Start the development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://username:password@localhost:5432/deckcraft
OPENAI_API_KEY=your_openai_api_key
FIGMA_ACCESS_TOKEN=your_figma_token
VESPA_ENDPOINT=your_vespa_endpoint
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BUCKET_NAME=your_s3_bucket
```

## 📈 Success Metrics

- **Research Time Saved**: ≥50% reduction in BD preparation time
- **Draft Accuracy**: ≥70% first-draft approval rate
- **User Adoption**: 75% BD team usage within 2 months
- **Performance**: 95th percentile endpoint latency <5s

## 🗺 Roadmap

| Sprint   | Deliverable                                     |
| -------- | ----------------------------------------------- |
| Sprint 1 | PDF ingestion service + Vespa indexing          |
| Sprint 2 | `/generateOutline` API with template-backed RAG |
| Sprint 3 | Figma template library & `/createFigmaSlides`   |
| Sprint 4 | Frontend review dashboard (Vite)                |
| Sprint 5 | Feedback capture & iteration system             |

## 📊 Performance Requirements

- **Outline Generation**: <3 seconds
- **Figma Slide Creation**: <5 seconds
- **Concurrent Support**: 500 ingestion jobs, 50 parallel Figma exports
- **Uptime**: 99.5% for ingestion and export endpoints

## 🔒 Security & Compliance

- OAuth2 integration for Figma authentication
- Encrypted merchant data storage in PostgreSQL
- Secure API endpoints with rate limiting
- GDPR-compliant data handling

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions and support, please reach out to the development team or create an issue in this repository.

---

**DeckCraft AI** - Transforming how business development teams create compelling pitch presentations through the power of AI and automation.

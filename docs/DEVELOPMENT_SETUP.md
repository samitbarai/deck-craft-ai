# DeckCraft AI Development Setup

This guide will help you set up the DeckCraft AI development environment on your local machine.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **PostgreSQL** (Option 1) or **Docker** (Option 2)

## Quick Start Options

### Option 1: Native Setup (Recommended for development)

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/samitbarai/deck-craft-ai.git
   cd deck-craft-ai
   npm install
   ```

2. **Install PostgreSQL:**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows - Download from postgresql.org
   ```

3. **Set up the database:**
   ```bash
   ./scripts/database/setup-db.sh
   ```

4. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your settings
   ```

5. **Start development servers:**
   ```bash
   # Terminal 1: Start backend
   cd backend && npm run dev
   
   # Terminal 2: Start frontend  
   cd frontend && npm run dev
   
   # Or start both with:
   npm run dev
   ```

### Option 2: Docker Setup (Easy setup)

1. **Start services with Docker:**
   ```bash
   # Start PostgreSQL only
   docker-compose up postgres
   
   # Start with development tools (includes pgAdmin)
   docker-compose --profile tools up
   
   # Start full stack (includes Vespa, Redis)
   docker-compose --profile full up
   ```

2. **Configure environment and start apps:**
   ```bash
   cp env.example .env
   npm run dev
   ```

## Project Structure

```
deck-craft-ai/
├── frontend/          # React + Vite frontend
├── backend/           # Express.js + TypeScript backend
├── shared/            # Shared types and utilities
├── scripts/           # Database and deployment scripts
├── docs/              # Documentation
├── config/            # Configuration files
└── docker-compose.yml # Development environment
```

## Available Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3004 | React application |
| Backend API | http://localhost:8000 | Express.js API server |
| Health Check | http://localhost:8000/health | Backend health status |
| API Docs | http://localhost:8000/api/v1 | API endpoint listing |
| pgAdmin | http://localhost:5050 | PostgreSQL web interface |

## Development Commands

```bash
# Install dependencies
npm install

# Start development servers
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start frontend only  
npm run dev:backend      # Start backend only

# Build for production
npm run build            # Build both projects
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only

# Linting and formatting
npm run lint             # Lint all projects
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier

# Database operations
./scripts/database/setup-db.sh  # Initialize database
```

## Environment Variables

Key environment variables for development:

```bash
# Application
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3004

# Database
DB_HOST=localhost
DB_PORT=5432  
DB_NAME=deckcraft_ai
DB_USER=postgres
DB_PASSWORD=password

# Vector Database (Vespa)
VESPA_ENDPOINT=http://localhost:8080
```

See `env.example` for complete configuration options.

## Database Management

### Using Native PostgreSQL

```bash
# Connect to database
psql -U postgres -d deckcraft_ai

# Run migrations
./scripts/database/setup-db.sh

# Reset database
./scripts/database/setup-db.sh  # Choose 'y' to recreate
```

### Using Docker

```bash
# Start PostgreSQL
docker-compose up postgres

# Access database
docker-compose exec postgres psql -U postgres -d deckcraft_ai

# View pgAdmin
# Open http://localhost:5050
# Email: admin@deckcraft.ai, Password: admin
```

## API Development

The backend API provides these endpoints:

- `GET /health` - Health check
- `GET /api/v1` - API documentation
- `POST /api/v1/pdf/upload` - PDF upload (placeholder)
- `POST /api/v1/content/generate-outline` - Content generation
- `GET /api/v1/content/retrieve-assets` - Asset retrieval
- `POST /api/v1/figma/create-slides` - Figma integration
- `GET /api/v1/merchant/profile` - Merchant data

## Testing

```bash
# Run tests
npm test

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/v1
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Frontend: Change port in `frontend/vite.config.ts`
   - Backend: Set `PORT` in `.env` file

2. **Database connection issues:**
   - Ensure PostgreSQL is running: `pg_isready -U postgres`
   - Check connection details in `.env`
   - Try restarting PostgreSQL service

3. **Permission denied on scripts:**
   ```bash
   chmod +x scripts/database/setup-db.sh
   ```

4. **Node.js version issues:**
   ```bash
   node --version  # Should be 18+
   npm install -g n
   n latest
   ```

### Getting Help

- Check the [PRD.md](../PRD.md) for project requirements
- Review [README.md](../README.md) for project overview
- Open an issue on GitHub for bugs or feature requests

## Next Steps

After setup is complete:

1. ✅ Verify all services are running
2. ✅ Test API endpoints
3. ✅ Explore the frontend interface
4. 📚 Read the PRD for project goals
5. 🚀 Start developing features! 
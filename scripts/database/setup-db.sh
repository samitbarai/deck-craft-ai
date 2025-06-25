#!/bin/bash

# DeckCraft AI Database Setup Script
# This script sets up the PostgreSQL database for the DeckCraft AI application

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Setting up DeckCraft AI Database..."

# Default values
DB_NAME="deckcraft_ai"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running or not accessible at $DB_HOST:$DB_PORT"
    echo "Please ensure PostgreSQL is installed and running."
    echo ""
    echo "🔧 To install PostgreSQL:"
    echo "  macOS: brew install postgresql && brew services start postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to recreate it? This will delete all existing data! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    else
        echo "📚 Using existing database"
        exit 0
    fi
fi

# Create database
echo "📝 Creating database '$DB_NAME'..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Run initialization script
echo "🏗️  Initializing database schema..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/init-database.sql"

echo ""
echo "🎉 Database setup completed successfully!"
echo ""
echo "📋 Database Information:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""
echo "🔧 Next steps:"
echo "   1. Copy env.example to .env and configure your environment variables"
echo "   2. Start the backend server: cd backend && npm run dev"
echo "   3. Test the connection at: http://localhost:8000/health"
echo "" 
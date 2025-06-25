-- DeckCraft AI Database Initialization Script
-- This script creates the initial database structure for the DeckCraft AI application

-- Create database (run this as postgres superuser)
-- CREATE DATABASE deckcraft_ai;
-- \c deckcraft_ai;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create merchants table for business information
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    geography VARCHAR(100),
    description TEXT,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pitch_decks table for uploaded PDFs
CREATE TABLE IF NOT EXISTS pitch_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_path VARCHAR(500),
    mime_type VARCHAR(100),
    page_count INTEGER,
    upload_status VARCHAR(50) DEFAULT 'pending',
    processing_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create content_chunks table for extracted content
CREATE TABLE IF NOT EXISTS content_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pitch_deck_id UUID REFERENCES pitch_decks(id) ON DELETE CASCADE,
    page_number INTEGER,
    chunk_type VARCHAR(50), -- 'text', 'image', 'table', etc.
    content TEXT,
    image_url VARCHAR(500),
    metadata JSONB,
    vector_id VARCHAR(255), -- Reference to Vespa document ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create content_outlines table for generated outlines
CREATE TABLE IF NOT EXISTS content_outlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    outline_data JSONB NOT NULL,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create figma_templates table for Figma integration
CREATE TABLE IF NOT EXISTS figma_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    outline_id UUID REFERENCES content_outlines(id) ON DELETE CASCADE,
    figma_file_id VARCHAR(255),
    figma_file_url VARCHAR(500),
    template_name VARCHAR(255),
    slide_count INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_merchant_id ON pitch_decks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_content_chunks_pitch_deck_id ON content_chunks(pitch_deck_id);
CREATE INDEX IF NOT EXISTS idx_content_chunks_vector_id ON content_chunks(vector_id);
CREATE INDEX IF NOT EXISTS idx_content_outlines_merchant_id ON content_outlines(merchant_id);
CREATE INDEX IF NOT EXISTS idx_figma_templates_merchant_id ON figma_templates(merchant_id);
CREATE INDEX IF NOT EXISTS idx_figma_templates_outline_id ON figma_templates(outline_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_outlines_updated_at BEFORE UPDATE ON content_outlines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO users (email, password_hash, first_name, last_name, company, role) VALUES
('demo@deckcraft.ai', '$2b$10$example_hash_here', 'Demo', 'User', 'DeckCraft AI', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Success message
SELECT 'DeckCraft AI database initialized successfully!' as status; 
import { Pool } from 'pg';
import crypto from 'crypto';

// Database configuration (you may want to import this from a shared config)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'deckcraft_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

export interface OAuthTokens {
  id?: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope?: string;
  expires_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class TokenManager {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-32-character-encryption-key';
    if (this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
  }

  // Encrypt sensitive token data
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt sensitive token data
  private decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Store OAuth tokens for a user
  async storeTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
    const client = await pool.connect();
    
    try {
      // Encrypt sensitive tokens
      const encryptedAccessToken = this.encrypt(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? this.encrypt(tokens.refresh_token) : null;

      const query = `
        INSERT INTO user_oauth_tokens (
          user_id, provider, access_token, refresh_token, 
          token_type, scope, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, provider) 
        DO UPDATE SET 
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_type = EXCLUDED.token_type,
          scope = EXCLUDED.scope,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        tokens.user_id,
        tokens.provider,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokens.token_type,
        tokens.scope,
        tokens.expires_at
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Retrieve OAuth tokens for a user and provider
  async getTokens(userId: string, provider: string): Promise<OAuthTokens | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM user_oauth_tokens 
        WHERE user_id = $1 AND provider = $2;
      `;

      const result = await client.query(query, [userId, provider]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Decrypt sensitive tokens
      return {
        ...row,
        access_token: this.decrypt(row.access_token),
        refresh_token: row.refresh_token ? this.decrypt(row.refresh_token) : null
      };
    } finally {
      client.release();
    }
  }

  // Update tokens (typically after refresh)
  async updateTokens(userId: string, provider: string, newTokens: Partial<OAuthTokens>): Promise<OAuthTokens | null> {
    const client = await pool.connect();
    
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [userId, provider];
      let paramCount = 2;

      if (newTokens.access_token) {
        updateFields.push(`access_token = $${++paramCount}`);
        values.push(this.encrypt(newTokens.access_token));
      }

      if (newTokens.refresh_token) {
        updateFields.push(`refresh_token = $${++paramCount}`);
        values.push(this.encrypt(newTokens.refresh_token));
      }

      if (newTokens.expires_at) {
        updateFields.push(`expires_at = $${++paramCount}`);
        values.push(newTokens.expires_at);
      }

      if (newTokens.scope) {
        updateFields.push(`scope = $${++paramCount}`);
        values.push(newTokens.scope);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE user_oauth_tokens 
        SET ${updateFields.join(', ')}
        WHERE user_id = $1 AND provider = $2
        RETURNING *;
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Decrypt sensitive tokens
      return {
        ...row,
        access_token: this.decrypt(row.access_token),
        refresh_token: row.refresh_token ? this.decrypt(row.refresh_token) : null
      };
    } finally {
      client.release();
    }
  }

  // Delete OAuth tokens for a user and provider
  async deleteTokens(userId: string, provider: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = `
        DELETE FROM user_oauth_tokens 
        WHERE user_id = $1 AND provider = $2;
      `;

      const result = await client.query(query, [userId, provider]);
      return result.rowCount !== null && result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Check if tokens are expired
  isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expires_at) {
      return false; // No expiration set
    }
    
    return new Date() >= new Date(tokens.expires_at);
  }

  // Get all providers for a user
  async getUserProviders(userId: string): Promise<string[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT DISTINCT provider FROM user_oauth_tokens 
        WHERE user_id = $1;
      `;

      const result = await client.query(query, [userId]);
      return result.rows.map(row => row.provider);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
export default tokenManager;

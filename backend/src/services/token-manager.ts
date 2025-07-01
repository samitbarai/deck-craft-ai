import { PrismaClient, user_oauth_tokens as OAuthTokens } from '../generated/prisma';
import crypto from 'crypto';

const prisma = new PrismaClient();

export { OAuthTokens };

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
  async storeTokens(tokens: Omit<OAuthTokens, 'id' | 'created_at' | 'updated_at'>): Promise<OAuthTokens> {
    const encryptedAccessToken = this.encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? this.encrypt(tokens.refresh_token) : null;

    const data = {
      user_id: tokens.user_id,
      provider: tokens.provider,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_type: tokens.token_type,
      scope: tokens.scope,
      expires_at: tokens.expires_at,
    };

    return prisma.user_oauth_tokens.upsert({
      where: { user_id_provider: { user_id: tokens.user_id!, provider: tokens.provider } },
      update: data,
      create: data,
    });
  }

  // Retrieve OAuth tokens for a user and provider
  async getTokens(userId: string, provider: string): Promise<OAuthTokens | null> {
    const tokens = await prisma.user_oauth_tokens.findUnique({
      where: { user_id_provider: { user_id: userId, provider: provider } },
    });

    if (!tokens) {
      return null;
    }

    return {
      ...tokens,
      access_token: this.decrypt(tokens.access_token),
      refresh_token: tokens.refresh_token ? this.decrypt(tokens.refresh_token) : null,
    };
  }

  // Update tokens (typically after refresh)
  async updateTokens(userId: string, provider: string, newTokens: Partial<Omit<OAuthTokens, 'id' | 'user_id' | 'provider' | 'created_at' | 'updated_at'>>): Promise<OAuthTokens | null> {
    const data: { [key: string]: any } = { ...newTokens };

    if (newTokens.access_token) {
      data.access_token = this.encrypt(newTokens.access_token);
    }
    if (newTokens.refresh_token) {
      data.refresh_token = this.encrypt(newTokens.refresh_token);
    }

    const updatedTokens = await prisma.user_oauth_tokens.update({
      where: { user_id_provider: { user_id: userId, provider: provider } },
      data,
    });

    return {
      ...updatedTokens,
      access_token: this.decrypt(updatedTokens.access_token),
      refresh_token: updatedTokens.refresh_token ? this.decrypt(updatedTokens.refresh_token) : null,
    };
  }

  // Delete OAuth tokens for a user and provider
  async deleteTokens(userId: string, provider: string): Promise<boolean> {
    const result = await prisma.user_oauth_tokens.delete({
      where: { user_id_provider: { user_id: userId, provider: provider } },
    });
    return !!result;
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
    const tokens = await prisma.user_oauth_tokens.findMany({
      where: { user_id: userId },
      distinct: ['provider'],
      select: {
        provider: true,
      },
    });
    return tokens.map(token => token.provider);
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
export default tokenManager;

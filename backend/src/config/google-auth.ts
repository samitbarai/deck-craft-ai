import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// OAuth2 client configuration
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Required scopes for Google Slides integration
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// OAuth2 configuration
export const OAUTH_CONFIG = {
  access_type: 'offline',
  scope: GOOGLE_SCOPES,
  prompt: 'consent', // Force consent to ensure refresh token
  include_granted_scopes: true
} as const;

// Generate authorization URL
export function generateAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    ...OAUTH_CONFIG,
    state
  });
}

// Set credentials for the OAuth2 client
export function setCredentials(tokens: any) {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// Get user credentials from OAuth2 client
export function getCredentials() {
  return oauth2Client.credentials;
}

// Refresh access token
export async function refreshAccessToken() {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    return credentials;
  } catch (error) {
    throw new Error(`Failed to refresh access token: ${error}`);
  }
}

// Create a new OAuth2 client with specific credentials
export function createAuthenticatedClient(tokens: any) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  client.setCredentials(tokens);
  return client;
}

export default {
  oauth2Client,
  GOOGLE_SCOPES,
  OAUTH_CONFIG,
  generateAuthUrl,
  setCredentials,
  getCredentials,
  refreshAccessToken,
  createAuthenticatedClient
};

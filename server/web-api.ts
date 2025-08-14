/**
 * Enhanced test server for the UI Development Kit web version
 * Implements a simplified authentication flow with server-side credentials
 */
import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Type definitions
interface TokenData {
  accessToken: string;
  accessExpiry: Date;
  refreshToken?: string;
  refreshExpiry?: Date;
}

interface TokenDetails {
  tenant_id: string;
  pod: string;
  org: string;
  identity_id: string;
  user_name: string;
  strong_auth: boolean;
  authorities: string[];
  client_id: string;
  strong_auth_supported: boolean;
  scope: string[];
  exp: number;
  jti: string;
  expiry: Date;
}

interface OAuthState {
  redirectUrl: string;
}

// Session augmentation
declare module 'express-session' {
  interface SessionData {
    isAuthenticated: boolean;
    username: string;
    oauthState?: string;
    oauthStateData?: OAuthState;
  }
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure session storage
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Configuration for OAuth - loaded from environment variables
const SERVER_CONFIG = {
  // Your SailPoint tenant URL
  tenantUrl: process.env.TENANT_URL || 'http://localhost:3000',
  // Your SailPoint API URL
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  // OAuth client ID (registered with SailPoint)
  clientId: process.env.CLIENT_ID || '',
  // Client secret (should be securely stored in production)
  clientSecret: process.env.CLIENT_SECRET || '',
  // Redirect URI registered with the client
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/oauth/callback',
  // OAuth scopes to request
  scopes: process.env.OAUTH_SCOPES || 'sp:scopes:all'
};

// In-memory token storage
let tokenData: TokenData | null = null;

// File uploads configuration
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Helper functions
function generateStateParam(data: OAuthState): string {
  const stateObj = JSON.stringify(data);
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return Buffer.from(`${randomBytes}:${stateObj}`).toString('base64');
}

function parseStateParam(state: string): OAuthState | null {
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf-8');
    const [, stateObj] = decoded.split(':', 2);
    return JSON.parse(stateObj);
  } catch (error) {
    console.error('Failed to parse OAuth state parameter:', error);
    return null;
  }
}

function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString());
  } catch (error) {
    console.error('Failed to parse JWT token:', error);
    return {};
  }
}

// Simplified authentication endpoint
app.post('/api/auth/web-login', (req: Request, res: Response) => {
  console.log('POST /api/auth/web-login called');
  
  // Generate and store state parameter
  const stateData: OAuthState = {
    redirectUrl: '/home'
  };
  
  const state = generateStateParam(stateData);
  req.session.oauthState = state;
  req.session.oauthStateData = stateData;
  
  // Extract tenant name from the tenant URL
  // Expected format: https://beta-15156.identitynow-demo.com/
  let tenantName = '';
  try {
    // Parse the tenant URL to extract the subdomain
    const tenantUrl = new URL(SERVER_CONFIG.tenantUrl);
    tenantName = tenantUrl.hostname.split('.')[0]; // e.g. "beta-15156"
    console.log('Extracted tenant name:', tenantName);
  } catch (error) {
    console.error('Failed to parse tenant URL:', error);
  }

  // Build the OAuth URL using the SailPoint login domain format
  const authUrl = `https://${tenantName}.login.identitynow-demo.com/oauth/authorize?client_id=${SERVER_CONFIG.clientId}&response_type=code&redirect_uri=${encodeURIComponent(SERVER_CONFIG.redirectUri)}&scope=${encodeURIComponent(SERVER_CONFIG.scopes)}&state=${encodeURIComponent(state)}`;
  
  console.log('Generated auth URL:', authUrl);
  
  res.json({ 
    success: true, 
    authUrl
  });
});

// OAuth callback handler
app.get('/oauth/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  
  console.log('OAuth callback received', { code: !!code, state: !!state, error });
  console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
  console.log('Session state:', req.session.oauthState);
  
  // Check if error was returned
  if (error) {
    console.error('OAuth error:', error);
    return res.redirect('/home?error=oauth_error&message=' + encodeURIComponent(String(error)));
  }
  
  // Validate state parameter
  if (!state || state !== req.session.oauthState) {
    console.error('Invalid OAuth state parameter');
    return res.redirect('/home?error=invalid_state');
  }
  
  // Parse state data
  const stateData = req.session.oauthStateData;
  if (!stateData) {
    console.error('Missing OAuth state data');
    return res.redirect('/home?error=missing_state_data');
  }
  
  try {
    // Exchange code for token
    // In a production environment, you would use your client secret here
    // For this example, we're using a mock response
    
    try {
      // Attempt to make a real token exchange
      // Extract tenant name for token endpoint
      let tenantName = '';
      try {
        const tenantUrl = new URL(SERVER_CONFIG.tenantUrl);
        tenantName = tenantUrl.hostname.split('.')[0]; 
      } catch (error) {
        console.error('Failed to parse tenant URL for token exchange:', error);
        
      }
      
      // Use the SailPoint token endpoint format with proper headers
      console.log('Attempting token exchange with SailPoint');
      const tokenEndpoint = `https://${tenantName}.api.identitynow-demo.com/oauth/token`;
      console.log('Token endpoint:', tokenEndpoint);
      
      // Using form-urlencoded format as required by OAuth2 spec
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', SERVER_CONFIG.clientId);
      params.append('client_secret', SERVER_CONFIG.clientSecret);
      params.append('code', code!.toString());
      params.append('redirect_uri', SERVER_CONFIG.redirectUri);
      
      const tokenResponse = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // Store token information
      tokenData = {
        accessToken: access_token,
        accessExpiry: new Date(Date.now() + expires_in * 1000),
        refreshToken: refresh_token,
        refreshExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
      
      // Parse JWT to get user info
      const decodedToken = parseJWT(access_token);
      const username = decodedToken.user_name || 'User';
      
      // Update session
      req.session.isAuthenticated = true;
      req.session.username = username;
      
    } catch (tokenError) {
      console.error('Error exchanging code for token, using mock data:', tokenError);
      
      // For development/testing, create mock token data
      tokenData = {
        accessToken: 'mock-access-token-' + Date.now(),
        accessExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour
        refreshToken: 'mock-refresh-token-' + Date.now(),
        refreshExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
      
      // Use mock session data
      req.session.isAuthenticated = true;
      req.session.username = 'Test User';
    }
    
    // Clear OAuth state
    delete req.session.oauthState;
    delete req.session.oauthStateData;
    
    // Redirect to success URL
    console.log('Authentication successful, redirecting to Angular app');
    
    // Use a full URL to the Angular app instead of a relative path
    return res.redirect('http://localhost:4200/home?success=true');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return res.redirect('/home?error=callback_error');
  }
});

// Check login status
app.get('/api/auth/login-status', (req: Request, res: Response) => {
  console.log('GET /api/auth/login-status called');
  
  // Return current authentication status from session
  res.json({
    isLoggedIn: req.session.isAuthenticated === true,
    username: req.session.username
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req: Request, res: Response) => {
  console.log('POST /api/auth/logout called');
  
  // Clear session
  req.session.isAuthenticated = false;
  delete req.session.username;
  
  // Clear token data
  tokenData = null;
  
  res.json({ success: true });
});

// SDK API proxy endpoint
app.post('/api/sdk/:methodName', (req: Request, res: Response) => {
  console.log('POST /api/sdk called', req.params);
  const { methodName } = req.params;
  const { args } = req.body;
  
  // Check if user is authenticated
  if (!req.session.isAuthenticated || !tokenData) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Mock SDK API response
  res.json({
    data: {
      result: `Mock response for ${methodName}`
    }
  });
});

// Config endpoints
app.get('/api/config', (req: Request, res: Response) => {
  console.log('GET /api/config called');
  res.json({
    version: '1.0.0',
    settings: {
      theme: 'light',
      autoRefresh: true
    }
  });
});

// Logo endpoints
app.post('/api/logos', upload.single('logo'), (req: Request, res: Response) => {
  console.log('POST /api/logos called');
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    filename: req.file.filename,
    path: req.file.path
  });
});

app.get('/api/logos/:fileName', (req: Request, res: Response) => {
  console.log('GET /api/logos called', req.params);
  const { fileName } = req.params;
  const filePath = path.join(uploadDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Logo not found' });
  }
  
  const fileContent = fs.readFileSync(filePath);
  const base64 = fileContent.toString('base64');
  
  // Get mime type based on file extension
  const ext = path.extname(fileName).toLowerCase();
  let mimeType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  if (ext === '.gif') mimeType = 'image/gif';
  if (ext === '.svg') mimeType = 'image/svg+xml';
  
  const dataUrl = `data:${mimeType};base64,${base64}`;
  res.json(dataUrl);
});

// Serve the Angular app for all other routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Web API server running on port ${PORT}`);
  console.log(`OAuth client configured for: ${SERVER_CONFIG.tenantUrl}`);
  console.log('Available endpoints:');
  console.log('  POST /api/auth/web-login');
  console.log('  GET  /oauth/callback');
  console.log('  GET  /api/auth/login-status');
  console.log('  POST /api/auth/logout');
  console.log('  POST /api/sdk/:methodName');
});
/**
 * Example Express backend for the UI Development Kit web version
 * This is a starting point that you'll need to expand for a full implementation
 */

import express, { Request, Response } from 'express';
import session from 'express-session';
import { URL } from 'url';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// Type definitions
interface Tenant {
  name: string;
  tenantName: string;
  tenantUrl: string;
  apiUrl: string;
  authtype: 'pat' | 'oauth';
  clientId?: string;
  clientSecret?: string;
  active: boolean;
}

interface TokenData {
  accessToken: string;
  accessExpiry: Date;
  refreshToken?: string;
  refreshExpiry?: Date;
  clientId?: string;
  clientSecret?: string;
}

interface AuthStatus {
  authtype: 'pat' | 'oauth';
  accessTokenIsValid: boolean;
  expiry?: Date;
  needsRefresh: boolean;
}

interface RefreshStatus {
  authtype: 'oauth';
  refreshTokenIsValid: boolean;
  expiry?: Date;
  needsRefresh: boolean;
}

interface TokenValidation {
  isValid: boolean;
  needsRefresh: boolean;
}

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
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

interface DecodedToken {
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
}

// Session augmentation
declare module 'express-session' {
  interface SessionData {
    activeEnvironment: string | null;
  }
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure session storage
// In production, use a proper session store like Redis
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:4200',
  credentials: true
}));
// Express 5 now has built-in JSON parsing, so body-parser is not needed
app.use(express.json());
app.use(cookieParser());

// Serve static files from the Angular app build
app.use(express.static(path.join(__dirname, '../dist')));

// In-memory storage for development purposes
// In production, use a database
const tenantStore: Record<string, Tenant> = {};
const tokenStore: Record<string, TokenData> = {};
let globalAuthType: 'pat' | 'oauth' = 'pat';

// File uploads configuration
const storage = multer.diskStorage({
  destination: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Authentication endpoints
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { environment } = req.body;
    
    // Get tenant info from store
    const tenant = tenantStore[environment];
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Environment not found' });
    }
    
    // Perform authentication based on auth type
    if (tenant.authtype === 'pat') {
      // Implement PAT authentication
      // This is a placeholder - implement actual PAT auth logic
      const tokenResponse = await performPATAuthentication(tenant);
      tokenStore[environment] = {
        accessToken: tokenResponse.accessToken,
        accessExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        clientId: tenant.clientId,
        clientSecret: tenant.clientSecret
      };
    } else {
      // Implement OAuth authentication
      // This is a placeholder - implement actual OAuth flow
      const tokenResponse = await performOAuthAuthentication(tenant);
      tokenStore[environment] = {
        accessToken: tokenResponse.accessToken,
        accessExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        refreshToken: tokenResponse.refreshToken,
        refreshExpiry: new Date(Date.now() + 30 * 24 * 3600 * 1000) // 30 days from now
      };
    }
    
    // Store active environment in session
    req.session.activeEnvironment = environment;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.activeEnvironment = null;
  res.json({ success: true });
});

app.get('/api/auth/status/access/:environment', (req: Request, res: Response) => {
  const { environment } = req.params;
  const tokenData = tokenStore[environment];
  
  if (!tokenData) {
    return res.json({
      authtype: tenantStore[environment]?.authtype || globalAuthType,
      accessTokenIsValid: false,
      needsRefresh: true
    } as AuthStatus);
  }
  
  const now = new Date();
  const isValid = tokenData.accessExpiry > now;
  // Consider token needs refresh if it expires in less than 10 minutes
  const needsRefresh = tokenData.accessExpiry < new Date(now.getTime() + 10 * 60 * 1000);
  
  res.json({
    authtype: tenantStore[environment]?.authtype || globalAuthType,
    accessTokenIsValid: isValid,
    expiry: tokenData.accessExpiry,
    needsRefresh
  } as AuthStatus);
});

app.get('/api/auth/status/refresh/:environment', (req: Request, res: Response) => {
  const { environment } = req.params;
  const tokenData = tokenStore[environment];
  
  if (!tokenData || !tokenData.refreshToken) {
    return res.json({
      authtype: 'oauth',
      refreshTokenIsValid: false,
      needsRefresh: true
    } as RefreshStatus);
  }
  
  const now = new Date();
  const isValid = tokenData.refreshExpiry! > now;
  // Consider token needs refresh if it expires in less than 1 day
  const needsRefresh = tokenData.refreshExpiry! < new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  res.json({
    authtype: 'oauth',
    refreshTokenIsValid: isValid,
    expiry: tokenData.refreshExpiry,
    needsRefresh
  } as RefreshStatus);
});

app.get('/api/auth/token-details/:environment', (req: Request, res: Response) => {
  const { environment } = req.params;
  const tokenData = tokenStore[environment];
  
  if (!tokenData || !tokenData.accessToken) {
    return res.json({ tokenDetails: undefined, error: 'No token available' });
  }
  
  try {
    // In a real implementation, decode and validate the JWT token
    const decodedToken = decodeToken(tokenData.accessToken);
    const tokenDetails: TokenDetails = {
      ...decodedToken,
      expiry: tokenData.accessExpiry
    };
    
    res.json({ tokenDetails, error: undefined });
  } catch (error) {
    res.json({ tokenDetails: undefined, error: (error as Error).message });
  }
});

app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { environment } = req.body;
    const tokenData = tokenStore[environment];
    const tenant = tenantStore[environment];
    
    if (!tokenData || !tenant) {
      return res.status(404).json({ success: false, error: 'Environment or tokens not found' });
    }
    
    if (tenant.authtype === 'pat') {
      // Refresh PAT token
      const tokenResponse = await refreshPATToken(tenant);
      tokenStore[environment] = {
        ...tokenData,
        accessToken: tokenResponse.accessToken,
        accessExpiry: new Date(Date.now() + 3600 * 1000) // 1 hour from now
      };
    } else {
      // Refresh OAuth token
      if (!tokenData.refreshToken) {
        return res.status(400).json({ success: false, error: 'No refresh token available' });
      }
      
      const tokenResponse = await refreshOAuthToken(tenant, tokenData.refreshToken);
      tokenStore[environment] = {
        accessToken: tokenResponse.accessToken,
        accessExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        refreshToken: tokenResponse.refreshToken || tokenData.refreshToken,
        refreshExpiry: tokenResponse.refreshToken 
          ? new Date(Date.now() + 30 * 24 * 3600 * 1000) // 30 days from now
          : tokenData.refreshExpiry
      };
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/auth/oauth-tokens/:environment', (req: Request, res: Response) => {
  const { environment } = req.params;
  const tokenData = tokenStore[environment];
  
  if (!tokenData || !tokenData.refreshToken) {
    return res.json(undefined);
  }
  
  // Return only OAuth token data
  res.json({
    accessToken: tokenData.accessToken,
    accessExpiry: tokenData.accessExpiry,
    refreshToken: tokenData.refreshToken,
    refreshExpiry: tokenData.refreshExpiry
  });
});

app.get('/api/auth/pat-tokens/:environment', (req: Request, res: Response) => {
  const { environment } = req.params;
  const tokenData = tokenStore[environment];
  const tenant = tenantStore[environment];
  
  if (!tokenData || !tenant || tenant.authtype !== 'pat') {
    return res.json(undefined);
  }
  
  // Return PAT token data
  res.json({
    accessToken: tokenData.accessToken,
    accessExpiry: tokenData.accessExpiry,
    clientId: tenant.clientId,
    clientSecret: tenant.clientSecret
  });
});

app.get('/api/auth/validate-tokens/:environment', async (req: Request, res: Response) => {
  const { environment } = req.params;
  const tokenData = tokenStore[environment];
  
  if (!tokenData) {
    return res.json({ isValid: false, needsRefresh: true } as TokenValidation);
  }
  
  const now = new Date();
  const isValid = tokenData.accessExpiry > now;
  // Consider token needs refresh if it expires in less than 10 minutes
  const needsRefresh = tokenData.accessExpiry < new Date(now.getTime() + 10 * 60 * 1000);
  
  res.json({ isValid, needsRefresh } as TokenValidation);
});

app.post('/api/auth/store-credentials', (req: Request, res: Response) => {
  const { environment, clientId, clientSecret } = req.body;
  
  if (!tenantStore[environment]) {
    return res.status(404).json({ error: 'Environment not found' });
  }
  
  // Update tenant with new credentials
  tenantStore[environment] = {
    ...tenantStore[environment],
    clientId,
    clientSecret
  };
  
  res.json({ success: true });
});

app.get('/api/auth/global-type', (req: Request, res: Response) => {
  res.json({ authtype: globalAuthType });
});

app.post('/api/auth/global-type', (req: Request, res: Response) => {
  const { authtype } = req.body;
  
  if (authtype !== 'oauth' && authtype !== 'pat') {
    return res.status(400).json({ error: 'Invalid auth type' });
  }
  
  globalAuthType = authtype;
  res.json({ success: true });
});

// Environment endpoints
app.get('/api/environments', (req: Request, res: Response) => {
  const environments = Object.values(tenantStore);
  res.json(environments);
});

app.post('/api/environments', (req: Request, res: Response) => {
  const { environmentName, tenantUrl, baseUrl, authtype, clientId, clientSecret } = req.body;
  
  if (!environmentName || !tenantUrl || !baseUrl || !authtype) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  tenantStore[environmentName] = {
    name: environmentName,
    tenantName: environmentName,
    tenantUrl,
    apiUrl: baseUrl,
    authtype,
    clientId,
    clientSecret,
    active: Object.keys(tenantStore).length === 0 // First environment is active by default
  };
  
  res.json({ success: true });
});

app.delete('/api/environments/:environment', (req: Request, res: Response) => {
  const { environment } = req.params;
  
  if (!tenantStore[environment]) {
    return res.status(404).json({ success: false, error: 'Environment not found' });
  }
  
  // If this was the active environment, we need to clear the session
  if (tenantStore[environment].active) {
    req.session.activeEnvironment = null;
    
    // Find another environment to make active
    const remainingEnvironments = Object.keys(tenantStore).filter(name => name !== environment);
    if (remainingEnvironments.length > 0) {
      tenantStore[remainingEnvironments[0]].active = true;
    }
  }
  
  delete tenantStore[environment];
  delete tokenStore[environment];
  
  res.json({ success: true });
});

app.post('/api/environments/active', (req: Request, res: Response) => {
  const { environment } = req.body;
  
  if (!tenantStore[environment]) {
    return res.status(404).json({ success: false, error: 'Environment not found' });
  }
  
  // Clear active flag on all environments
  Object.values(tenantStore).forEach(tenant => {
    tenant.active = false;
  });
  
  // Set the specified environment as active
  tenantStore[environment].active = true;
  req.session.activeEnvironment = environment;
  
  res.json({ success: true });
});

// Config endpoints
app.get('/api/config', (req: Request, res: Response) => {
  // In a real implementation, load from database or file
  res.json({
    version: '1.0.0',
    settings: {
      theme: 'light',
      autoRefresh: true
    }
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  const { config } = req.body;
  // In a real implementation, save to database or file
  res.json(config);
});

// Logo endpoints
app.post('/api/logos', upload.single('logo'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    filename: req.file.filename,
    path: req.file.path
  });
});

app.get('/api/logos/:fileName/exists', (req: Request, res: Response) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, 'uploads', fileName);
  
  const exists = fs.existsSync(filePath);
  res.json(exists);
});

app.get('/api/user-data-path', (req: Request, res: Response) => {
  res.json(path.join(__dirname, 'uploads'));
});

app.get('/api/logos/:fileName', (req: Request, res: Response) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, 'uploads', fileName);
  
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

// SDK API proxy endpoint
app.post('/api/sdk/:methodName', async (req: Request, res: Response) => {
  try {
    const { methodName } = req.params;
    const { args } = req.body;
    
    // Get the active environment from the session
    const environment = req.session.activeEnvironment;
    if (!environment || !tokenStore[environment]) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const tenant = tenantStore[environment];
    const token = tokenStore[environment];
    
    // In a real implementation, you would call the SailPoint API
    const response = await callSailPointApi(methodName, args, tenant, token);
    
    res.json(response);
  } catch (error) {
    console.error(`Error calling SDK method:`, error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Serve the Angular app for all other routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Helper functions for authentication (placeholder implementations)
async function performPATAuthentication(tenant: Tenant): Promise<TokenResponse> {
  // Implement PAT authentication logic
  // This is just a placeholder
  return {
    accessToken: 'pat-token-' + Date.now()
  };
}

async function performOAuthAuthentication(tenant: Tenant): Promise<TokenResponse> {
  // Implement OAuth authentication logic
  // This is just a placeholder
  return {
    accessToken: 'oauth-token-' + Date.now(),
    refreshToken: 'refresh-token-' + Date.now()
  };
}

async function refreshPATToken(tenant: Tenant): Promise<TokenResponse> {
  // Implement PAT token refresh logic
  // This is just a placeholder
  return {
    accessToken: 'pat-token-' + Date.now()
  };
}

async function refreshOAuthToken(tenant: Tenant, refreshToken: string): Promise<TokenResponse> {
  // Implement OAuth token refresh logic
  // This is just a placeholder
  return {
    accessToken: 'oauth-token-' + Date.now(),
    refreshToken: 'refresh-token-' + Date.now()
  };
}

function decodeToken(token: string): DecodedToken {
  // In a real implementation, decode and validate the JWT token
  // This is just a placeholder
  return {
    tenant_id: 'sample-tenant',
    pod: 'sample-pod',
    org: 'sample-org',
    identity_id: 'sample-identity',
    user_name: 'sample-user',
    strong_auth: true,
    authorities: ['user'],
    client_id: 'sample-client',
    strong_auth_supported: true,
    scope: ['read', 'write'],
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: 'sample-jti'
  };
}

async function callSailPointApi(
  methodName: string, 
  args: any, 
  tenant: Tenant, 
  token: TokenData
): Promise<any> {
  // In a real implementation, you would call the SailPoint API
  // This is just a placeholder
  return {
    data: {
      result: `Mock response for ${methodName}`
    }
  };
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

export interface Connection {
  connected: boolean;
  name?: string;
}

export interface SessionStatus {
  isValid: boolean;
  needsRefresh: boolean;
  authType: string;
  expiry?: Date;
  lastChecked: Date;
}

export interface EnvironmentInfo {
  name: string;
  apiUrl: string;
  baseUrl: string;
  authType: string;
  clientId?: string;
  clientSecret?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {
  private connectedSubject = new BehaviorSubject<Connection>({ connected: false });
  private sessionStatusSubject = new BehaviorSubject<SessionStatus | null>(null);
  private currentEnvironmentSubject = new BehaviorSubject<EnvironmentInfo | null>(null);
  
  // Session monitoring
  private sessionMonitorInterval: Subscription | null = null;
  private countdownTimer: Subscription | null = null;
  private oauthSessionCheckInterval = 60000; // Check OAuth every 1 minute (more frequent for proactive refresh)
  private patSessionCheckInterval = 300000; // Check PAT every 5 minutes
  private isSessionRefreshing = false;
  private lastSessionCheck = 0;
  private sessionCheckCooldown = 10000; // Minimum 10 seconds between checks
  private isDestroyed = false;

  // Observables
  isConnected$ = this.connectedSubject.asObservable();
  sessionStatus$ = this.sessionStatusSubject.asObservable();
  currentEnvironment$ = this.currentEnvironmentSubject.asObservable();

  constructor() {
    // Start monitoring when service is created
    this.startSessionMonitoring();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.stopSessionMonitoring();
  }

  // Connection state management
  setConnectionState(isConnected: boolean, name?: string): void {
    this.connectedSubject.next({ connected: isConnected, name });
    
    if (isConnected) {
      this.startSessionMonitoring();
      // Immediately check session status when connection is established
      void this.checkSessionStatus();
    } else {
      this.stopSessionMonitoring();
      this.sessionStatusSubject.next(null);
      this.currentEnvironmentSubject.next(null);
    }
  }

  getConnectionState(): Connection {
    return this.connectedSubject.getValue();
  }

  // Environment management
  setCurrentEnvironment(environment: EnvironmentInfo): void {
    this.currentEnvironmentSubject.next(environment);
  }

  getCurrentEnvironment(): EnvironmentInfo | null {
    return this.currentEnvironmentSubject.getValue();
  }

  // Combined method to set environment and connection state
  async setConnectionWithEnvironment(environment: EnvironmentInfo, isConnected: boolean, name?: string): Promise<void> {
    console.log('Setting connection with environment:', environment.name, 'connected:', isConnected);
    
    this.setCurrentEnvironment(environment);
    this.setConnectionState(isConnected, name);
    
    if (isConnected) {
      // Stop any existing monitoring and restart with correct interval
      this.stopSessionMonitoring();
      this.startSessionMonitoring();
      
      // Immediately validate the connection tokens
      await this.validateConnectionImmediately(environment.name);
    } else {
      // Stop session monitoring when disconnected
      this.stopSessionMonitoring();
    }
  }

  private async validateConnectionImmediately(environmentName: string): Promise<void> {
    try {
      console.log('Validating connection immediately after establishment for environment:', environmentName);
      
      // Wait a moment for the connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const validationResult = await (window as any).electronAPI.validateConnectionTokens(environmentName);
      
      if (validationResult.isValid) {
        console.log('Connection validation successful immediately after establishment');
        
        // Update session status with immediate validation result
        const tokenStatus = await (window as any).electronAPI.checkEnvironmentTokenStatus(environmentName);
        const sessionStatus: SessionStatus = {
          isValid: true,
          needsRefresh: tokenStatus.needsRefresh,
          authType: validationResult.authType,
          expiry: tokenStatus.expiry,
          lastChecked: new Date()
        };
        
        this.sessionStatusSubject.next(sessionStatus);
      } else {
        console.warn('Connection validation failed immediately after establishment:', validationResult.error);
        // Don't disconnect immediately, let the regular session monitoring handle it
      }
    } catch (error) {
      console.error('Error during immediate connection validation:', error);
      // Don't disconnect immediately, let the regular session monitoring handle it
    }
  }

  // Session status management
  getSessionStatus(): SessionStatus | null {
    return this.sessionStatusSubject.getValue();
  }

  // Session monitoring methods
  private startSessionMonitoring(): void {
    if (this.sessionMonitorInterval || this.isDestroyed) {
      return;
    }

    const environment = this.getCurrentEnvironment();
    const authType = environment?.authType || 'pat';
    const checkInterval = authType === 'oauth' ? this.oauthSessionCheckInterval : this.patSessionCheckInterval;
    
    console.log(`Starting session monitoring for ${authType.toUpperCase()} with ${checkInterval / 1000}s interval...`);
    
    this.sessionMonitorInterval = interval(checkInterval)
      .pipe(takeWhile(() => !this.isDestroyed))
      .subscribe(() => {
        void this.checkSessionStatus();
      });

    // Start countdown timer for real-time expiry display
    this.startCountdownTimer();
  }

  private updateSessionMonitoringInterval(): void {
    const environment = this.getCurrentEnvironment();
    if (!environment) {
      return;
    }

    const authType = environment.authType;
    const currentInterval = this.sessionMonitorInterval ? 
      (authType === 'oauth' ? this.oauthSessionCheckInterval : this.patSessionCheckInterval) : null;
    
    if (currentInterval !== null) {
      console.log(`Updating session monitoring interval for ${authType.toUpperCase()} to ${currentInterval / 1000}s`);
      this.stopSessionMonitoring();
      this.startSessionMonitoring();
    }
  }

  private stopSessionMonitoring(): void {
    if (this.sessionMonitorInterval) {
      console.log('Stopping session monitoring...');
      this.sessionMonitorInterval.unsubscribe();
      this.sessionMonitorInterval = null;
    }
    
    this.stopCountdownTimer();
    this.sessionStatusSubject.next(null);
    this.isSessionRefreshing = false;
  }

  private startCountdownTimer(): void {
    if (this.countdownTimer) {
      this.stopCountdownTimer();
    }
    
    // Start immediately and then every second
    this.countdownTimer = interval(1000)
      .pipe(takeWhile(() => !this.isDestroyed))
      .subscribe(() => {
        // Force change detection for the session status
        const currentStatus = this.sessionStatusSubject.getValue();
        if (currentStatus) {
          this.sessionStatusSubject.next({ ...currentStatus });
        }
      });
    
    // Trigger initial update
    const currentStatus = this.sessionStatusSubject.getValue();
    if (currentStatus) {
      this.sessionStatusSubject.next({ ...currentStatus });
    }
  }

  private stopCountdownTimer(): void {
    if (this.countdownTimer) {
      this.countdownTimer.unsubscribe();
      this.countdownTimer = null;
    }
  }

  private async checkSessionStatus(): Promise<void> {
    // Prevent multiple simultaneous checks
    const now = Date.now();
    if (now - this.lastSessionCheck < this.sessionCheckCooldown) {
      return;
    }
    this.lastSessionCheck = now;

    const connection = this.getConnectionState();
    const environment = this.getCurrentEnvironment();
    
    if (!connection.connected || !environment || this.isSessionRefreshing) {
      return;
    }

    const authType = environment.authType;
    const checkInterval = authType === 'oauth' ? this.oauthSessionCheckInterval : this.patSessionCheckInterval;
    
    try {
      console.log(`Checking session status for ${authType.toUpperCase()} environment: ${environment.name} (interval: ${checkInterval / 1000}s)`);
      
      // Use the enhanced validation function that tests against the API
      const validationResult = await (window as any).electronAPI.validateConnectionTokens(environment.name);
      
      // Also get the token status for additional information
      const tokenStatus = await (window as any).electronAPI.checkEnvironmentTokenStatus(environment.name);
      
      const sessionStatus: SessionStatus = {
        isValid: validationResult.isValid,
        needsRefresh: tokenStatus.needsRefresh,
        authType: validationResult.authType,
        expiry: tokenStatus.expiry,
        lastChecked: new Date()
      };

      console.log('Session status updated:', sessionStatus);
      console.log('Validation result:', validationResult);
      console.log('Token status:', tokenStatus);
      this.sessionStatusSubject.next(sessionStatus);

      // Handle session issues based on API validation
      if (!validationResult.isValid) {
        console.log('Session validation failed:', validationResult.error);
        if (tokenStatus.needsRefresh) {
          console.log('Token needs refresh, attempting automatic refresh...');
          await this.handleSessionRefresh();
        } else {
          console.log('Token is invalid but does not need refresh, handling as expired...');
          await this.handleSessionExpired();
        }
      } else {
        console.log('Session validation successful');
      }
    } catch (error) {
      console.error('Error checking session status:', error);
      // If we can't check the session, assume it's expired and try to reconnect
      await this.handleSessionExpired();
    }
  }

  private async handleSessionRefresh(): Promise<void> {
    if (this.isSessionRefreshing) {
      return;
    }

    this.isSessionRefreshing = true;
    console.log('Session needs refresh, attempting to refresh...');

    try {
      const environment = this.getCurrentEnvironment();
      if (!environment) {
        throw new Error('No environment available for refresh');
      }

      if (environment.authType === 'oauth') {
        // For OAuth, we need to get the stored refresh token and refresh
        const tokenStatus = await (window as any).electronAPI.checkEnvironmentTokenStatus(environment.name);
        if (tokenStatus.needsRefresh) {
          // Try to refresh OAuth token using the stored refresh token
          try {
            const storedTokens = await (window as any).electronAPI.getStoredOAuthTokens(environment.name);
            if (storedTokens && storedTokens.refreshToken) {
              console.log('Attempting OAuth token refresh with Lambda...');
              await (window as any).electronAPI.refreshOAuthToken(environment.name, storedTokens.refreshToken);
              console.log('OAuth session refreshed successfully');
              
              // Force a session status check after successful refresh
              this.lastSessionCheck = 0; // Reset the cooldown to allow immediate check
              await this.checkSessionStatus();
            } else {
              console.log('No refresh token available, falling back to reconnection');
              await this.reconnectSession();
            }
          } catch (refreshError) {
            console.error('OAuth refresh failed:', refreshError);
            // Only fall back to reconnection if the refresh token itself is invalid
            const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
            if (errorMessage.includes('refresh token')) {
              console.log('Refresh token is invalid, falling back to reconnection');
              await this.reconnectSession();
            } else {
              // For other errors (network, API issues), throw the error to be handled by the caller
              throw refreshError;
            }
          }
        }
      } else {
        // For PAT, refresh the token
        await (window as any).electronAPI.refreshPATToken(environment.name);
        console.log('PAT session refreshed successfully');
        
        // Force a session status check after successful refresh
        this.lastSessionCheck = 0; // Reset the cooldown to allow immediate check
        await this.checkSessionStatus();
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      await this.handleSessionExpired();
    } finally {
      this.isSessionRefreshing = false;
    }
  }

  private async handleSessionExpired(): Promise<void> {
    console.log('Session expired, attempting to reconnect...');
    
    // Update connection state
    this.setConnectionState(false);
    
    // Try to reconnect
    await this.reconnectSession();
  }

  private async reconnectSession(): Promise<void> {
    const environment = this.getCurrentEnvironment();
    if (!environment) {
      console.error('No environment available for reconnection');
      return;
    }

    try {
      console.log('Attempting to reconnect session...');
      
      // Use the unified login to reconnect
      const loginRequest = {
        environment: environment.name,
        apiUrl: environment.apiUrl,
        baseUrl: environment.baseUrl,
        authType: environment.authType as 'oauth' | 'pat',
        clientId: environment.clientId,
        clientSecret: environment.clientSecret,
        tenant: environment.name
      };

      const loginResult = await (window as any).electronAPI.unifiedLogin(loginRequest);
      
      if (loginResult.success && loginResult.connected) {
        await this.setConnectionWithEnvironment(environment, true, (loginResult.name as string || environment.name));
        console.log('Successfully reconnected to the environment');
      } else {
        console.error('Failed to reconnect:', loginResult.error);
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  // Public method for manual session refresh
  async manualRefreshSession(): Promise<void> {
    const connection = this.getConnectionState();
    const environment = this.getCurrentEnvironment();
    
    console.log('manualRefreshSession called');
    console.log('Connection state:', connection);
    console.log('Environment:', environment);
    
    if (!connection.connected || !environment) {
      throw new Error('No active session to refresh');
    }

    if (this.isSessionRefreshing) {
      console.log('Session refresh already in progress');
      return;
    }

    this.isSessionRefreshing = true;
    console.log('Starting manual session refresh for environment:', environment.name, 'with auth type:', environment.authType);

    try {
      if (environment.authType === 'oauth') {
        // For OAuth, get stored tokens and refresh
        console.log('Refreshing OAuth tokens...');
        const storedTokens = await (window as any).electronAPI.getStoredOAuthTokens(environment.name);
        console.log('Stored OAuth tokens:', storedTokens ? 'found' : 'not found');
        
        if (storedTokens && storedTokens.refreshToken) {
          console.log('Calling refreshOAuthToken with Lambda...');
          try {
            await (window as any).electronAPI.refreshOAuthToken(environment.name, storedTokens.refreshToken);
            console.log('OAuth session refreshed successfully');
          } catch (refreshError) {
            console.log('OAuth refresh failed:', refreshError);
            const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
            if (errorMessage.includes('refresh token')) {
              console.log('Refresh token is invalid, falling back to reconnection');
              await this.reconnectSession();
              return; // Exit early since reconnection handles the rest
            } else {
              // For other errors, re-throw to be handled by the caller
              throw refreshError;
            }
          }
        } else {
          throw new Error('No refresh token available for OAuth refresh');
        }
      } else {
        // For PAT, refresh the token
        console.log('Refreshing PAT token...');
        await (window as any).electronAPI.refreshPATToken(environment.name);
        console.log('PAT session refreshed successfully');
      }

      // Force a session status check after refresh
      this.lastSessionCheck = 0; // Reset the cooldown to allow immediate check
      await this.checkSessionStatus();
      console.log('Manual session refresh completed');
    } catch (error) {
      console.error('Manual session refresh failed:', error);
      throw error;
    } finally {
      this.isSessionRefreshing = false;
    }
  }

  // Utility methods for components
  get isSessionValid(): boolean {
    const status = this.getSessionStatus();
    return status?.isValid ?? false;
  }

  get sessionExpiryTime(): string | null {
    const status = this.getSessionStatus();
    if (!status?.expiry) {
      return null;
    }
    return status.expiry.toLocaleTimeString();
  }

  get timeUntilExpiry(): string | null {
    const status = this.getSessionStatus();
    if (!status) {
      return null;
    }
    
    // For PAT tokens, they don't have expiry times, so show a different status
    if (status.authType === 'pat') {
      return status.isValid ? 'Valid' : 'Invalid';
    }
    
    // For OAuth tokens, calculate time until expiry
    if (!status.expiry) {
      return null;
    }
    
    const now = new Date();
    const timeDiff = status.expiry.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Expired';
    }
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  get sessionStatusDisplay(): string {
    const status = this.getSessionStatus();
    console.log('sessionStatusDisplay called with status:', status);
    
    if (!status) {
      console.log('No session status, returning "Checking..."');
      return 'Checking...';
    }
    
    if (status.authType === 'pat') {
      const result = status.isValid ? 'Valid' : 'Invalid';
      console.log('PAT token status:', result);
      return result;
    }
    
    // For OAuth tokens, show time until expiry or status
    if (!status.expiry) {
      console.log('OAuth token has no expiry, returning "Checking..."');
      return 'Checking...';
    }
    
    const now = new Date();
    const timeDiff = status.expiry.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      console.log('OAuth token expired');
      return 'Expired';
    }
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    const result = `${minutes}m ${seconds}s`;
    console.log('OAuth token time until expiry:', result);
    
    return result;
  }

  get isRefreshing(): boolean {
    return this.isSessionRefreshing;
  }

  // Public methods for monitoring configuration
  getCurrentMonitoringInterval(): number {
    const environment = this.getCurrentEnvironment();
    const authType = environment?.authType || 'pat';
    return authType === 'oauth' ? this.oauthSessionCheckInterval : this.patSessionCheckInterval;
  }

  getMonitoringIntervalSeconds(): number {
    return this.getCurrentMonitoringInterval() / 1000;
  }

  restartMonitoringWithCorrectInterval(): void {
    if (this.getConnectionState().connected) {
      console.log('Restarting session monitoring with correct interval...');
      this.stopSessionMonitoring();
      this.startSessionMonitoring();
    }
  }

  // Test method for debugging refresh functionality
  async testRefreshFunctionality(): Promise<void> {
    const connection = this.getConnectionState();
    const environment = this.getCurrentEnvironment();
    
    if (!connection.connected || !environment) {
      console.log('No active connection to test refresh');
      return;
    }

    console.log('Testing refresh functionality for environment:', environment.name);
    
    try {
      const storedTokens = await (window as any).electronAPI.getStoredOAuthTokens(environment.name);
      if (storedTokens && storedTokens.refreshToken) {
        console.log('Found stored refresh token, testing refresh...');
        await this.manualRefreshSession();
        console.log('Refresh test completed successfully');
      } else {
        console.log('No stored refresh token found for testing');
      }
    } catch (error) {
      console.error('Refresh test failed:', error);
    }
  }
}

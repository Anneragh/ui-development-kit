import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { takeWhile, map } from 'rxjs/operators';

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
  
  private isSessionRefreshing = false;
  private isDestroyed = false;

  isConnected$ = this.connectedSubject.asObservable();
  sessionStatus$ = this.sessionStatusSubject.asObservable();
  currentEnvironment$ = this.currentEnvironmentSubject.asObservable();

  countdown$ = interval(1000).pipe(
    takeWhile(() => !this.isDestroyed),
    map(() => this.getSessionStatus())
  );

  constructor() {
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
  }

  setConnectionState(isConnected: boolean, name?: string): void {
    this.connectedSubject.next({ connected: isConnected, name });
    
    if (!isConnected) {
      this.sessionStatusSubject.next(null);
      this.currentEnvironmentSubject.next(null);
    }
  }

  getConnectionState(): Connection {
    return this.connectedSubject.getValue();
  }

  setCurrentEnvironment(environment: EnvironmentInfo): void {
    this.currentEnvironmentSubject.next(environment);
  }

  getCurrentEnvironment(): EnvironmentInfo | null {
    return this.currentEnvironmentSubject.getValue();
  }

  async setConnectionWithEnvironment(environment: EnvironmentInfo, isConnected: boolean, name?: string): Promise<void> {
    
    this.setCurrentEnvironment(environment);
    this.setConnectionState(isConnected, name);
    
    if (isConnected) {
      await this.validateConnectionImmediately(environment.name);
    }
  }

  private async validateConnectionImmediately(environmentName: string): Promise<void> {
    try {
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use the lightweight token status check to avoid double validation
      const tokenStatus = await (window as any).electronAPI.checkEnvironmentTokenStatus(environmentName);
      
      const sessionStatus: SessionStatus = {
        isValid: tokenStatus.hasValidTokens,
        needsRefresh: tokenStatus.needsRefresh,
        authType: tokenStatus.authType,
        expiry: tokenStatus.expiry,
        lastChecked: new Date()
      };
      
      this.sessionStatusSubject.next(sessionStatus);
      
      if (!tokenStatus.hasValidTokens) {
        console.warn('Connection validation failed immediately after establishment');
      }
    } catch (error) {
      console.error('Error during immediate connection validation:', error);
      const sessionStatus: SessionStatus = {
        isValid: false,
        needsRefresh: false,
        authType: 'unknown',
        lastChecked: new Date()
      };
      this.sessionStatusSubject.next(sessionStatus);
    }
  }

  getSessionStatus(): SessionStatus | null {
    return this.sessionStatusSubject.getValue();
  }

  /**
   * Handles session refresh for both OAuth and PAT tokens
   */
  private async handleSessionRefresh(): Promise<void> {
    if (this.isSessionRefreshing) {
      return;
    }

    this.isSessionRefreshing = true;

    try {
      const environment = this.getCurrentEnvironment();
      if (!environment) {
        throw new Error('No environment available for refresh');
      }

      await (window as any).electronAPI.refreshTokens(environment.name);
      await this.validateTokensAfterRefresh(environment.name);
    } catch (error) {
      console.error('Session refresh failed:', error);
      await this.handleSessionExpired();
    } finally {
      this.isSessionRefreshing = false;
    }
  }



  /**
   * Validates tokens after a refresh operation
   * @param environmentName - The environment name to validate tokens for
   */
  private async validateTokensAfterRefresh(environmentName: string): Promise<void> {
    try {
      // Use the lightweight token status check to avoid double validation
      const tokenStatus = await (window as any).electronAPI.checkEnvironmentTokenStatus(environmentName);
      
      const sessionStatus: SessionStatus = {
        isValid: tokenStatus.hasValidTokens,
        needsRefresh: tokenStatus.needsRefresh,
        authType: tokenStatus.authType,
        expiry: tokenStatus.expiry,
        lastChecked: new Date()
      };

      this.sessionStatusSubject.next(sessionStatus);
      
      if (!tokenStatus.hasValidTokens) {
        await this.handleSessionExpired();
      }
    } catch (error) {
      console.error('Error validating tokens after refresh:', error);
      await this.handleSessionExpired();
    }
  }

  private async handleSessionExpired(): Promise<void> {
    
    this.setConnectionState(false);
    
    await this.reconnectSession();
  }

  private async reconnectSession(): Promise<void> {
    const environment = this.getCurrentEnvironment();
    if (!environment) {
      console.error('No environment available for reconnection');
      return;
    }

    try {
      
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
    
    
    if (!connection.connected || !environment) {
      throw new Error('No active session to refresh');
    }

    if (this.isSessionRefreshing) {
      return;
    }

    this.isSessionRefreshing = true;

    try {
      await (window as any).electronAPI.refreshTokens(environment.name);
      await this.validateTokensAfterRefresh(environment.name);
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

    if (!status.expiry) {
      return null;
    }

    const now = new Date();
    const timeDiff = status.expiry.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  get sessionStatusDisplay(): string {
    const status = this.getSessionStatus();

    if (!status) {
      return 'Checking...';
    }

    if (!status.expiry) {
      return 'Checking...';
    }

    const timeUntilExpiry = this.timeUntilExpiry || 'Checking...';

    if (timeUntilExpiry === 'Expired') {
      return 'Expired';
    }

    return timeUntilExpiry;
  }

  get isRefreshing(): boolean {
    return this.isSessionRefreshing;
  }

  // Public methods for monitoring configuration
  getCurrentMonitoringInterval(): number {
    return 0; // No periodic monitoring
  }

  getMonitoringIntervalSeconds(): number {
    return 0; // No periodic monitoring
  }

  restartMonitoringWithCorrectInterval(): void {
    // No periodic monitoring needed
  }

  // Test method for debugging refresh functionality
  async testRefreshFunctionality(): Promise<void> {
    const connection = this.getConnectionState();
    const environment = this.getCurrentEnvironment();
    
    if (!connection.connected || !environment) {
      return;
    }

    try {
      if (environment.authType === 'oauth') {
        const storedTokens = await (window as any).electronAPI.getStoredOAuthTokens(environment.name);
        if (storedTokens && storedTokens.refreshToken) {
          await this.manualRefreshSession();
        }
      } else if (environment.authType === 'pat') {
        const storedTokens = await (window as any).electronAPI.getStoredPATTokens(environment.name);
        if (storedTokens && storedTokens.accessToken) {
          await this.manualRefreshSession();
        }
      }
    } catch (error) {
      console.error('Refresh test failed:', error);
    }
  }
}

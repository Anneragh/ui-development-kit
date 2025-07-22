import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Connection = {
  connected: boolean;
  name?: string;
}

export type AuthMethods = "oauth" | "pat";

export type SessionStatus = {
  isValid: boolean;
  needsRefresh: boolean;
  authType?: AuthMethods;
  expiry?: Date;
  lastChecked: Date;
}

export type EnvironmentInfo = {
  name: string;
  apiUrl: string;
  baseUrl: string;
  authType: AuthMethods;
  clientId?: string;
  clientSecret?: string;
}

@Injectable({
  providedIn: 'root'
})

export class ConnectionService implements OnDestroy {
  connectedSubject$ = new BehaviorSubject<Connection>({ connected: false });
  sessionStatusSubject$ = new BehaviorSubject<SessionStatus | undefined>(undefined);
  currentEnvironmentSubject$ = new BehaviorSubject<EnvironmentInfo | undefined>(undefined);

  isSessionRefreshing = false;
  isDestroyed = false;

  isConnected$ = this.connectedSubject$.asObservable();
  sessionStatus$ = this.sessionStatusSubject$.asObservable();
  currentEnvironment$ = this.currentEnvironmentSubject$.asObservable();

  constructor() {
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
  }

  async validateConnectionImmediately(environmentName: string): Promise<void> {
    try {

      // This timeout is needed to avoid a race condition that can occur between this service and the data being checked on the backend.
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use the lightweight token status check to avoid double validation
      const tokenStatus = await window.electronAPI.checkAccessTokenStatus(environmentName);

      console.log('tokenStatus', tokenStatus);

      const sessionStatus: SessionStatus = {
        isValid: tokenStatus.accessTokenIsValid,
        needsRefresh: tokenStatus.needsRefresh,
        authType: tokenStatus.authType,
        expiry: tokenStatus.expiry,
        lastChecked: new Date()
      };

      console.log('sessionStatus', sessionStatus);

      this.sessionStatusSubject$.next(sessionStatus);

      if (!tokenStatus.accessTokenIsValid) {
        console.warn('Connection validation failed immediately after establishment');
      }
    } catch (error) {
      console.error('Error during immediate connection validation:', error);
      const sessionStatus: SessionStatus = {
        isValid: false,
        needsRefresh: false,
        authType: undefined,
        lastChecked: new Date()
      };
      this.sessionStatusSubject$.next(sessionStatus);
    }
  }

  /**
   * Handles session refresh for both OAuth and PAT tokens
   */
  async handleSessionRefresh(): Promise<void> {
    if (this.isSessionRefreshing) {
      return;
    }

    this.isSessionRefreshing = true;

    try {
      const environment = this.currentEnvironmentSubject$.value;
      if (!environment) {
        throw new Error('No environment available for refresh');
      }

      await window.electronAPI.refreshTokens(environment.name);
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
  async validateTokensAfterRefresh(environmentName: string): Promise<void> {
    try {
      // Use the lightweight token status check to avoid double validation
      const tokenStatus = await window.electronAPI.checkAccessTokenStatus(environmentName);

      const sessionStatus: SessionStatus = {
        isValid: tokenStatus.accessTokenIsValid,
        needsRefresh: tokenStatus.needsRefresh,
        authType: tokenStatus.authType,
        expiry: tokenStatus.expiry,
        lastChecked: new Date()
      };

      this.sessionStatusSubject$.next(sessionStatus);

      if (!tokenStatus.accessTokenIsValid) {
        await this.handleSessionExpired();
      }
    } catch (error) {
      console.error('Error validating tokens after refresh:', error);
      await this.handleSessionExpired();
    }
  }

  async handleSessionExpired(): Promise<void> {
    this.connectedSubject$.next({ connected: false });
    await this.reconnectSession();
  }

  async reconnectSession(): Promise<void> {
    const environment = this.currentEnvironmentSubject$.value;
    if (!environment) {
      console.error('No environment available for reconnection');
      return;
    }

    try {
      const loginResult = await window.electronAPI.unifiedLogin(environment.name);
      if (loginResult.success) {
        this.connectedSubject$.next({ connected: true, name: environment.name });
        await this.validateConnectionImmediately(environment.name);
      } else {
        console.error('Failed to reconnect:', loginResult.error);
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  // Public method for manual session refresh
  async manualRefreshSession(): Promise<void> {
    const environment = this.currentEnvironmentSubject$.value;

    if (!environment) {
      throw new Error('No active session to refresh');
    }

    if (this.isSessionRefreshing) {
      return;
    }

    this.isSessionRefreshing = true;

    try {
      const refreshResult = await window.electronAPI.refreshTokens(environment.name);
      if (!refreshResult.success) {
        throw new Error('Failed to refresh tokens');
      }
      await this.validateTokensAfterRefresh(environment.name);
      console.log('Tokens validated successfully');
      const loginResult = await window.electronAPI.unifiedLogin(environment.name);
      if (loginResult.success) {
        this.connectedSubject$.next({ connected: true, name: environment.name });
        await this.validateConnectionImmediately(environment.name);
      } else {
        console.error('Failed to reconnect:', loginResult.error);
      }
    } catch (error) {
      console.error('Manual session refresh failed:', error);
      throw error;
    } finally {
      this.isSessionRefreshing = false;
    }
  }

  // Utility methods for components
  get isSessionValid(): boolean {
    const status = this.sessionStatusSubject$.value;
    return status?.isValid ?? false;
  }

  get sessionExpiryDate(): Date | undefined {
    const status = this.sessionStatusSubject$.value;
    return status?.expiry;
  }

  get sessionExpiryTime(): string | undefined {
    const status = this.sessionStatusSubject$.value;
    if (!status?.expiry) {
      return undefined;
    }
    return status.expiry.toLocaleTimeString();
  }
}

import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export type AuthEvent = {
  success: boolean;
  message?: string;
  username?: string;
};

@Component({
  selector: 'app-web-auth',
  templateUrl: './web-auth.component.html',
  styleUrls: ['./web-auth.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class WebAuthComponent implements OnInit {
  @Output() authEvent = new EventEmitter<AuthEvent>();
  
  isLoading = false;
  isAuthenticated = false;
  username = '';
  errorMessage = '';

  constructor(private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    // Check if we're handling an OAuth callback
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('success')) {
      this.checkLoginStatus();
    } else if (queryParams.has('error')) {
      const error = queryParams.get('message') || 'Authentication failed';
      this.showError(error);
    }
  }

  async authenticate(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Call the server's authentication endpoint
      console.log('Calling auth endpoint...');
      const response = await fetch('/api/auth/web-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Important for session cookies
      });
      
      const result = await response.json();
      console.log('Auth response:', result);
      
      if (result.success && result.authUrl) {
        console.log('Redirecting to:', result.authUrl);
        // Try window.open instead of window.location.href
        window.open(result.authUrl, '_blank');
        
        // Also keep the original redirect as a backup with a slight delay
        setTimeout(() => {
          console.log('Fallback redirect executing...');
          window.location.href = result.authUrl;
        }, 100);
      } else {
        console.error('Authentication failed, missing success or authUrl:', result);
        this.showError('Failed to initiate authentication');
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showError('Failed to connect to authentication service');
      this.isLoading = false;
    }
  }

  async checkLoginStatus(): Promise<void> {
    try {
      const response = await fetch('/api/auth/login-status', {
        credentials: 'include' // Important for session cookies
      });
      
      const status = await response.json();
      
      if (status.isLoggedIn) {
        this.isAuthenticated = true;
        this.username = status.username || 'User';
        this.authEvent.emit({
          success: true,
          username: this.username
        });
        this.showSuccess(`Successfully authenticated as ${this.username}`);
      } else {
        this.isAuthenticated = false;
        // Don't show error for initial check
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      this.isAuthenticated = false;
    }
  }

  async logout(): Promise<void> {
    this.isLoading = true;
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      this.isAuthenticated = false;
      this.username = '';
      this.authEvent.emit({
        success: false
      });
      this.showSuccess('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      this.showError('Failed to logout');
    } finally {
      this.isLoading = false;
    }
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }
}
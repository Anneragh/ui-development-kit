import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConnectionService, EnvironmentInfo } from '../shared/connection.service';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { GenericDialogComponent, DialogData } from '../../../projects/sailpoint-components/src/lib/generic-dialog/generic-dialog.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';

interface Tenant {
  active: boolean;
  apiUrl: string;
  tenantUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  name: string;
  authType: "oauth" | "pat";
  tenantName: string;
}

interface EnvironmentConfig {
  environmentName: string;
  tempTenantName?: string; // Only used during creation to auto-generate URLs
  tenantUrl: string;
  baseUrl: string;
  authType: 'oauth' | 'pat';
  clientId?: string;
  clientSecret?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatRadioModule,
    MatSnackBarModule,
    FormsModule,
    SharedModule
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  // Connection state
  isConnected = false;
  loading = false;
  dialogRef: MatDialogRef<GenericDialogComponent> | null = null;
  private configConnectionSubscription: Subscription | null = null;

  // Environment management
  tenants: Array<Tenant> = [];
  selectedTenant: string = 'new';
  actualTenant: Tenant | undefined = undefined;
  name: string = '';

  // Environment configuration - unified with connection
  globalAuthMethod: "oauth" | "pat" = 'pat';
  showEnvironmentDetails = false;
  oauthValidationStatus: 'unknown' | 'valid' | 'invalid' | 'testing' = 'unknown';
  
  config: EnvironmentConfig = {
    environmentName: '',
    tenantUrl: '',
    baseUrl: '',
    authType: 'pat'
  };

  constructor(
    private router: Router, 
    private connectionService: ConnectionService, 
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.configConnectionSubscription = this.connectionService.isConnected$.subscribe(connection => {
      this.isConnected = connection.connected;
      this.name = connection.name || '';
    });
    
    // Initialize environment data and global auth method
    void this.loadTenants();
    void this.initializeGlobalAuthMethod();
  }

  ngOnDestroy(): void {
    if (this.configConnectionSubscription) {
      this.configConnectionSubscription.unsubscribe();
      this.configConnectionSubscription = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', () => {});
  }

  private async loadTenants() {
    try {
      console.log('Loading tenants');
      this.tenants = await window.electronAPI.getTenants();
      console.log('Tenants loaded:', this.tenants);
      
      // Set the selected tenant to the active one, or default to 'new' if none are active
      const activeTenant = this.tenants.find(tenant => tenant.active === true);
      if (activeTenant) {
        this.selectedTenant = activeTenant.name;
        this.actualTenant = activeTenant;
        // Ensure we have the latest auth type for the active tenant
        this.refreshCurrentTenantAuthType();
        // Load the environment configuration immediately
        this.loadEnvironmentForEditing(activeTenant);
      } else {
        this.selectedTenant = 'new';
        // Reset to default config for new environment
        this.resetConfig();
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      this.showError('Failed to load environments');
    }
  }

  // Connection methods
  get authMethodDescription(): string {
    if (!this.actualTenant) return '';
    return this.actualTenant.authType === 'oauth' ? 'OAuth Browser Authentication' : 'Personal Access Token (PAT)';
  }

  get isOAuthMode(): boolean {
    return this.actualTenant?.authType === 'oauth';
  }

  async updateTenant(): Promise<void> {
    if (this.selectedTenant === 'new') {
      this.actualTenant = undefined;
      // Reset to default config for new environment
      await this.resetConfig();
      return;
    }

    // Find the selected tenant
    this.actualTenant = this.tenants.find(tenant => tenant.name === this.selectedTenant);
    console.log(`Selected tenant:`, this.actualTenant);
    
    // Set the selected environment as active if it exists
    if (this.actualTenant) {
      await this.setActiveEnvironment(this.actualTenant.name);
      // Refresh tenant data to ensure we have the latest auth type
      await this.refreshCurrentTenantAuthType();
      
      // Auto-adjust auth method based on available credentials
      await this.autoAdjustAuthMethod();
      
      // Always load the selected environment's configuration
      this.loadEnvironmentForEditing(this.actualTenant);
    }
  }

  async refreshCurrentTenantAuthType(): Promise<void> {
    try {
      // Get the latest global auth type
      const currentAuthType = await window.electronAPI.getGlobalAuthType();
      
      // Update the current tenant's auth type
      if (this.actualTenant) {
        this.actualTenant.authType = currentAuthType;
        console.log(`Updated auth type for ${this.actualTenant.name}: ${currentAuthType}`);
      }
      
      // Also update it in the tenants array
      const tenantIndex = this.tenants.findIndex(t => t.name === this.selectedTenant);
      if (tenantIndex !== -1) {
        this.tenants[tenantIndex].authType = currentAuthType;
      }
    } catch (error) {
      console.error('Error refreshing auth type:', error);
    }
  }

  async setActiveEnvironment(environmentName: string): Promise<void> {
    try {
      const result = await window.electronAPI.setActiveEnvironment(environmentName);
      if (result.success) {
        console.log(`Successfully set ${environmentName} as active environment`);
      } else {
        console.error('Failed to set active environment:', result.error);
        this.openErrorDialog(String(result.error || 'Failed to set active environment'), 'Environment Error');
      }
    } catch (error) {
      console.error('Error setting active environment:', error);
      this.openErrorDialog('Failed to set active environment', 'Environment Error');
    }
  }

  async connectToISC() {
    // Check if "new" is selected, which means no environment is chosen
    if (this.selectedTenant === 'new') {
      this.openErrorDialog('Please select an environment or create a new one first', 'No Environment Selected');
      return;
    }

    if (!this.actualTenant) {
      this.openErrorDialog('No environment selected', 'Connection Error');
      return;
    }

    console.log('Connecting to:', this.actualTenant.name, 'at', this.actualTenant.apiUrl);
    console.log('Authentication type:', this.actualTenant.authType);
    
    try {
      // Check if we have valid tokens first
      console.log("Validating tokens")
      const tokenStatus = await window.electronAPI.validateTokens(this.actualTenant.name);
      
      // Use the unified login function for both OAuth and PAT
      const loginRequest = {
        environment: this.actualTenant.name,
        apiUrl: this.actualTenant.apiUrl,
        baseUrl: this.actualTenant.tenantUrl,
        authType: this.actualTenant.authType as 'oauth' | 'pat',
        clientId: this.actualTenant.clientId || undefined,
        clientSecret: this.actualTenant.clientSecret || undefined,
        tenant: this.actualTenant.name // For OAuth flow
      };

      // I don't think we need to set them here, they should already be set by creating the environment
      // await window.electronAPI.storeClientCredentials(this.actualTenant.name, this.actualTenant.clientId || '', this.actualTenant.clientSecret || '');


      // TODO: Swap this to use the snackbar
      // Show loading dialog with appropriate message based on token status
      // const dialogData: DialogData = {
      //   title: `${this.actualTenant.authType.toUpperCase()} Authentication`,
      //   message: tokenStatus.isValid 
      //     ? 'Connecting with existing tokens...' 
      //     : `Initiating ${this.actualTenant.authType} authentication...`,
      //   showSpinner: true,
      //   showCancel: false,
      //   disableClose: true
      // };

      // const dialogRef = this.dialog.open(GenericDialogComponent, {
      //   data: dialogData,
      //   width: '400px',
      //   disableClose: true
      // });

      try {
        // Perform unified login
        const loginResult = await window.electronAPI.unifiedLogin(this.actualTenant.name);
        
        if (loginResult.success) {

          // TODO: Swap this to use the snackbar
          // Update dialog to show success
          // dialogData.title = 'Connection Successful';
          // dialogData.message = `Successfully connected to ${this.actualTenant.name} using ${this.actualTenant.authType.toUpperCase()}!`;
          // dialogData.showSpinner = false;
          // dialogData.showCancel = false;
          
          // Set current environment in connection service
          const environmentInfo: EnvironmentInfo = {
            name: this.actualTenant.name,
            apiUrl: this.actualTenant.apiUrl,
            baseUrl: this.actualTenant.tenantUrl,
            authType: this.actualTenant.authType,
            clientId: this.actualTenant.clientId || undefined,
            clientSecret: this.actualTenant.clientSecret || undefined
          };
          
          // Use combined method to set environment and connection state
          await this.connectionService.setConnectionWithEnvironment(environmentInfo, true, this.actualTenant.name);
          
          this.isConnected = true;
          this.name = this.actualTenant.name;
          
          // Auto-close dialog after 1 second for existing tokens, 2 seconds for new auth
          const closeDelay = tokenStatus.isValid ? 1000 : 2000;
          // setTimeout(() => {
          // dialogRef.close();
          // }, closeDelay);
        } else {
          // TODO: Swap this to use the snackbar
          // Update dialog to show error
          // dialogData.title = 'Connection Failed';
          // dialogData.message = (loginResult.error as string) || `Failed to connect using ${this.actualTenant.authType.toUpperCase()}`;
          // dialogData.showSpinner = false;
          // dialogData.showCancel = true;
        }
      } catch (error) {
        console.error('Unified login failed:', error);
        
        // TODO: Swap this to use the snackbar
        // Update dialog to show error
        // dialogData.title = 'Authentication Error';
        // dialogData.message = `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        // dialogData.showSpinner = false;
        // dialogData.showCancel = true;
        
        throw error;
      }
    } catch (error) {
      console.error('Error connecting to ISC:', error);
      this.openErrorDialog('Failed to connect to the environment. Please check your configuration and try again.', 'Connection Failed');
    }
  }

  async disconnectFromISC() {
    await window.electronAPI.disconnectFromISC();
    this.isConnected = false;
    this.connectionService.setConnectionState(false);
  }

  // Environment configuration methods
  async initializeGlobalAuthMethod() {
    try {
      this.globalAuthMethod = await window.electronAPI.getGlobalAuthType();
    } catch (error) {
      console.error('Error loading global auth method:', error);
      this.globalAuthMethod = 'pat'; // Default fallback
    }
  }

  async onGlobalAuthMethodChange() {
    try {
      await window.electronAPI.setGlobalAuthType(this.globalAuthMethod);
      console.log('Global auth method updated to:', this.globalAuthMethod);
      // Update the config to match the new global auth method
      this.config.authType = this.globalAuthMethod as 'oauth' | 'pat';
      
      // If we have an environment selected, refresh its auth type as well
      if (this.actualTenant) {
        await this.refreshCurrentTenantAuthType();
      }
    } catch (error) {
      console.error('Error updating global auth method:', error);
    }
  }

  onConfigAuthTypeChange() {
    console.log('Config auth type changed to:', this.config.authType);
    
    // Clear client credentials if switching to OAuth
    if (this.config.authType === 'oauth') {
      this.config.clientId = undefined;
      this.config.clientSecret = undefined;
    }
    
    // Trigger OAuth validation if switching to OAuth and base URL is set
    if (this.config.authType === 'oauth' && this.config.baseUrl) {
      void this.validateOAuthEndpoint();
    }
  }

  toggleEnvironmentDetails(): void {
    this.showEnvironmentDetails = !this.showEnvironmentDetails;
    if (this.showEnvironmentDetails) {
      if (this.actualTenant) {
        // Load the current environment details for editing
        this.loadEnvironmentForEditing(this.actualTenant);
      } else if (this.selectedTenant === 'new') {
        // Reset to default config for new environment
        void this.resetConfig();
      }
    }
  }

  loadEnvironmentForEditing(tenant: Tenant): void {
    this.config = {
      environmentName: tenant.name,
      tenantUrl: tenant.tenantUrl,
      baseUrl: tenant.apiUrl,
      authType: tenant.authType as 'oauth' | 'pat', // Use tenant's authType instead of global
      clientId: tenant.clientId || undefined,
      clientSecret: tenant.clientSecret || undefined
    };
    console.log(`Loaded environment config for: ${tenant.name}`, this.config);
    
    // Reset validation status when loading a new environment
    this.oauthValidationStatus = 'unknown';
    
    // Auto-validate OAuth if using OAuth method
    if (this.config.authType === 'oauth' && this.config.baseUrl) {
      void this.validateOAuthEndpoint();
    }
  }

  async resetConfig() {
    // Get the current global auth type
    const currentAuthType = await window.electronAPI.getGlobalAuthType();
    
    this.config = {
      environmentName: '',
      tenantUrl: '',
      baseUrl: '',
      authType: currentAuthType as 'oauth' | 'pat'
    };
    
    // Reset OAuth validation status
    this.oauthValidationStatus = 'unknown';
  }

  onTenantNameChange() {
    const isNewEnvironment = this.selectedTenant === 'new';
    if (isNewEnvironment && this.config.tempTenantName) {
      // Auto-generate URLs based on tenant name
      this.config.tenantUrl = `https://${this.config.tempTenantName}.identitynow.com`;
      this.config.baseUrl = `https://${this.config.tempTenantName}.api.identitynow.com`;
      
      // Trigger OAuth validation if using OAuth
      if (this.config.authType === 'oauth') {
        void this.validateOAuthEndpoint();
      }
    }
  }

  onBaseUrlChange() {
    // Reset validation status when URL changes
    this.oauthValidationStatus = 'unknown';
    
    // Auto-validate OAuth if using OAuth method and URL is provided
    if (this.config.authType === 'oauth' && this.config.baseUrl) {
      // Debounce the validation to avoid too many requests while typing
      setTimeout(() => {
        if (this.config.baseUrl) {
          void this.validateOAuthEndpoint();
        }
      }, 1000);
    }
  }

  async saveEnvironment() {
    if (!this.validateConfig()) {
      return;
    }

    try {
      const isUpdate = this.selectedTenant !== 'new';
      
      // Ensure credentials are properly handled
      const clientId = this.config.clientId?.trim() || undefined;
      const clientSecret = this.config.clientSecret?.trim() || undefined;
      
      console.log('Saving environment with credentials:', {
        environmentName: this.config.environmentName,
        authType: this.config.authType,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      });
      
      // For new environments, use config.authType; for existing environments, use globalAuthMethod
      const authType = this.selectedTenant === 'new' ? this.config.authType : this.globalAuthMethod;
      
      const result = await window.electronAPI.updateEnvironment({
        environmentName: this.config.environmentName,
        tenantUrl: this.config.tenantUrl,
        baseUrl: this.config.baseUrl,
        authType: authType as 'oauth' | 'pat',
        clientId: clientId,
        clientSecret: clientSecret,
      });

      if (result.success) {
        this.showSuccess(isUpdate ? 'Environment updated successfully!' : 'Environment created successfully!');
        await this.loadTenants(); // Refresh the list
        
        // Automatically test OAuth configuration if using OAuth
        if (this.config.authType === 'oauth') {
          await this.validateOAuthEndpoint();
        }
        
        await this.resetConfig();
        this.showEnvironmentDetails = false;
      } else {
        this.showError(String(result.error || 'Failed to save environment'));
      }
    } catch (error) {
      console.error('Error saving environment:', error);
      this.showError('Failed to save environment');
    }
  }

  deleteEnvironment() {
    if (!this.actualTenant || this.selectedTenant === 'new') {
      return;
    }

    const dialogRef = this.dialog.open(GenericDialogComponent, {
      data: {
        title: 'Confirm Deletion',
        message: `Are you sure you want to delete the environment "${String(this.actualTenant.name)}"? This action cannot be undone.`,
        isConfirmation: true,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        void (async () => {
          try {
            const deleteResult = await window.electronAPI.deleteEnvironment(this.actualTenant!.name);
            if (deleteResult.success) {
              this.showSuccess('Environment deleted successfully!');
              await this.loadTenants();
              await this.resetConfig();
              this.selectedTenant = 'new';
              this.actualTenant = undefined;
              this.showEnvironmentDetails = false;
              this.isConnected = false;
              this.connectionService.setConnectionState(false);
            } else {
              this.showError(String(deleteResult.error || 'Failed to delete environment'));
            }
          } catch (error) {
            console.error('Error deleting environment:', error);
            this.showError('Failed to delete environment');
          }
        })();
      }
    });
  }

  async validateOAuthEndpoint(): Promise<boolean> {
    if (!this.config.baseUrl) {
      this.oauthValidationStatus = 'invalid';
      return false;
    }

    this.oauthValidationStatus = 'testing';

    try {
      // Construct the OAuth info URL
      const oauthInfoUrl = `${this.config.baseUrl}/oauth/info`;
      
      // Make a simple HTTP request to the OAuth info endpoint
      const response = await fetch(oauthInfoUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const oauthInfo = await response.json();
        this.oauthValidationStatus = 'valid';
        console.log('OAuth info response:', oauthInfo);
        return true;
      } else {
        this.oauthValidationStatus = 'invalid';
        console.error('OAuth endpoint validation failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('OAuth endpoint validation error:', error);
      this.oauthValidationStatus = 'invalid';
      return false;
    }
  }

  async testOAuthConnection() {
    if (!this.config.baseUrl) {
      this.showError('Please provide API base URL');
      return;
    }

    // Show loading dialog
    const dialogData: DialogData = {
      title: 'Testing OAuth Configuration',
      message: 'Validating OAuth endpoint...',
      showSpinner: true,
      showCancel: false,
      disableClose: true
    };

    this.dialog.open(GenericDialogComponent, {
      data: dialogData,
      width: '400px',
      disableClose: true
    });

    const isValid = await this.validateOAuthEndpoint();

    if (isValid) {
      dialogData.title = 'OAuth Configuration Valid';
      dialogData.message = 'Successfully connected to OAuth endpoint!';
      dialogData.showSpinner = false;
      dialogData.showCancel = true;
    } else {
      dialogData.title = 'OAuth Configuration Invalid';
      dialogData.message = `Failed to reach OAuth endpoint.\n\nPlease check your API base URL: ${this.config.baseUrl}`;
      dialogData.showSpinner = false;
      dialogData.showCancel = true;
    }
  }

  validateConfig(): boolean {
    if (!this.config.environmentName.trim()) {
      this.showError('Environment name is required');
      return false;
    }

    // Only validate tempTenantName for new environments
    if (this.selectedTenant === 'new' && !this.config.tempTenantName?.trim()) {
      this.showError('Tenant name is required to generate URLs');
      return false;
    }

    if (!this.config.tenantUrl.trim()) {
      this.showError('Tenant URL is required');
      return false;
    }

    if (!this.config.baseUrl.trim()) {
      this.showError('Base URL is required');
      return false;
    }

    // For new environments, use config.authType; for existing environments, use globalAuthMethod
    const authType = this.selectedTenant === 'new' ? this.config.authType : this.globalAuthMethod;
    
    if (authType === 'pat') {
      if (!this.config.clientId?.trim()) {
        this.showError('Client ID is required for PAT authentication');
        return false;
      }
      if (!this.config.clientSecret?.trim()) {
        this.showError('Client Secret is required for PAT authentication');
        return false;
      }
    }

    return true;
  }

  // Connected state methods
  listIdentities(): void {
    this.openMessageDialog('listed identities', 'success');
  }

  // Utility methods
  openErrorDialog(errorMessage: string, title: string): void {
    this.dialogRef = this.dialog.open(GenericDialogComponent, {
      data: {
        title: title,
        message: errorMessage,
      },
    });
  }

  openMessageDialog(errorMessage: string, title: string): void {
    this.dialogRef = this.dialog.open(GenericDialogComponent, {
      data: {
        title: title,
        message: errorMessage,
      },
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  async autoAdjustAuthMethod(): Promise<void> {
    if (!this.actualTenant) return;

    const currentAuthMethod = this.globalAuthMethod;
    const hasPATCredentials = !!(this.actualTenant.clientId && this.actualTenant.clientSecret);
    
    console.log(`Auto-adjusting auth method for ${this.actualTenant.name}:`);
    console.log(`- Current method: ${currentAuthMethod}`);
    console.log(`- Has PAT credentials: ${hasPATCredentials}`);

    // If PAT is selected but credentials are missing, switch to OAuth
    if (currentAuthMethod === 'pat' && !hasPATCredentials) {
      console.log('PAT selected but credentials missing, switching to OAuth');
      this.globalAuthMethod = 'oauth';
      await window.electronAPI.setGlobalAuthType('oauth');
      this.actualTenant.authType = 'oauth';
      this.showSuccess(`Switched to OAuth authentication for ${this.actualTenant.name} (PAT credentials not configured)`);
      return;
    }

    // If OAuth is selected, validate the endpoint
    if (currentAuthMethod === 'oauth') {
      // Set up temporary config to test OAuth endpoint
      const tempConfig = {
        baseUrl: this.actualTenant.apiUrl
      };
      
      try {
        const oauthInfoUrl = `${tempConfig.baseUrl}/oauth/info`;
        const response = await fetch(oauthInfoUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        // If OAuth endpoint is not reachable and we have PAT credentials, switch to PAT
        if (!response.ok && hasPATCredentials) {
          console.log('OAuth endpoint not reachable but PAT credentials available, switching to PAT');
          this.globalAuthMethod = 'pat';
          await window.electronAPI.setGlobalAuthType('pat');
          this.actualTenant.authType = 'pat';
          this.showSuccess(`Switched to PAT authentication for ${this.actualTenant.name} (OAuth endpoint not reachable)`);
          return;
        }
      } catch {
        // If OAuth endpoint test fails and we have PAT credentials, switch to PAT
        if (hasPATCredentials) {
          console.log('OAuth endpoint test failed but PAT credentials available, switching to PAT');
          this.globalAuthMethod = 'pat';
          await window.electronAPI.setGlobalAuthType('pat');
          this.actualTenant.authType = 'pat';
          this.showSuccess(`Switched to PAT authentication for ${this.actualTenant.name} (OAuth endpoint not available)`);
          return;
        }
      }
    }

    console.log(`Keeping current auth method: ${currentAuthMethod}`);
  }
}
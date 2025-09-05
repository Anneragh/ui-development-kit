import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConnectionService } from '../services/connection.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
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
import { TenantDataCardComponent } from './dashboard-cards/tenant-data/tenant-data-card.component';
import { SourcesComponent } from './dashboard-cards/sources/sources.component';
import { IdentitiesComponent } from './dashboard-cards/identities/identities.component';
import { IdentityProfilesComponent } from './dashboard-cards/identity-profiles/identity-profiles.component';
import { ShortcutsComponent } from './dashboard-cards/shortcuts/shortcuts.component';
import { ElectronApiFactoryService } from 'sailpoint-components';
import { GenericDialogComponent } from 'sailpoint-components'


type AuthMethods = "oauth" | "pat";
type OAuthValidationStatus = 'unknown' | 'valid' | 'invalid' | 'testing';



type Tenant = {
  active: boolean;
  apiUrl: string;
  tenantUrl: string;
  clientId?: string;
  clientSecret?: string;
  name: string;
  authType: AuthMethods;
  tenantName: string;
}

type ComponentState = {
  isConnected: boolean;
  loading: boolean;
  name: string;
  tenants: Tenant[];
  selectedTenant: string;
  actualTenant: Tenant;
  showEnvironmentDetails: boolean;
  oauthValidationStatus: OAuthValidationStatus;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    TenantDataCardComponent,
    SourcesComponent,
    IdentitiesComponent,
    IdentityProfilesComponent,
    ShortcutsComponent,
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
    SharedModule,
    GenericDialogComponent
  ]
})
export class HomeComponent implements OnInit {


  defaultTenant: Tenant = {
    active: false,
    apiUrl: '',
    tenantUrl: '',
    name: '',
    authType: 'oauth',
    tenantName: '',
  }

  // State management
  state: ComponentState = {
    isConnected: false,
    loading: true,
    name: '',
    tenants: [],
    selectedTenant: 'new',
    actualTenant: this.defaultTenant,
    showEnvironmentDetails: false,
    oauthValidationStatus: 'unknown'
  }

  authenticating = false;

  constructor(
    private router: Router,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar,
    private electronService: ElectronApiFactoryService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    void this.loadTenants();

    this.connectionService.connectedSubject$.subscribe((connection) => {
      this.state.isConnected = connection.connected;
      this.state.name = connection.name || '';
    })
    this.state.loading = false;
  }


  // Tenant Methods:
  async loadTenants(): Promise<void> {
    try {
      const tenants = await this.electronService.getApi().getTenants();
      this.state.tenants = tenants;

      const activeTenant = tenants.find(tenant => tenant.active === true);
      if (activeTenant) {
        this.state.selectedTenant = activeTenant.name;
        this.state.actualTenant = activeTenant;



      } else {
        this.state.selectedTenant = 'new';
        this.state.actualTenant = this.defaultTenant;
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      this.showSnackbar('Failed to load environments');
    }
  }

  updateTenant(): void {
    if (this.state.selectedTenant === 'new') {
      this.state.actualTenant = this.defaultTenant;
      return;
    }

    const actualTenant = this.state.tenants.find(tenant => tenant.name === this.state.selectedTenant);
    if (!actualTenant) {
      this.showSnackbar('Selected environment not found');
      return;
    }
    this.state.actualTenant = actualTenant;
    console.log(`Selected tenant:`, actualTenant);

  }


  // Session Management
  async connectToISC(): Promise<void> {



    if (this.state.selectedTenant === 'new') {
      this.showSnackbar('Cannot connect to ISC: Please select an environment or create a new one first');
      return;
    }

    if (!this.state.actualTenant) {
      this.showSnackbar('Cannot connect to ISC: No environment selected');
      return;
    }

    this.connectionService.currentEnvironmentSubject$.next({
      name: this.state.actualTenant.name,
      apiUrl: this.state.actualTenant.apiUrl,
      baseUrl: this.state.actualTenant.tenantUrl,
      authType: this.state.actualTenant.authType,
      clientId: this.state.actualTenant.clientId || undefined,
      clientSecret: this.state.actualTenant.clientSecret || undefined
    });

    this.authenticating = true;
    this.dialog.open(GenericDialogComponent, {
        data: {
          title: `Logging into ISC...`,
          message: "Please wait while we log you into the selected environment.",
      }
    });

    console.log('Connecting to:', this.state.actualTenant.name, 'at', this.state.actualTenant.apiUrl);
    console.log('Authentication type:', this.state.actualTenant.authType);

    try {
      console.log("Validating tokens");
      const tokenStatus = await this.electronService.getApi().validateTokens(this.state.actualTenant.name);

      console.log('tokenStatus', tokenStatus);

      if (!tokenStatus.isValid && tokenStatus.needsRefresh) {
        this.showSnackbar('Refreshing session...');
        await this.connectionService.manualRefreshSession();
        return;
      }

      try {
        const loginResult = await this.electronService.getApi().unifiedLogin(this.state.actualTenant.name);

        if (loginResult.success) {
          const tokenDetails = await this.electronService.getApi().getCurrentTokenDetails(this.state.actualTenant.name);
          if (tokenDetails.error || !tokenDetails.tokenDetails) {
            this.showSnackbar(`Failed to get token details. Please check your configuration and try again. \n\n${tokenDetails.error}`);
            return;
          }

          this.connectionService.sessionStatusSubject$.next({
            authType: this.state.actualTenant.authType,
            isValid: tokenStatus.isValid,
            lastChecked: new Date(),
            expiry: tokenDetails.tokenDetails.expiry,
            needsRefresh: tokenStatus.needsRefresh
          });
          this.connectionService.connectedSubject$.next({ connected: true, name: this.state.actualTenant.name });
          this.state.isConnected = true;
          this.state.name = this.state.actualTenant.name;

          this.authenticating = false;
          this.dialog.closeAll();
          await this.electronService.getApi().setActiveEnvironment(this.state.actualTenant.name);
        } else {
          this.showSnackbar(`Failed to connect to the environment. Please check your configuration and try again. \n\n${loginResult.error}`);
        }
      } catch (error) {
        console.error('Unified login failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.showSnackbar(`Failed to connect to the environment. Please check your configuration and try again. \n\n${errorMessage}`);
      }
    } catch (error) {
      console.error('Error connecting to ISC:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.showSnackbar(`Failed to connect to the environment. Please check your configuration and try again. \n\n${errorMessage}`);
    } finally {
      this.authenticating = false;
      this.dialog.closeAll();
    }
  }

  async disconnectFromISC(): Promise<void> {
    await this.electronService.getApi().disconnectFromISC();
    this.state.isConnected = false;
    this.connectionService.connectedSubject$.next({ connected: false });
  }

  async testOAuthConnection(): Promise<{ error?: Error }> {
    if (!this.state.actualTenant?.apiUrl) {
      this.state.oauthValidationStatus = 'invalid';
      return { error: new Error('Please provide API base URL') };
    }

    this.state.oauthValidationStatus = 'testing';

    try {
      const oauthInfoUrl = `${this.state.actualTenant.apiUrl}/oauth/info`;
      const response = await fetch(oauthInfoUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const oauthInfo = await response.json();
        this.state.oauthValidationStatus = 'valid';
        console.log('OAuth info response:', oauthInfo);
        return { error: undefined };
      } else {
        this.state.oauthValidationStatus = 'invalid';
        console.error('OAuth endpoint validation failed:', response.status, response.statusText);
        this.showSnackbar(`Failed to reach OAuth endpoint.\n\nPlease check your API base URL: ${this.state.actualTenant.apiUrl}`);
        return { error: new Error(`Failed to reach OAuth endpoint.\n\nPlease check your API base URL: ${this.state.actualTenant.apiUrl}`) };
      }
    } catch (error) {
      console.error('OAuth endpoint validation error:', error);
      this.state.oauthValidationStatus = 'invalid';
      this.showSnackbar(`Failed to reach OAuth endpoint.\n\nPlease check your API base URL: ${this.state.actualTenant.apiUrl}`);
      return { error: new Error(`Failed to reach OAuth endpoint.\n\nPlease check your API base URL: ${this.state.actualTenant.apiUrl}`) };
    }
  }

  // Environment Methods:

  validateConfig(): boolean {
    if (!this.state.actualTenant?.name.trim()) {
      this.showSnackbar('Environment name is required');
      return false;
    }

    if (this.state.selectedTenant === 'new' && !this.state.actualTenant.tenantName?.trim()) {
      this.showSnackbar('Tenant name is required to generate URLs');
      return false;
    }

    if (!this.state.actualTenant.tenantUrl.trim()) {
      this.showSnackbar('Tenant URL is required');
      return false;
    }

    if (!this.state.actualTenant.apiUrl.trim()) {
      this.showSnackbar('Base URL is required');
      return false;
    }

    if (this.state.actualTenant.authType === 'pat') {
      if (!this.state.actualTenant.clientId?.trim()) {
        this.showSnackbar('Client ID is required for PAT authentication');
        return false;
      }
      if (!this.state.actualTenant.clientSecret?.trim()) {
        this.showSnackbar('Client Secret is required for PAT authentication');
        return false;
      }
    }

    return true;
  }

  toggleEnvironmentDetails(): void {
    const newValue = !this.state.showEnvironmentDetails;
    this.state.showEnvironmentDetails = newValue;
  }

  async setActiveEnvironment(environmentName: string): Promise<void> {
    try {
      const result = await this.electronService.getApi().setActiveEnvironment(environmentName);
      if (result.success) {
        console.log(`Successfully set ${environmentName} as active environment`);
      } else {
        console.error('Failed to set active environment:', result.error);
        this.showSnackbar('Failed to set active environment');
      }
    } catch (error) {
      console.error('Error setting active environment:', error);
      this.showSnackbar('Failed to set active environment');
    }
  }

  async saveEnvironment(): Promise<void> {
    if (!this.validateConfig()) {
      return;
    }

    if (!this.state.actualTenant) {
      this.showSnackbar('No environment data to save');
      return;
    }

    try {
      const clientId = this.state.actualTenant.clientId?.trim() || undefined;
      const clientSecret = this.state.actualTenant.clientSecret?.trim() || undefined;

      console.log('Saving environment with credentials:', {
        environmentName: this.state.actualTenant.name,
        authType: this.state.actualTenant.authType,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      });

      const result = await this.electronService.getApi().updateEnvironment({
        environmentName: this.state.actualTenant.name,
        tenantUrl: this.state.actualTenant.tenantUrl,
        baseUrl: this.state.actualTenant.apiUrl,
        authType: this.state.actualTenant.authType as 'oauth' | 'pat',
        clientId: clientId,
        clientSecret: clientSecret,
      });

      if (result.success) {
        this.showSnackbar(this.state.selectedTenant === 'new' ? 'Environment created successfully!' : 'Environment updated successfully!');
        await this.loadTenants();

        if (this.state.actualTenant.authType === 'oauth') {
          await this.testOAuthConnection();
        }
        //this.state.actualTenant = undefined;
        this.state.showEnvironmentDetails = false;
      } else {
        this.showSnackbar(String(result.error || 'Failed to save environment'));
      }
    } catch (error) {
      console.error('Error saving environment:', error);
      this.showSnackbar('Failed to save environment');
    }
  }

  async deleteEnvironment(): Promise<void> {
    if (!this.state.actualTenant || this.state.selectedTenant === 'new') {
      return;
    }

    try {
      const deleteResult = await this.electronService.getApi().deleteEnvironment(this.state.actualTenant.name);
      if (deleteResult.success) {
        // this.showSuccess('Environment deleted successfully!');
        await this.loadTenants();
        this.state.actualTenant = this.defaultTenant;
        this.state.selectedTenant = 'new';
        // this.showEnvironmentDetails$.next(false);
        // this.isConnected$.next(false);
        // this.connectionService.setConnectionState(false);
      } else {
        // this.showError(String(deleteResult.error || 'Failed to delete environment'));
      }
    } catch (error) {
      console.error('Error deleting environment:', error);
      // this.showError('Failed to delete environment');
    }
  }


  onTenantNameChange(): void {
    if (this.state.selectedTenant === 'new' && this.state.actualTenant?.tenantName) {
      this.state.actualTenant.tenantUrl = `https://${this.state.actualTenant.tenantName}.identitynow.com`;
      this.state.actualTenant.apiUrl = `https://${this.state.actualTenant.tenantName}.api.identitynow.com`;

      if (this.state.actualTenant.authType === 'oauth') {
        void this.testOAuthConnection();
      }
    }
  }

  onBaseUrlChange(): void {
    this.state.oauthValidationStatus = 'unknown';
    

    if (this.state.actualTenant?.authType === 'oauth' && this.state.actualTenant?.apiUrl) {
      setTimeout(() => {
        void this.testOAuthConnection();
      }, 1000);
    }
  }

  // Utility Methods:

  showSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000
    });
  }
}
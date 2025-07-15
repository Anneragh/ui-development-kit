import {
  BreakpointObserver,
  Breakpoints,
  LayoutModule,
} from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2, OnDestroy, ViewChild, ElementRef, } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, combineLatest } from 'rxjs';
import { ThemeConfig, ThemeService } from 'sailpoint-components';
import { APP_CONFIG } from '../environments/environment';
import { ElectronService } from './core/services';
import { ConnectionService, Connection, SessionStatus, EnvironmentInfo } from './shared/connection.service';
import {
  ComponentInfo,
  ComponentSelectorService,
} from './services/component-selector.service';


declare const window: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LayoutModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
})

export class AppComponent implements OnDestroy, OnInit {
  @ViewChild('logoImage') logoImageRef!: ElementRef<HTMLImageElement>;

  // UI and state flags
  isSmallScreen: boolean = false;
  sidenavOpened = true;
  isConnected = false;
  isDarkTheme = false;
  connectionName: string = '';
  sessionStatus: SessionStatus | null = null;
  currentEnvironment: EnvironmentInfo | null = null;

  private subscriptions = new Subscription();

  // Active features and logo path
  enabledComponents: ComponentInfo[] = [];
  logoPath = '';

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private connectionService: ConnectionService,
    private renderer: Renderer2,
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private themeService: ThemeService,
    private componentSelectorService: ComponentSelectorService
  ) {
    // Set default language
    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);
    
    this.breakpointObserver.observe([Breakpoints.Medium, Breakpoints.Small, Breakpoints.XSmall]).subscribe((result) => {
      this.isSmallScreen = result.matches;
      this.sidenavOpened = !this.isSmallScreen;
    });
    
    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);

    // Watch for screen size changes to adjust layout
    this.breakpointObserver
      .observe([Breakpoints.Medium, Breakpoints.Small, Breakpoints.XSmall])
      .subscribe((result) => {
        this.isSmallScreen = result.matches;
        this.sidenavOpened = !this.isSmallScreen;
      });

    // Platform-specific logging
    if (electronService.isElectron) {
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }


    // Subscribe to connection state changes
    this.subscriptions.add(
      this.connectionService.isConnected$.subscribe((connection: Connection) => {
        console.log('App component received connection state:', connection);
        this.isConnected = connection.connected;
        this.connectionName = connection.name || '';
      })
    );

    // Subscribe to session status changes
    this.subscriptions.add(
      this.connectionService.sessionStatus$.subscribe((status: SessionStatus | null) => {
        console.log('App component received session status:', status);
        this.sessionStatus = status;
      })
    );

    // Subscribe to current environment changes
    this.subscriptions.add(
      this.connectionService.currentEnvironment$.subscribe((environment: EnvironmentInfo | null) => {
        console.log('App component received environment:', environment);
        this.currentEnvironment = environment;
      })
    );
    // Monitor connection state and redirect on disconnect

    this.connectionService.isConnected$.subscribe((connection) => {
      this.isConnected = connection.connected;
      if (!connection.connected) {
        this.router.navigate(['/home']).catch((error) => {
          console.error('Navigation error:', error);
        });
      }
    });
  }

  ngOnInit(): void {
    // Combine theme config and dark mode stream for live updates
    combineLatest([
      this.themeService.theme$,
      this.themeService.isDark$,
    ]).subscribe(([theme, isDark]) => {
      this.isDarkTheme = isDark;

      // Resolve logo path based on current theme
      this.logoPath = isDark
        ? theme?.logoDark || 'assets/icons/logo-dark.png'
        : theme?.logoLight || 'assets/icons/logo.png';

      // Apply logo with a cache-busting timestamp
      const logo = this.logoImageRef?.nativeElement;
      if (logo) {
        logo.onload = () => this.themeService.logoUpdated$.next();

        const src = this.logoPath?.startsWith('data:')
          ? this.logoPath
          : `${this.logoPath?.split('?')[0]}?t=${Date.now()}`;

        // Defer setting logo to avoid layout conflicts
        setTimeout(() => {
          logo.src = src;
        }, 100);
      }
    });

    // Watch component enablement state
    this.componentSelectorService.enabledComponents$.subscribe((components) => {
      this.enabledComponents = components;
    });
  }

  /**
   * Returns true if the given component is enabled.
   */
  isComponentEnabled(componentName: string): boolean {
    return this.enabledComponents.some(
      (component) => component.name === componentName && component.enabled
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Toggles between light and dark themes.
   */
  async toggleTheme(): Promise<void> {
    const mode = this.isDarkTheme ? 'light' : 'dark';
    const raw = this.themeService.getRawConfig();
    let targetTheme = raw?.[`theme-${mode}`] as ThemeConfig | undefined;

    if (!targetTheme) {
      targetTheme = await this.themeService['getDefaultTheme'](mode);
    }

    await this.themeService.saveTheme(targetTheme, mode);
  }

  /**
   * Falls back to default logo if logo fails to load.
   */
  useFallbackLogo() {
    this.logoPath = this.isDarkTheme
      ? 'assets/icons/logo-dark.png'
      : 'assets/icons/logo.png';
  }

  /**
   * Toggle the state of the side navigation.
   */
  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  /**
   * Disconnects from Identity Security Cloud and navigates home.
   */
  async disconnectFromISC() {
    await window.electronAPI.disconnectFromISC();
    this.connectionService.setConnectionState(false);
    this.router.navigate(['/home']).catch((error) => {
      console.error('Navigation error:', error);
    });
  }

  async manualRefreshSession() {
    try {
      console.log('Manual refresh session button clicked');
      console.log('Current connection state:', this.isConnected);
      console.log('Current environment:', this.currentEnvironment);
      console.log('Current session status:', this.sessionStatus);
      
      await this.connectionService.manualRefreshSession();
      console.log('Manual refresh completed successfully');
    } catch (error) {
      console.error('Manual refresh failed:', error);
      // You could add a snackbar notification here if you want user feedback
    }
  }

  // Getters for template
  get isSessionValid(): boolean {
    return this.connectionService.isSessionValid;
  }

  get sessionExpiryTime(): string | null {
    return this.connectionService.sessionExpiryTime;
  }

  get timeUntilExpiry(): string | null {
    return this.connectionService.timeUntilExpiry;
  }

  get sessionStatusDisplay(): string {
    return this.connectionService.sessionStatusDisplay;
  }

  get isRefreshing(): boolean {
    return this.connectionService.isRefreshing;
  }
}

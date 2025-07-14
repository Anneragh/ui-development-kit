import {
  BreakpointObserver,
  Breakpoints,
  LayoutModule,
} from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Renderer2,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeConfig, ThemeService } from 'sailpoint-components';
import { APP_CONFIG } from '../environments/environment';
import { ElectronService } from './core/services';
import {
  ComponentInfo,
  ComponentSelectorService,
} from './services/component-selector.service';
import { ConnectionService } from './shared/connection.service';
import { combineLatest } from 'rxjs';

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
export class AppComponent implements OnInit {
  @ViewChild('logoImage') logoImageRef!: ElementRef<HTMLImageElement>;

  // UI and state flags
  isSmallScreen: boolean = false;
  sidenavOpened = true;
  isConnected = true;
  isDarkTheme = false;

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
}

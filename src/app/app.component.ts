import {
  BreakpointObserver,
  Breakpoints,
  LayoutModule,
} from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2 } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from 'sailpoint-components';
import { APP_CONFIG } from '../environments/environment';
import { ElectronService } from './core/services';
import {
  ComponentInfo,
  ComponentSelectorService,
} from './services/component-selector.service';
import { ConnectionService } from './shared/connection.service';

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
  isSmallScreen: boolean = false;
  sidenavOpened = true;
  isConnected = true;
  isDarkTheme = false;
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
    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);

    // Layout responsiveness
    this.breakpointObserver
      .observe([Breakpoints.Medium, Breakpoints.Small, Breakpoints.XSmall])
      .subscribe((result) => {
        this.isSmallScreen = result.matches;
        this.sidenavOpened = !this.isSmallScreen;
      });

    // Platform context
    if (electronService.isElectron) {
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }

    // Subscribe to connection state changes
    this.connectionService.isConnected$.subscribe((connection) => {
      this.isConnected = connection.connected;
      if (!connection.connected) {
        this.router.navigate(['/home']).catch((error) => {
          console.error('Navigation error:', error);
        });
      }
    });

    this.themeService.isDark$.subscribe((isDark) => {
      this.isDarkTheme = isDark;

      if (isDark) {
        this.renderer.addClass(document.body, 'dark-theme');
      } else {
        this.renderer.removeClass(document.body, 'dark-theme');
      }

      const currentTheme = this.themeService['themeSubject'].value;

      this.logoPath =
        currentTheme?.logo ||
        (isDark
          ? 'assets/icons/SailPoint-Developer-Community-Inverse-Lockup.png'
          : 'assets/icons/SailPoint-Developer-Community-Lockup.png');
    });
  }

  ngOnInit(): void {
    const currentTheme = this.themeService['themeSubject'].value;
    if (currentTheme?.logo) {
      this.logoPath = currentTheme.logo;
    }

    this.componentSelectorService.enabledComponents$.subscribe((components) => {
      this.enabledComponents = components;
    });
  }

  isComponentEnabled(componentName: string): boolean {
    return this.enabledComponents.some(
      (component) => component.name === componentName && component.enabled
    );
  }

  toggleTheme(): void {
    const current = this.themeService['themeSubject'].value;

    if (!current) return;

    const isCurrentlyDark = current.background.toLowerCase() !== '#ffffff';
    const isDark = !isCurrentlyDark;
    const mode: 'light' | 'dark' = isDark ? 'dark' : 'light';

    const updatedTheme = {
      ...current,
      background: isDark ? '#151316' : '#ffffff',
      primaryText: isDark ? '#ffffff' : '#415364',
      secondaryText: isDark ? '#cccccc' : '#415364',
      hoverText: isDark ? '#54c0e8' : '#ffffff',
    };

    this.themeService.saveTheme(updatedTheme, mode); // ✅ pass mode
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  async disconnectFromISC() {
    await window.electronAPI.disconnectFromISC();
    this.connectionService.setConnectionState(false);
    this.router.navigate(['/home']).catch((error) => {
      console.error('Navigation error:', error);
    });
  }
}

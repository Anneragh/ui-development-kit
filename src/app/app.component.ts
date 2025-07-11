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
  }

  ngOnInit(): void {
    combineLatest([
      this.themeService.theme$,
      this.themeService.isDark$,
    ]).subscribe(([theme, isDark]) => {
      this.isDarkTheme = isDark;

      this.logoPath = isDark
        ? theme?.logoDark || 'assets/icons/logo-dark.png'
        : theme?.logoLight || 'assets/icons/logo.png';

      const logo = this.logoImageRef?.nativeElement;
      if (logo) {
        logo.onload = () => this.themeService.logoUpdated$.next();

        const src = this.logoPath?.startsWith('data:')
          ? this.logoPath
          : `${this.logoPath?.split('?')[0]}?t=${Date.now()}`;

        setTimeout(() => {
          logo.src = src;
        }, 100);
      }
    });

    this.componentSelectorService.enabledComponents$.subscribe((components) => {
      this.enabledComponents = components;
    });
  }

  isComponentEnabled(componentName: string): boolean {
    return this.enabledComponents.some(
      (component) => component.name === componentName && component.enabled
    );
  }

  async toggleTheme(): Promise<void> {
    const mode = this.isDarkTheme ? 'light' : 'dark';

    // 🔍 Always fetch the full intended theme (light or dark)
    const raw = this.themeService.getRawConfig();
    let targetTheme = raw?.[`theme-${mode}`] as ThemeConfig | undefined;

    if (!targetTheme) {
      targetTheme = await this.themeService['getDefaultTheme'](mode); // Make getDefaultTheme public if needed
    }

    await this.themeService.saveTheme(targetTheme, mode);
  }

  useFallbackLogo() {
    this.logoPath = this.isDarkTheme
      ? 'assets/icons/logo-dark.png'
      : 'assets/icons/logo.png';
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

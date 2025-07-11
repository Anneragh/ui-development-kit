// src/app/core/services/theme.service.ts

export interface ThemeConfig {
  primary: string;
  secondary: string;
  primaryText: string;
  secondaryText: string;
  hoverText: string;
  background: string;
  logoLight?: string;
  logoDark?: string;
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

declare function structuredClone<T>(value: T): T;

declare global {
  interface Window {
    electronAPI: {
      readConfig: () => Promise<any>;
      writeConfig: (config: any) => Promise<any>;
      writeLogo: (buffer: Uint8Array, fileName: string) => Promise<void>;
      checkLogoExists: (fileName: string) => Promise<boolean>;
      getUserDataPath: () => string;
      getLogoDataUrl: (fileName: string) => Promise<string>;
    };
  }
}
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  private isDarkSubject = new BehaviorSubject<boolean>(false);
  readonly isDark$ = this.isDarkSubject.asObservable();
  logoUpdated$ = new Subject<void>();

  private themeSubject = new BehaviorSubject<ThemeConfig | null>(null);
  theme$ = this.themeSubject.asObservable();

  constructor() {
    void this.loadTheme();
  }

  private lastRawConfig: any = {};

  getRawConfig(): any {
    return this.lastRawConfig;
  }

  async loadTheme(mode?: 'light' | 'dark', apply = true): Promise<ThemeConfig> {
    const currentMode =
      mode ??
      (localStorage.getItem('themeMode') as 'light' | 'dark') ??
      'light';

    let config: ThemeConfig;
    if (this.isElectron) {
      const raw = await window.electronAPI.readConfig();
      this.lastRawConfig = raw;
      config =
        raw[`theme-${currentMode}`] ??
        (await this.getDefaultTheme(currentMode));
    } else {
      const stored = localStorage.getItem(`theme-${currentMode}`);
      config = stored
        ? JSON.parse(stored)
        : await this.getDefaultTheme(currentMode);
    }

    if (apply) {
      this.applyTheme(config, currentMode);
    }

    return config;
  }

  async saveTheme(config: ThemeConfig, mode: 'light' | 'dark'): Promise<void> {
    localStorage.setItem('themeMode', mode);

    const themeToSave = structuredClone(config);

    if (this.isElectron) {
      const raw = await window.electronAPI.readConfig();
      raw[`theme-${mode}`] = themeToSave;
      this.lastRawConfig = raw; 
      await window.electronAPI.writeConfig(raw);
    } else {
      localStorage.setItem(`theme-${mode}`, JSON.stringify(themeToSave));
    }
    console.log(`[ThemeService] Saving theme (${mode}):`, config);
    this.applyTheme(themeToSave, mode);
  }

  isValidLogoPath(value?: string): boolean {
    if (!value) return false;
    if (value.startsWith('file://')) return true;
    if (value.startsWith('data:')) return true;
    return false; // treat all other paths (like assets/) as invalid
  }

  private applyTheme(config: ThemeConfig, mode: 'light' | 'dark') {
    const {
      primary,
      secondary,
      primaryText,
      secondaryText,
      hoverText,
      background,
    } = config;
    if (!this.isValidLogoPath(config.logoLight)) {
      config.logoLight = 'assets/icons/logo.png';
    }
    if (!this.isValidLogoPath(config.logoDark)) {
      config.logoDark = 'assets/icons/logo-dark.png';
    }

    document.body.style.setProperty('--theme-primary', primary);
    document.body.style.setProperty('--theme-secondary', secondary);
    document.body.style.setProperty('--theme-primary-text', primaryText);
    document.body.style.setProperty('--theme-secondary-text', secondaryText);
    document.body.style.setProperty('--theme-hover-text', hoverText);
    document.body.style.setProperty('--theme-background', background);

    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${mode}-theme`);

    this.isDarkSubject.next(mode === 'dark');
    this.themeSubject.next(structuredClone(config));
  }

  getCurrentMode(): 'light' | 'dark' {
    return (localStorage.getItem('themeMode') as 'light' | 'dark') ?? 'light';
  }

  public async getDefaultTheme(mode: 'light' | 'dark'): Promise<ThemeConfig> {
    const fallbackLight = 'assets/icons/logo.png';
    const fallbackDark = 'assets/icons/logo-dark.png';

    let logoLight = fallbackLight;
    let logoDark = fallbackDark;

    if (this.isElectron && window.electronAPI.checkLogoExists) {
      const userLogoLightExists = await window.electronAPI.checkLogoExists(
        'logo.png'
      );
      const userLogoDarkExists = await window.electronAPI.checkLogoExists(
        'logo-dark.png'
      );

      if (userLogoLightExists) {
        logoLight = await window.electronAPI.getLogoDataUrl('logo.png');
      }

      if (userLogoDarkExists) {
        logoDark = await window.electronAPI.getLogoDataUrl('logo-dark.png');
      }
    }

    return {
      primary: mode === 'dark' ? '#54c0e8' : '#0071ce',
      secondary: mode === 'dark' ? '#f48fb1' : '#6c63ff',
      primaryText: mode === 'dark' ? '#ffffff' : '#415364',
      secondaryText: mode === 'dark' ? '#cccccc' : '#415364',
      hoverText: mode === 'dark' ? '#54c0e8' : '#ffffff',
      background: mode === 'dark' ? '#151316' : '#ffffff',
      logoLight,
      logoDark,
    };
  }

  async waitForFile(path: string, timeout = 1000): Promise<boolean> {
    const interval = 100;
    const retries = timeout / interval;

    for (let i = 0; i < retries; i++) {
      const exists = await window.electronAPI.checkLogoExists(
        path.split('/').pop()!
      );
      if (exists) return true;
      await new Promise((res) => setTimeout(res, interval));
    }

    return false;
  }
}

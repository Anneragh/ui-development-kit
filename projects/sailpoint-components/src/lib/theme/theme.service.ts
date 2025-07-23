/// <reference path="../../global.ts" />
export interface ThemeConfig {
  primary: string;
  secondary: string;
  primaryText: string;
  secondaryText: string;
  hoverText: string;
  background: string;
  logoLight?: string;
  logoDark?: string;
  logoLightFileName?: string;
  logoDarkFileName?: string;
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

// Needed for deep cloning objects
declare function structuredClone<T>(value: T): T;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Check if the app is running inside Electron
  private isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Observable for dark mode status
  private isDarkSubject = new BehaviorSubject<boolean>(false);
  readonly isDark$ = this.isDarkSubject.asObservable();

  // Emits whenever a logo is updated
  logoUpdated$ = new Subject<void>();

  // Observable for the active theme config
  private themeSubject = new BehaviorSubject<ThemeConfig | null>(null);
  theme$ = this.themeSubject.asObservable();

  // Last raw configuration read from disk
  private lastRawConfig: any = {};

  constructor() {
    // Load theme on startup
    void this.loadTheme();
  }

  // Returns the most recently read config object
  getRawConfig(): any {
    return this.lastRawConfig;
  }

  /**
   * Loads a theme from localStorage or Electron config.
   * If `apply` is true, applies the theme to the DOM.
   */
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

  /**
   * Saves a theme configuration and applies it.
   */
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

  /**
   * Validates if a given logo path is a file or base64 URL.
   */
  isValidLogoPath(value?: string): boolean {
    if (!value) return false;
    if (value.startsWith('file://')) return true;
    if (value.startsWith('data:')) return true;
    return false;
  }

  /**
   * Applies the given theme config to the DOM.
   */
  private applyTheme(config: ThemeConfig, mode: 'light' | 'dark') {
    const {
      primary,
      secondary,
      primaryText,
      secondaryText,
      hoverText,
      background,
    } = config;

    // Fallback to default logos if missing or invalid
    if (!this.isValidLogoPath(config.logoLight)) {
      config.logoLight = 'assets/icons/logo.png';
    }
    if (!this.isValidLogoPath(config.logoDark)) {
      config.logoDark = 'assets/icons/logo-dark.png';
    }

    // Apply CSS variables for theme colors
    document.body.style.setProperty('--theme-primary', primary);
    document.body.style.setProperty('--theme-secondary', secondary);
    document.body.style.setProperty('--theme-primary-text', primaryText);
    document.body.style.setProperty('--theme-secondary-text', secondaryText);
    document.body.style.setProperty('--theme-hover-text', hoverText);
    document.body.style.setProperty('--theme-background', background);

    // Apply light or dark theme class
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${mode}-theme`);

    // Emit updated theme config
    this.isDarkSubject.next(mode === 'dark');
    this.themeSubject.next(structuredClone(config));
  }

  /**
   * Returns the current saved mode.
   */
  getCurrentMode(): 'light' | 'dark' {
    return (localStorage.getItem('themeMode') as 'light' | 'dark') ?? 'light';
  }

  /**
   * Returns the default theme for the specified mode.
   * If running in Electron and logos exist, includes custom logos.
   */
  public async getDefaultTheme(mode: 'light' | 'dark'): Promise<ThemeConfig> {
    const fallbackLight = 'assets/icons/logo.png';
    const fallbackDark = 'assets/icons/logo-dark.png';

    let logoLight = fallbackLight;
    let logoDark = fallbackDark;

    if (this.isElectron && window.electronAPI.checkLogoExists) {
      const userLogoLightExists = await window.electronAPI.checkLogoExists('logo.png');
      const userLogoDarkExists = await window.electronAPI.checkLogoExists('logo-dark.png');

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

  /**
   * Waits for a file to appear on disk, useful after saving a logo.
   */
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

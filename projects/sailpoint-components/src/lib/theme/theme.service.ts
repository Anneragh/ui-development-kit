// src/app/core/services/theme.service.ts
import 'electron-types';

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
      this.lastRawConfig = raw; // ✅ Also update after saving
      await window.electronAPI.writeConfig(raw);
    } else {
      localStorage.setItem(`theme-${mode}`, JSON.stringify(themeToSave));
    }

    this.applyTheme(themeToSave, mode);
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
    if (!config.logoLight) {
      config.logoLight =
        'assets/icons/logo.png';
    }
    if (!config.logoDark) {
      config.logoDark =
        'assets/icons/logo-dark.png';
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
    let logoLight = 'assets/icons/logo.png';
    let logoDark =
      'assets/icons/logo-dark.png';

    if (this.isElectron && window.electronAPI.checkLogoExists) {
      const lightExists = await window.electronAPI.checkLogoExists('logo.png');
      const darkExists = await window.electronAPI.checkLogoExists(
        'logo-dark.png'
      );

      if (lightExists) logoLight = 'assets/icons/logo.png';
      if (darkExists) logoDark = 'assets/icons/logo-dark.png';
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
}

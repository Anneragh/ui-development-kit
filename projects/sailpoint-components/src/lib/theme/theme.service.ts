// src/app/core/services/theme.service.ts

export interface ThemeConfig {
  primary: string;
  secondary: string;
  primaryText: string;
  secondaryText: string;
  hoverText: string;
  background: string;
  logo: string;
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  private isDarkSubject = new BehaviorSubject<boolean>(false);
  readonly isDark$ = this.isDarkSubject.asObservable();

  private themeSubject = new BehaviorSubject<ThemeConfig | null>(null);
  theme$ = this.themeSubject.asObservable();

  constructor() {
    this.loadTheme();
  }

  async loadTheme(mode?: 'light' | 'dark'): Promise<void> {
    const currentMode =
      mode ??
      (localStorage.getItem('themeMode') as 'light' | 'dark') ??
      'light';

    let config: ThemeConfig;
    if (this.isElectron) {
      const raw = await window.electronAPI!.readConfig();
      config = raw[`theme-${currentMode}`] || this.getDefaultTheme(currentMode);
    } else {
      const stored = localStorage.getItem(`theme-${currentMode}`);
      config = stored ? JSON.parse(stored) : this.getDefaultTheme(currentMode);
    }

    this.applyTheme(config, currentMode); // pass currentMode here
  }

  async saveTheme(config: ThemeConfig, mode: 'light' | 'dark'): Promise<void> {
    localStorage.setItem('themeMode', mode); // persist selected mode

    if (this.isElectron) {
      const raw = await window.electronAPI!.readConfig();
      raw[`theme-${mode}`] = config;
      await window.electronAPI!.writeConfig(raw);
    } else {
      localStorage.setItem(`theme-${mode}`, JSON.stringify(config));
    }

    this.applyTheme(config, mode);
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

    document.body.style.setProperty('--theme-primary', primary);
    document.body.style.setProperty('--theme-secondary', secondary);
    document.body.style.setProperty('--theme-primary-text', primaryText);
    document.body.style.setProperty('--theme-secondary-text', secondaryText);
    document.body.style.setProperty('--theme-hover-text', hoverText);
    document.body.style.setProperty('--theme-background', background);

    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${mode}-theme`);

    this.isDarkSubject.next(mode === 'dark');
    this.themeSubject.next(config);
  }

  private getDefaultTheme(mode: 'light' | 'dark'): ThemeConfig {
    return mode === 'dark'
      ? {
          primary: '#54c0e8',
          secondary: '#f48fb1',
          primaryText: '#ffffff',
          secondaryText: '#cccccc',
          hoverText: '#54c0e8',
          background: '#151316',
          logo: 'assets/icons/SailPoint-Developer-Community-Inverse-Lockup.png',
        }
      : {
          primary: '#0071ce',
          secondary: '#6c63ff',
          primaryText: '#415364',
          secondaryText: '#415364',
          hoverText: '#ffffff',
          background: '#ffffff',
          logo: 'assets/icons/SailPoint-Developer-Community-Lockup.png',
        };
  }
}

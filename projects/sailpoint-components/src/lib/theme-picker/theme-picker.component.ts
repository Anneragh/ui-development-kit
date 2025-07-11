import { CommonModule } from '@angular/common';
import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ThemeService } from '../theme/theme.service';
import { ThemeConfig } from '../theme/theme.service';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

declare function structuredClone<T>(value: T): T;

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
})
export class ThemePickerComponent implements OnInit {
  title = 'Theme Picker';

  @ViewChild('logoImage') logoImageRef!: ElementRef<HTMLImageElement>;

  mode: 'light' | 'dark' = this.themeService.getCurrentMode();
  loading = false;

  emptyTheme(): ThemeConfig {
    return {
      primary: '',
      secondary: '',
      primaryText: '',
      secondaryText: '',
      hoverText: '',
      background: '',
      logoLight: '',
      logoDark: '',
    };
  }

  lightColors: ThemeConfig = { ...this.emptyTheme() };
  darkColors: ThemeConfig = { ...this.emptyTheme() };

  get colors(): ThemeConfig {
    return this.mode === 'dark' ? this.darkColors : this.lightColors;
  }

  set colors(value: ThemeConfig) {
    if (this.mode === 'dark') {
      this.darkColors = structuredClone(value);
    } else {
      this.lightColors = structuredClone(value);
    }
  }

  private ignoreNextDarkChange = false;

  ngOnInit(): void {
    const storedMode =
      (localStorage.getItem('themeMode') as 'light' | 'dark') ?? 'light';
    this.mode = storedMode;

    void this.loadThemeForMode().then(() => {
      this.themeService.isDark$.subscribe((isDark) => {
        const newMode = isDark ? 'dark' : 'light';
        if (newMode === this.mode) return; 

        this.mode = newMode;
        void this.loadThemeForMode(); 
      });
    });
  }

  async onModeChange() {
    localStorage.setItem('themeMode', this.mode);

    const loaded = await this.themeService.loadTheme(this.mode, false); 
    this.colors = structuredClone(loaded);

    this.themeService['applyTheme'](this.colors, this.mode); 
  }

  selectedLogoFile?: File;
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.selectedLogoFile = input.files[0];
  }

  async loadThemeForMode(): Promise<void> {
    const raw = this.themeService.getRawConfig();

    // fallback-safe calls for both modes
    this.lightColors =
      raw?.['theme-light'] ??
      (await this.themeService.getDefaultTheme('light'));
    this.darkColors =
      raw?.['theme-dark'] ?? (await this.themeService.getDefaultTheme('dark'));
  }

  constructor(
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  private readFileAsBuffer(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async apply() {
    this.loading = true;
    this.cdr.detectChanges(); 

    try {

      if (this.selectedLogoFile) {
        const buffer = await this.readFileAsBuffer(this.selectedLogoFile);
        const fileName = this.mode === 'dark' ? 'logo-dark.png' : 'logo.png';

        await window.electronAPI?.writeLogo(buffer, fileName);
        await this.themeService.waitForFile(fileName);

   
        const base64 = await window.electronAPI.getLogoDataUrl(fileName);
        const updatedColors = structuredClone(this.colors);

        if (this.mode === 'dark') {
          updatedColors.logoDark = base64;
        } else {
          updatedColors.logoLight = base64;
        }

        this.colors = updatedColors;
        this.selectedLogoFile = undefined;
      }

      await this.themeService.saveTheme(
        this.mode === 'dark' ? this.darkColors : this.lightColors,
        this.mode
      );

    
      this.themeService['applyTheme'](this.colors, this.mode);
      this.themeService.logoUpdated$.next(); 

    
      await Promise.race([
        new Promise<void>((resolve) => {
          const sub = this.themeService.logoUpdated$.subscribe(() => {
            resolve();
            sub.unsubscribe();
          });
        }),
        new Promise((resolve) => setTimeout(resolve, 1000)), 
      ]);
    } catch (err) {
      console.error('Failed to apply theme:', err);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}

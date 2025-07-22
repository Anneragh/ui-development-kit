/// <reference path="../../global.ts" />

// Angular core and common modules
import { CommonModule } from '@angular/common';
import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';

// Angular Material UI modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule     } from '@angular/material/select';


// Theme management service and config interface
import { ThemeService, ThemeConfig } from '../theme/theme.service';

// Required for deep cloning
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
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatSelectModule,
  ],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
})
export class ThemePickerComponent implements OnInit {
  title = 'Theme Picker';
  selectedLogoFileName = '';

  // Reference to the logo <img> in the template
  @ViewChild('logoImage') logoImageRef!: ElementRef<HTMLImageElement>;

    // now type the fields so that `key` is ONLY one of the keys of ThemeConfig:
  readonly colorFields: Array<{ label: string; key: keyof ThemeConfig }> = [
    { label: 'Primary',       key: 'primary'       },
    { label: 'Secondary',     key: 'secondary'     },
    { label: 'Primary Text',  key: 'primaryText'   },
    { label: 'Secondary Text',key: 'secondaryText' },
    { label: 'Hover Text',    key: 'hoverText'     },
    { label: 'Background',    key: 'background'    },
  ];

  // Track current theme mode
  mode: 'light' | 'dark' = this.themeService.getCurrentMode();

  // Spinner visibility
  loading = false;

  // Factory for empty theme object
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

  // Store theme colors for each mode
  lightColors: ThemeConfig = { ...this.emptyTheme() };
  darkColors: ThemeConfig = { ...this.emptyTheme() };

  // Getter for current mode's color config
  get colors(): ThemeConfig {
    return this.mode === 'dark' ? this.darkColors : this.lightColors;
  }

  // Setter for updating current mode's color config
  set colors(value: ThemeConfig) {
    if (this.mode === 'dark') {
      this.darkColors = structuredClone(value);
    } else {
      this.lightColors = structuredClone(value);
    }
  }

  private ignoreNextDarkChange = false; // reserved for preventing recursive theme toggling (not used here)

  ngOnInit(): void {
    // Restore mode from local storage
    const storedMode =
      (localStorage.getItem('themeMode') as 'light' | 'dark') ?? 'light';
    this.mode = storedMode;

    // Load theme config for selected mode
    void this.loadThemeForMode().then(() => {
      // Subscribe to dark mode changes from ThemeService
      this.themeService.isDark$.subscribe((isDark) => {
        const newMode = isDark ? 'dark' : 'light';
        if (newMode === this.mode) return; // Avoid redundant updates

        this.mode = newMode;
        void this.loadThemeForMode(); // Reload theme config on mode change
      });
    });
  }

  // Handler for manual mode toggle (e.g., from UI switch)
  async onModeChange() {
    localStorage.setItem('themeMode', this.mode);
    const loaded = await this.themeService.loadTheme(this.mode, false); // Don't apply automatically
    this.colors = structuredClone(loaded);
    this.themeService['applyTheme'](this.colors, this.mode); // Apply manually
  }

  // Set selected logo file from file input
  selectedLogoFile?: File;
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    // only allow PNG
    if (
      file.type !== 'image/png' &&
      !file.name.toLowerCase().endsWith('.png')
    ) {
      this.snackBar.open('Please select a PNG image.', 'Close', {
        duration: 3000,
      });
      input.value = ''; // clear invalid selection
      return;
    }

    this.selectedLogoFile = file;
    this.selectedLogoFileName = file.name;
  }

  // Load both light and dark themes into memory (from config or default)
  async loadThemeForMode(): Promise<void> {
    const raw = this.themeService.getRawConfig();
    this.lightColors =
      raw?.['theme-light'] ??
      (await this.themeService.getDefaultTheme('light'));
    this.darkColors =
      raw?.['theme-dark'] ?? (await this.themeService.getDefaultTheme('dark'));
    // now populate the displayed “filename” field
    this.selectedLogoFileName =
      this.mode === 'dark'
        ? this.darkColors.logoDarkFileName || ''
        : this.lightColors.logoLightFileName || '';
  }

  constructor(
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar 
  ) {}

  // Utility: Read file input into Uint8Array buffer
  private readFileAsBuffer(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async onResetLogo() {
    if (this.mode === 'dark') {
      this.darkColors.logoDark = 'assets/icons/logo-dark.png';
      this.darkColors.logoDarkFileName = '';
    } else {
      this.lightColors.logoLight = 'assets/icons/logo.png';
      this.lightColors.logoLightFileName = '';
    }

    this.selectedLogoFile = undefined;
    this.selectedLogoFileName = '';

    await this.themeService.saveTheme(
      this.mode === 'dark' ? this.darkColors : this.lightColors,
      this.mode
    );

    this.themeService.logoUpdated$.next();
  }

  // Main action to apply the selected theme and optional new logo
  async apply() {
    this.loading = true;
    this.cdr.detectChanges(); // Ensure spinner updates in UI

    try {
      if (this.selectedLogoFile) {
        const buffer = await this.readFileAsBuffer(this.selectedLogoFile);
        const originalFileName = this.selectedLogoFile.name;
        const fileName = this.mode === 'dark' ? 'logo-dark.png' : 'logo.png';

        // Save the logo image to disk and wait for it to be ready
        await window.electronAPI?.writeLogo(buffer, fileName);
        await this.themeService.waitForFile(fileName);

        // Retrieve the base64 image URL for display
        const base64 = await window.electronAPI.getLogoDataUrl(fileName);
        const updatedColors = structuredClone(this.colors);

        // Assign the base64 image as the logo
        if (this.mode === 'dark') {
          updatedColors.logoDark = base64;
          updatedColors.logoDarkFileName = originalFileName;
        } else {
          updatedColors.logoLight = base64;
          updatedColors.logoLightFileName = originalFileName; // Keep original name for light mode
        }
        this.selectedLogoFileName = originalFileName;
        this.colors = updatedColors;
        this.selectedLogoFile = undefined;
      }

      // Save updated theme config
      await this.themeService.saveTheme(
        this.mode === 'dark' ? this.darkColors : this.lightColors,
        this.mode
      );

      // Apply the new theme to the UI
      this.themeService['applyTheme'](this.colors, this.mode);
      this.themeService.logoUpdated$.next(); // Notify subscribers (like the app component)

      // Wait for logo update event or timeout to avoid UI stalling
      await Promise.race([
        new Promise<void>((resolve) => {
          const sub = this.themeService.logoUpdated$.subscribe(() => {
            resolve();
            sub.unsubscribe();
          });
        }),
        new Promise((resolve) => setTimeout(resolve, 1000)), // fallback timeout
      ]);
    } catch (err) {
      console.error('Failed to apply theme:', err);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // Stop spinner
    }
  }
}

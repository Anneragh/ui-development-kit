import { CommonModule } from '@angular/common';
import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
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
export class ThemePickerComponent {
  title = 'Theme Picker';

  @ViewChild('logoImage') logoImageRef!: ElementRef<HTMLImageElement>;

  mode: 'light' | 'dark' = this.themeService.getCurrentMode();
  loading = false;

  colors: ThemeConfig = {
    primary: '',
    secondary: '',
    primaryText: '',
    secondaryText: '',
    hoverText: '',
    background: '',
    logoLight: '',
    logoDark: '',
  };

  ngOnInit() {
    const storedMode =
      (localStorage.getItem('themeMode') as 'light' | 'dark') ?? 'light';
    this.mode = storedMode;

    this.loadThemeForMode();

    // Move this below mode load
    this.themeService.theme$.subscribe((theme) => {
      const expectedMode = localStorage.getItem('themeMode');
      if (theme && expectedMode === this.mode) {
        this.colors = { ...theme };
      }
    });
  }

  onModeChange() {
    localStorage.setItem('themeMode', this.mode); // persist dropdown selection
    this.themeService.loadTheme(this.mode).then(() => {
      const saved = this.themeService['themeSubject'].value;
      if (saved) {
        this.colors = { ...saved }; // ⬅️ this is the key to updating the UI immediately
      }
    });
  }

  selectedLogoFile?: File;
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.selectedLogoFile = input.files[0];
  }

  loadThemeForMode() {
    this.themeService.loadTheme(this.mode).then(() => {
      const raw = this.themeService.getRawConfig(); // Add this method
      if (raw && raw[`theme-${this.mode}`]) {
        this.colors = structuredClone(raw[`theme-${this.mode}`]);
      } else {
        this.colors = this.themeService['themeSubject'].value ?? this.colors;
      }
    });
  }

  constructor(
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    this.themeService.theme$.subscribe((theme) => {
      if (theme) {
        this.colors = theme;
      }
    });
  }

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
    this.cdr.detectChanges(); // force UI to show spinner

    try {
      const timestamp = Date.now();

      if (this.selectedLogoFile) {
        const buffer = await this.readFileAsBuffer(this.selectedLogoFile);
        const fileName = this.mode === 'dark' ? 'logo-dark.png' : 'logo.png';

        await window.electronAPI?.writeLogo(buffer, fileName);

        if (this.mode === 'dark') {
          this.colors.logoDark = `assets/icons/${fileName}?${timestamp}`;
        } else {
          this.colors.logoLight = `assets/icons/${fileName}?${timestamp}`;
        }

        this.selectedLogoFile = undefined;
      }

      await this.themeService.saveTheme(this.colors, this.mode);
      await this.themeService.loadTheme(this.mode);

      await new Promise<void>((resolve) => {
        const sub = this.themeService.logoUpdated$.subscribe(() => {
          resolve();
          sub.unsubscribe();
        });
      });
    } catch (err) {
      console.error('Failed to apply theme:', err);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Add your component logic here
}

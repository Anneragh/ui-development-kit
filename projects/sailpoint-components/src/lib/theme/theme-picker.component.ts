import { Component } from '@angular/core';
import { ThemeService } from './theme.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeConfig } from './theme.service'; // adjust path if needed

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="theme-picker">
      <h2>Theme Customization</h2>

      <div class="form-group">
        <label>Mode</label>
        <select [(ngModel)]="mode" (change)="onModeChange()">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div class="form-group">
        <label>Primary Color</label>
        <div class="input-row">
          <input type="color" [(ngModel)]="colors.primary" />
          <input
            type="text"
            [(ngModel)]="colors.primary"
            maxlength="7"
            pattern="#[a-fA-F0-9]{6}"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Secondary Color</label>
        <div class="input-row">
          <input type="color" [(ngModel)]="colors.secondary" />
          <input
            type="text"
            [(ngModel)]="colors.secondary"
            maxlength="7"
            pattern="#[a-fA-F0-9]{6}"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Primary Text Color</label>
        <div class="input-row">
          <input type="color" [(ngModel)]="colors.primaryText" />
          <input
            type="text"
            [(ngModel)]="colors.primaryText"
            maxlength="7"
            pattern="#[a-fA-F0-9]{6}"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Secondary Text Color</label>
        <div class="input-row">
          <input type="color" [(ngModel)]="colors.secondaryText" />
          <input
            type="text"
            [(ngModel)]="colors.secondaryText"
            maxlength="7"
            pattern="#[a-fA-F0-9]{6}"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Hover Text Color</label>
        <div class="input-row">
          <input type="color" [(ngModel)]="colors.hoverText" />
          <input
            type="text"
            [(ngModel)]="colors.hoverText"
            maxlength="7"
            pattern="#[a-fA-F0-9]{6}"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Background Color</label>
        <div class="input-row">
          <input type="color" [(ngModel)]="colors.background" />
          <input
            type="text"
            [(ngModel)]="colors.background"
            maxlength="7"
            pattern="#[a-fA-F0-9]{6}"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Upload Logo</label>
        <input type="file" (change)="onFileSelected($event, 'logo')" />
      </div>

      <div class="form-group">
        <label>Upload Dark Logo</label>
        <input type="file" (change)="onFileSelected($event, 'logo-dark')" />
      </div>

      <button (click)="apply()">Apply</button>
    </div>
  `,
  styles: [
    `
      .theme-picker {
        max-width: 500px;
        margin: 2rem auto;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        font-family: 'Segoe UI', sans-serif;
        transition: background-color 0.3s ease, color 0.3s ease;
        background-color: var(--theme-background) !important;
        border: 1px solid var(--theme-primary-text) !important;
      }

      .theme-picker h2 {
        text-align: center;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
        color: var(--theme-primary-text, #333);
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.4rem;
        color: var(--theme-primary-text, #333);
      }

      .form-group select,
      .form-group input[type='text'] {
        width: 100%;
        padding: 0.5rem;
        font-size: 1rem;
      }

      .form-group input[type='text'] {
        font-family: monospace;
      }

      .input-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .input-row input[type='color'] {
        width: 45px;
        height: 45px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
      }

      button {
        width: 100%;
        padding: 0.75rem;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s ease, box-shadow 0.2s ease;
      }

      button:hover {
        background-color: var(--theme-secondary, #6c63ff);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
      }

      @media (max-width: 600px) {
        .theme-picker {
          padding: 1rem;
        }
      }
    `,
  ],
})


export class ThemePickerComponent {
  mode: 'light' | 'dark' =
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';

  colors: ThemeConfig = {
    primary: '',
    secondary: '',
    primaryText: '',
    secondaryText: '',
    hoverText: '',
    background: '',
    logo: '',
  };

  ngOnInit() {
    // Load theme for the initial mode
    this.themeService.loadTheme(this.mode).then(() => {
      const saved = this.themeService['themeSubject'].value;
      if (saved) this.colors = saved;
    });
  }

  onModeChange() {
    this.loadThemeForMode();
  }

  onFileSelected(event: Event, fileName: 'logo' | 'logo-dark') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = new Uint8Array(reader.result as ArrayBuffer);
      try {
        await window.electronAPI.writeLogo(buffer, `${fileName}.png`);
        // Update theme config to use the new path
        this.colors.logo = `assets/icons/${fileName}.png`;
      } catch (err) {
        console.error('Failed to write logo:', err);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  loadThemeForMode() {
    this.themeService.loadTheme(this.mode).then(() => {
      const saved = this.themeService['themeSubject'].value;
      if (saved) this.colors = saved;
    });
  }

  constructor(private themeService: ThemeService) {
    this.themeService.theme$.subscribe((theme) => {
      if (theme) {
        this.colors = theme;
      }
    });
  }

  apply() {
    this.themeService.saveTheme(this.colors, this.mode);
    this.themeService.loadTheme(this.mode);
  }
}

import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-json';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface DialogData {
  title?: string;
  message: string;
  showSpinner?: boolean;
  showCancel?: boolean;
  disableClose?: boolean;
}

@Component({
  selector: 'app-generic-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <h1 mat-dialog-title>
      <mat-icon *ngIf="data.showSpinner" class="title-icon">{{
        getTitleIcon()
      }}</mat-icon>
      {{ data.title || 'Notification' }}
    </h1>

    <div mat-dialog-content class="dialog-content">
      <div *ngIf="data.showSpinner" class="spinner-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
      <div class="copy-container" *ngIf="isJsonMessage">
        <button
          mat-icon-button
          (click)="copyToClipboard()"
          matTooltip="Copy to clipboard"
        >
          <mat-icon>content_copy</mat-icon>
        </button>
      </div>
      <ng-container *ngIf="!isUnsavedChangesPrompt">
        <pre class="dialog-message" *ngIf="isJsonMessage">
        <code class="language-json" [innerHTML]="highlightedJson"></code>
      </pre>

        <pre class="dialog-message" *ngIf="!isJsonMessage">
        {{ formattedMessage }}
      </pre
        >
      </ng-container>
      <p *ngIf="data.showSpinner && isOAuthFlow()" class="oauth-instruction">
        <mat-icon class="info-icon">info</mat-icon>
        Please complete the authentication in your browser window and return
        here.
      </p>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="onClose()" *ngIf="data.showCancel !== false">
        {{ data.showSpinner ? 'Cancel' : 'Close' }}
      </button>

      <ng-container *ngIf="isUnsavedChangesPrompt">
        <button mat-button color="warn" (click)="onDiscard()">Discard</button>
        <button mat-button color="primary" (click)="onSave()">Save</button>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .dialog-content {
        min-width: 300px;
        padding: 20px 0;
      }

      .spinner-container {
        display: flex;
        justify-content: center;
        margin: 20px 0;
      }

      .copy-container {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 4px;
        margin-right: 20px;
      }

      .dialog-message {
        overflow-x: auto;
        border-radius: 4px;
        font-family: 'Fira Code', monospace;
        color: #f8f8f2;
      }

      .dialog-message {
        padding: 0;
        overflow-x: auto;
      }

      .dialog-message code {
        display: block;
        padding: 16px;
      }

      .dialog-message.json {
        text-align: left;
        margin: 16px 0;
        font-size: 14px;
        line-height: 1.4;
      }

      .oauth-instruction {
        background-color: #e3f2fd;
        padding: 12px;
        border-radius: 4px;
        border-left: 3px solid #2196f3;
        margin: 16px 0 0 0;
        font-size: 13px;
        color: #1976d2;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .info-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #2196f3;
      }

      .title-icon {
        margin-right: 8px;
        vertical-align: middle;
      }

      h1[mat-dialog-title] {
        display: flex;
        align-items: center;
        margin-bottom: 0;
      }
    `,
  ],
})
export class GenericDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<GenericDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  get isUnsavedChangesPrompt(): boolean {
    return (
      this.data.message?.trim() ===
      'You have unsaved changes. Do you want to save them before leaving?'
    );
  }

  onSave() {
    this.dialogRef.close('confirm');
  }

  onDiscard() {
    this.dialogRef.close('discard');
  }
  onClose(): void {
    this.dialogRef.close();
  }

  getTitleIcon(): string {
    if (this.data.title?.includes('Successful')) {
      return 'check_circle';
    } else if (
      this.data.title?.includes('Failed') ||
      this.data.title?.includes('Error')
    ) {
      return 'error';
    } else {
      return 'login';
    }
  }

  get formattedMessage(): string {
    try {
      return JSON.stringify(JSON.parse(this.data.message), null, 2);
    } catch {
      return this.data.message;
    }
  }

  get isJsonMessage(): boolean {
    try {
      JSON.parse(this.data.message);
      return true;
    } catch {
      return false;
    }
  }

  get highlightedJson(): string {
    try {
      const json = JSON.stringify(JSON.parse(this.data.message), null, 2);
      return Prism.highlight(json, Prism.languages.json, 'json');
    } catch {
      return this.data.message;
    }
  }

  copyToClipboard(): void {
    const textToCopy = this.formattedMessage;
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Optional: show some feedback
      console.log('Copied to clipboard');
    });
  }

  isOAuthFlow(): boolean {
    return (
      this.data.title?.includes('OAuth') ||
      this.data.message?.includes('OAuth') ||
      this.data.message?.includes('browser')
    );
  }
}

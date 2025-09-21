import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export interface JokeData {
  joke: string;
  punchline: string;
}

@Component({
  selector: 'app-joke-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './joke-dialog.component.html',
  styleUrl: './joke-dialog.component.scss',
})
export class JokeDialogComponent {
  showPunchline = false;

  constructor(
    public dialogRef: MatDialogRef<JokeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JokeData
  ) {}

  revealPunchline(): void {
    this.showPunchline = true;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}

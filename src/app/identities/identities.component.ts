import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { SailPointSDKService } from 'sailpoint-components';
import { MatDialog } from '@angular/material/dialog';
import { IdentityV2025 } from 'sailpoint-api-client';
import { GenericDialogComponent } from '../../../projects/sailpoint-components/src/lib/generic-dialog/generic-dialog.component';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  CdkDragDrop,
  DragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-identities',
  imports: [
    MatTableModule,
    CommonModule,
    MatProgressSpinnerModule,
    DragDropModule,
  ],
  templateUrl: './identities.component.html',
  styleUrl: './identities.component.scss',
})
export class IdentitiesComponent implements OnInit {
  identities: IdentityV2025[] = [];
  allColumns: string[] = [];
  displayedColumns: string[] = [];
  loading = false;
  hasDataLoaded = false;
  showColumnSelector = false;
  columnOrder: string[] = [];

  constructor(private dialog: MatDialog, private sdk: SailPointSDKService) {}

  ngOnInit() {
    void this.loadIdentities();
  }

  async loadIdentities() {
    this.loading = true;
    this.hasDataLoaded = false;

    try {
      const response = await this.sdk.listIdentities();
      this.identities = response.data ?? [];

      if (this.identities.length > 0) {
        this.allColumns = Object.keys(this.identities[0]);
        this.columnOrder = [...this.allColumns];
        this.displayedColumns = [...this.allColumns];
      }

      this.hasDataLoaded = true;
    } catch (error) {
      this.openMessageDialog(
        'Error loading identities: ' + String(error),
        'Error'
      );
    } finally {
      this.loading = false;
    }
  }

  toggleColumn(column: string): void {
    const isVisible = this.displayedColumns.includes(column);

    if (isVisible) {
      this.displayedColumns = this.displayedColumns.filter((c) => c !== column);
    } else {
      // Insert column back at its original `columnOrder` position
      const indexInOrder = this.columnOrder.indexOf(column);

      const newDisplay = [...this.displayedColumns];
      newDisplay.splice(indexInOrder, 0, column);

      // Sort by columnOrder to maintain intended order
      this.displayedColumns = this.columnOrder.filter((c) =>
        newDisplay.includes(c)
      );
    }
  }

  dropColumn(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.columnOrder, event.previousIndex, event.currentIndex);

    // Re-sort visible columns (only reorder visible ones)
    const visible = this.displayedColumns.filter((col) =>
      this.columnOrder.includes(col)
    );
    this.displayedColumns = this.columnOrder.filter((c) => visible.includes(c));
  }

  isColumnDisplayed(column: string): boolean {
    return this.displayedColumns.includes(column);
  }

  trackByFn(index: number, item: string): string {
    return item;
  }

  openMessageDialog(errorMessage: string, title: string): void {
    this.dialog.open(GenericDialogComponent, {
      data: {
        title: title,
        message: errorMessage,
      },
    });
  }
}

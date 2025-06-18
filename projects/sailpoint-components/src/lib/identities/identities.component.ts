import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  ElementRef,
  HostListener,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { IdentityV2025 } from 'sailpoint-api-client';
import { SailPointSDKService } from 'sailpoint-components';
import { GenericDialogComponent } from '../generic-dialog/generic-dialog.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-identities',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    CommonModule,
    MatProgressSpinnerModule,
    DragDropModule,
    MatPaginatorModule, // Added this import
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
  pageSize = 10;
  pageIndex = 0;
  totalCount = 0; // Added totalCount property
  searchQuery = '';
  filteredIdentities: IdentityV2025[] = [];
  @ViewChild('dropdownPanel') dropdownPanel!: ElementRef;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private sdk: SailPointSDKService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    void this.loadIdentities();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (
      this.showColumnSelector &&
      this.dropdownPanel &&
      !this.dropdownPanel.nativeElement.contains(target) &&
      !target.closest('.customizeColumnsToggle')
    ) {
      this.showColumnSelector = false;
    }
  }

  onPageChange(event: PageEvent) {
    console.log('Page change event:', event);
    console.log('Previous state:', {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    });

    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;

    console.log('New state:', {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    });

    this.loadIdentities();
  }

  async loadIdentities() {
    this.loading = true;
    this.hasDataLoaded = false;

    try {
      const offset = this.pageIndex * this.pageSize;
      const limit = this.pageSize;

      const request = {
        offset: offset,
        limit: limit,
        count: true,
      };

      const response = await this.sdk.listIdentities(request);
      this.identities = response.data ?? [];

      let count: number | undefined;
      if (
        response.headers &&
        typeof (response.headers as any).get === 'function'
      ) {
        const headerValue = (response.headers as any).get('X-Total-Count');
        count = headerValue ? Number(headerValue) : undefined;
      } else if (
        response.headers &&
        typeof (response.headers as any)['x-total-count'] !== 'undefined'
      ) {
        count = Number((response.headers as any)['x-total-count']);
      }

      this.totalCount = count ?? 500;

      // Only initialize columns once
      if (this.allColumns.length === 0 && this.identities.length > 0) {
        this.allColumns = Object.keys(this.identities[0]);
        this.columnOrder = [...this.allColumns];
        this.displayedColumns = [...this.allColumns];
        this.filteredIdentities = [...this.identities]; // set initially
        this.applyFilter(); // apply any existing search filter
      }

      this.hasDataLoaded = true;
      this.cdr.detectChanges();
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

  applyFilter(): void {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      this.filteredIdentities = [...this.identities];
      return;
    }

    this.filteredIdentities = this.identities.filter((identity) =>
      Object.values(identity).some((value) =>
        value?.toString().toLowerCase().includes(query)
      )
    );
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

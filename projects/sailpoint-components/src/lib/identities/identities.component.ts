import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
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
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { ColumnCustomizerComponent } from '../column-customizer/column-customizer.component';

@Component({
  selector: 'app-identities',
  standalone: true,
  imports: [
    MatTableModule,
    CommonModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    SearchBarComponent,
    ColumnCustomizerComponent,
  ],
  templateUrl: './identities.component.html',
  styleUrl: './identities.component.scss',
})
export class IdentitiesComponent implements OnInit {
  identities: IdentityV2025[] = [];
  filteredIdentities: IdentityV2025[] = [];
  columnOrder: string[] = [];
  displayedColumns: string[] = [];
  allColumns: string[] = [];
  loading = false;
  hasDataLoaded = false;
  pageSize = 10;
  pageIndex = 0;
  totalCount = 0;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private sdk: SailPointSDKService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    void this.loadIdentities();
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

      if (this.allColumns.length === 0 && this.identities.length > 0) {
        this.allColumns = Object.keys(this.identities[0]);
        this.columnOrder = [...this.allColumns];
        this.displayedColumns = [...this.allColumns];
      }

      // ✅ always update for current page
      this.filteredIdentities = [...this.identities];

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

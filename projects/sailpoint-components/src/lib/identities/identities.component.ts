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
import { SailPointSDKService } from '../sailpoint-sdk.service';
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
  sorters: string[] = [];

  readonly sortableFields = ['name', 'alias', 'identityStatus'];
  readonly sortFieldMap: Record<string, string> = {
    identityStatus: 'cloudStatus',
  };
  readonly columnDisplayNames: Record<string, string> = {
    alias: 'Username',
    emailAddress: 'Email',
    lifecycleState: 'Lifecycle State',
    name: 'Name',
    viewAction: 'Action',
    // Add more as needed
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private sdk: SailPointSDKService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    void this.loadIdentities();
  }

  async loadIdentities() {
    this.loading = true;
    this.hasDataLoaded = false;

    try {
      const offset = this.pageIndex * this.pageSize;
      const limit = this.pageSize;
      const sortersParam = this.sorters.join(',');

      const request = {
        offset,
        limit,
        count: true,
        sorters: sortersParam || undefined,
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

        if (!this.columnOrder.includes('viewAction')) {
          this.columnOrder.push('viewAction');
        }

        this.displayedColumns = [
          'alias',
          'emailAddress',
          'name',
          'lifecycleState',
        ];
        // this.displayedColumns = [...this.allColumns];
        if (!this.displayedColumns.includes('viewAction')) {
          this.displayedColumns.push('viewAction');
        }
      }

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

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadIdentities();
  }

  toggleSort(displayColumn: string): void {
    if (!this.sortableFields.includes(displayColumn)) return;

    const apiField = this.sortFieldMap[displayColumn] || displayColumn;
    const existingIndex = this.sorters.findIndex(
      (s) => s === apiField || s === `-${apiField}`
    );

    if (existingIndex > -1) {
      const isAsc = !this.sorters[existingIndex].startsWith('-');
      this.sorters[existingIndex] = isAsc ? `-${apiField}` : '';
      if (!this.sorters[existingIndex]) this.sorters.splice(existingIndex, 1);
    } else {
      this.sorters.push(apiField);
    }

    this.loadIdentities();
  }

  isSorted(column: string): boolean {
    const apiField = this.sortFieldMap[column] || column;
    return this.sorters.some((s) => s === apiField || s === `-${apiField}`);
  }

  getSortSymbol(displayColumn: string): string | null {
    const apiField = this.sortFieldMap[displayColumn] || displayColumn;
    const match = this.sorters.find(
      (s) => s === apiField || s === `-${apiField}`
    );
    if (!match) return null;
    return match.startsWith('-') ? '▼' : '▲';
  }

  clearSort(): void {
    this.sorters = [];
    this.loadIdentities();
  }

  trackByFn(index: number, item: string): string {
    return item;
  }

  async onView(identity: IdentityV2025): Promise<void> {
    try {
      if (!identity.id) {
        this.openMessageDialog('Identity ID is missing.', 'Error');
        return;
      }
      const response = await this.sdk.getIdentity({ id: identity.id });
      const details = JSON.stringify(response.data, null, 2);
      this.openMessageDialog(
        details,
        `Identity Details: ${identity.name || identity.id}`
      );
    } catch (error) {
      this.openMessageDialog(
        `Failed to load identity details: ${String(error)}`,
        'Error'
      );
    }
  }

  getIdentityById(id: string): Promise<IdentityV2025> {
    return this.sdk.getIdentity({ id }).then((res) => res.data);
  }

  openMessageDialog(errorMessage: string, title: string): void {
    this.dialog.open(GenericDialogComponent, {
      minWidth: '800px',
      data: {
        title: title,
        message: errorMessage,
      },
    });
  }

  onViewAttributes(identity: IdentityV2025): void {
    const attributes = identity.attributes ?? {};
    const formatted = JSON.stringify(attributes, null, 2);
    this.openMessageDialog(
      formatted,
      `Attributes: ${identity.name || identity.id}`
    );
  }

  formatValue(column: string, value: any): string {
    if (column === 'lifecycleState') {
      if (!value) return '–';

      const state = value.stateName ?? '';
      const manual = value.manuallyUpdated ? ' (manual)' : '';
      return `${this.capitalize(state)}${manual}`;
    }

    // Default case: return as-is or JSON stringify for objects
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return value ?? '–';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

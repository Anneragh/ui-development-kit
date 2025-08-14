import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AccountV2025 } from 'sailpoint-api-client';
import { ColumnCustomizerComponent } from '../identities/utils/column-customizer/column-customizer.component';
import { SearchBarComponent } from '../identities/utils/search-bar/search-bar.component';
import { SailPointSDKService } from '../sailpoint-sdk.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    SearchBarComponent,
    ColumnCustomizerComponent,
  ],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'], // <- plural
})
export class AccountsComponent implements OnInit {
  title = 'Accounts';
  accounts: (AccountV2025 & Record<string, unknown>)[] = [];
  displayedColumns: string[] = [];
  loading = false;
  hasDataLoaded = false;

  constructor(private sdk: SailPointSDKService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    void this.loadAccounts();
  }

  async loadAccounts() {
    this.loading = true;
    this.hasDataLoaded = false;
    this.displayedColumns = []; // start empty to avoid mismatch

    try {
      const response = await this.sdk.listAccounts();
      this.accounts = (response.data ?? []) as (AccountV2025 & Record<string, unknown>)[];

      if (this.accounts.length) {
        // Union of keys across all rows so every column has a definition
        const keySet = new Set<string>();
        for (const row of this.accounts) {
          Object.keys(row ?? {}).forEach(k => keySet.add(k));
        }

        // If you need to hide obviously nested objects by default, filter here:
        // const sample = this.accounts[0];
        // const columns = [...keySet].filter(k => typeof (sample as any)[k] !== 'object');

        const columns = [...keySet];

        // Optional: sort for stability
        columns.sort((a, b) => a.localeCompare(b));

        this.displayedColumns = columns;
      }

      this.hasDataLoaded = true;
      this.cdr.detectChanges();

      console.log('Loaded accounts:', this.accounts);
      console.log('Columns:', this.displayedColumns);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      this.loading = false;
    }
  }

  formatValue(_column: string, value: unknown): string {
    if (value === null || value === undefined) return '–';
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  trackByFn(_index: number, item: string): string {
    return item;
  }
}

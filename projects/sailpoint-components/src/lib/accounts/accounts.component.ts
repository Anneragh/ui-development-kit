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
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent implements OnInit {
  title = 'Accounts';
  accounts: AccountV2025[] & Record<string, unknown>[] = [];
  displayedColumns: string[] = [];
  allColumns: string[] = [];
  loading = false;
  hasDataLoaded = false;




  constructor(private sdk: SailPointSDKService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Load initial data
    void this.loadAccounts();
  }

  async loadAccounts() {
    this.loading = true;
    this.hasDataLoaded = false;
    this.displayedColumns = ['isMachine'];

    try {
      const response = await this.sdk.listAccounts();
      this.accounts = (response.data ?? []) as AccountV2025[] &
              Record<string, unknown>[];

      this.allColumns = Object.keys(this.accounts[0]);
      this.displayedColumns = [...this.allColumns];
      this.hasDataLoaded = true;
      this.cdr.detectChanges();

      console.log('Loaded accounts:', this.accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      this.loading = false;
    }
  }

    // Format column values for display
  formatValue(column: string, value: any): string {
    if (value === null || value === undefined) return '–';
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  // For *ngFor trackBy
  trackByFn(index: number, item: string): string {
    return item;
  }
}

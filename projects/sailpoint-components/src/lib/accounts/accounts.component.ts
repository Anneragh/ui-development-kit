import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { SailPointSDKService } from '../sailpoint-sdk.service';
import { AccountV2025 } from 'sailpoint-api-client';

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
    MatPaginatorModule
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent implements OnInit {
  title = 'Accounts';
  loading = true;
  accounts: AccountV2025[] = [];
  displayedColumns: string[] = ['id', 'name', 'nativeIdentity', 'sourceId', 'disabled', 'locked', 'actions'];

  constructor(private sdk: SailPointSDKService) {}

  ngOnInit() {
    // Load initial data
    void this.loadAccounts();
  }

  private async loadAccounts() {
    this.loading = true;
    try {
      const response = await this.sdk.listAccounts();
      this.accounts = response.data as AccountV2025[];
      console.log('Loaded accounts:', this.accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      this.loading = false;
    }
  }

  viewAccount(account: AccountV2025): void {
    console.log('Viewing account:', account);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { IdentityV2025 } from 'sailpoint-api-client';
import { SailPointSDKService } from '../sailpoint-sdk.service';

// Import chart components
import { IdentityStatusChartComponent } from './identity-status-chart/identity-status-chart.component';
import { ManagerDistributionChartComponent } from './manager-distribution-chart/manager-distribution-chart.component';
import { LifecycleStateChartComponent } from './lifecycle-state-chart/lifecycle-state-chart.component';

@Component({
  selector: 'app-report-example',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDividerModule,
    IdentityStatusChartComponent,
    ManagerDistributionChartComponent,
    LifecycleStateChartComponent
  ],
  templateUrl: './report-example.component.html',
  styleUrl: './report-example.component.scss'
})
export class ReportExampleComponent implements OnInit {
  title = 'Identity Analytics';
  
  // Data properties
  identities: IdentityV2025[] = [];
  loading = false;
  hasError = false;
  errorMessage = '';
  
  // No longer need chart ViewChild references or dimensions as they are now handled by the child components
  
  constructor(private sdk: SailPointSDKService) {}
  
  ngOnInit() {
    void this.loadIdentities();
  }
  
  async loadIdentities() {
    this.loading = true;
    this.hasError = false;
    
    try {
      const response = await this.sdk.listIdentities({ limit: 250 });
      this.identities = response.data || [];
      this.renderCharts();
    } catch (error) {
      this.hasError = true;
      this.errorMessage = `Error loading identities: ${String(error)}`;
    } finally {
      this.loading = false;
    }
  }
  
  renderCharts() {
    // No longer need to explicitly render charts as this is now handled by the child components
  }
  
  // Chart rendering methods are now in their respective components
  
  // Moved to ManagerDistributionChartComponent
  
  // Moved to LifecycleStateChartComponent
  
  refresh() {
    void this.loadIdentities();
  }
}

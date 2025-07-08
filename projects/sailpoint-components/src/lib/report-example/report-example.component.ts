import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
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
import { ReportDataService } from './report-data.service';

// Import chart components
import { IdentityStatusChartComponent } from './identity-status-chart/identity-status-chart.component';
import { ManagerDistributionChartComponent } from './manager-distribution-chart/manager-distribution-chart.component';
import { LifecycleStateChartComponent } from './lifecycle-state-chart/lifecycle-state-chart.component';

@Component({
  selector: 'app-report-example',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
  loadingMessage = 'Loading identity data...';
  isCancelled = false;
  isLoadingComplete = false;
  
  // Data properties
  identities: IdentityV2025[] = [];
  loading = false;
  hasError = false;
  errorMessage = '';
  totalLoaded = 0;

  constructor(private sdk: SailPointSDKService, private dataService: ReportDataService) {}
  
  ngOnInit() {
    void this.loadIdentities();
  }
  
  cancelLoading() {
    this.isCancelled = true;
    console.log('Loading cancelled by user');
    this.loadingMessage = 'Loading cancelled. Displaying partial results...';
  }

  async loadIdentities() {
    this.loading = true;
    this.hasError = false;
    this.identities = [];
    this.isCancelled = false;
    this.isLoadingComplete = false;
    
    const BATCH_SIZE = 250; // API max limit
    let offset = 0;
    let hasMoreData = true;
    this.totalLoaded = 0;
    
    try {
      // Continue fetching until there's no more data or user cancels
      while (hasMoreData && !this.isCancelled) {
        // Update loading message with current progress
        this.loadingMessage = `Loading identities... (${this.totalLoaded} loaded so far)`;
        
        const response = await this.sdk.listIdentities({ 
          limit: BATCH_SIZE, 
          offset: offset,
          count: true // Request total count in headers
        });
        
        const batchData = response.data || [];
        
        // Add the batch to our collected identities
        this.identities = [...this.identities, ...batchData];
        this.totalLoaded = this.identities.length;
        
        // Check if we've reached the end of the data
        if (batchData.length < BATCH_SIZE) {
          hasMoreData = false;
          this.isLoadingComplete = true;
        } else {
          // Increase offset for next batch
          offset += BATCH_SIZE;
        }
      }
      
      if (this.isCancelled) {
        console.log(`Loading cancelled. Loaded ${this.identities.length} identities so far.`);
      } else {
        console.log(`Completed loading ${this.identities.length} total identities`);
        this.isLoadingComplete = true;
      }
      
      this.loadingMessage = 'Loading identity data...'; // Reset the message for next time
      
      // Store identities in the shared service
      this.dataService.setIdentities(this.identities);
      
    
    } catch (error) {
      this.hasError = true;
      this.errorMessage = `Error loading identities: ${String(error)}`;
    } finally {
      this.loading = false;
    }
  }
  
  
  refresh() {
    void this.loadIdentities();
  }
}

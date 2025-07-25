import { Component } from '@angular/core';
import { SailPointSDKService } from 'sailpoint-components';
import { TenantV2025 } from 'sailpoint-api-client';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-tenant-data',
  imports: [MatCardModule],
  templateUrl: './tenant-data-card.component.html',
  styleUrl: './tenant-data-card.component.scss'
})

export class TenantDataCardComponent {
  sdk: SailPointSDKService;
  tenantDetails: TenantV2025 | undefined;

  constructor() {
    this.sdk = new SailPointSDKService();
  }

  ngOnInit() {
    this.getTenantDetails();
  }

  async getTenantDetails() {
    const tenant = await this.sdk.getTenant();
    this.tenantDetails = tenant.data;
  }
}

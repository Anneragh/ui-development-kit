import { Component } from '@angular/core';
import { SailPointSDKService } from 'sailpoint-components';
import { TenantV2025 } from 'sailpoint-api-client';

@Component({
  selector: 'app-connected',
  imports: [],
  templateUrl: './connected.component.html',
  styleUrl: './connected.component.scss'
})

export class ConnectedComponent {
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
    console.log(tenant.data);
    this.tenantDetails = tenant.data;
  }
}

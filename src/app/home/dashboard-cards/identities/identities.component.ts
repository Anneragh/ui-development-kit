import { Component, OnInit } from '@angular/core';
import { AxiosResponse } from 'axios';
import { IdentityV2025 } from 'sailpoint-api-client';
import { SailPointSDKService } from 'sailpoint-components';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-identities',
  imports: [MatCardModule],
  templateUrl: './identities.component.html',
  styleUrl: './identities.component.scss'
})
export class IdentitiesComponent implements OnInit {
  sdk: SailPointSDKService;
  identities: AxiosResponse<Array<IdentityV2025>, any> | undefined;

  constructor() {
    this.sdk = new SailPointSDKService();
  }

  ngOnInit() {
   void this.getIdentities();
  }

  async getIdentities() {
    const identities = await this.sdk.listIdentities({
      count: true
    });
    this.identities = identities;
  }
}
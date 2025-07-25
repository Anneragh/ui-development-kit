import { Component } from '@angular/core';
import { AxiosResponse } from 'axios';
import { IdentityProfile } from 'sailpoint-api-client';
import { SailPointSDKService } from 'sailpoint-components';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-identity-profiles',
  imports: [MatCardModule],
  templateUrl: './identity-profiles.component.html',
  styleUrl: './identity-profiles.component.scss'
})
export class IdentityProfilesComponent {
  sdk: SailPointSDKService;
  identityProfiles: AxiosResponse<Array<IdentityProfile>, any> | undefined;

  constructor() {
    this.sdk = new SailPointSDKService();
  }

  ngOnInit() {
    this.getIdentityProfiles();
  }

  async getIdentityProfiles() {
    const identityProfiles = await this.sdk.listIdentityProfiles({
      count: true
    });
    this.identityProfiles = identityProfiles;
  }
}
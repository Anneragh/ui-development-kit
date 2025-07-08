import { Injectable } from '@angular/core';
import { IdentityV2025 } from 'sailpoint-api-client';

@Injectable({
  providedIn: 'root'
})
export class ReportDataService {
  private identities: IdentityV2025[] = [];

  constructor() {}

  setIdentities(identities: IdentityV2025[]) {
    this.identities = [...identities];
  }

  getIdentities(): IdentityV2025[] {
    return [...this.identities]; // Return a copy to prevent direct modification
  }

  clearIdentities() {
    this.identities = [];
  }
}
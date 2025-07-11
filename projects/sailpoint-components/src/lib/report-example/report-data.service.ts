import { Injectable } from '@angular/core';
import { IdentityV2025 } from 'sailpoint-api-client';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportDataService {
  private identities: IdentityV2025[] = [];
  private dataLoadedSubject = new BehaviorSubject<boolean>(false);
  private isCompleteDataSubject = new BehaviorSubject<boolean>(false);
  
  // Expose as observable to allow components to react to data loaded state
  public dataLoaded$: Observable<boolean> = this.dataLoadedSubject.asObservable();
  public isCompleteData$: Observable<boolean> = this.isCompleteDataSubject.asObservable();

  constructor() {}

  setIdentities(identities: IdentityV2025[], isCompleteDataset: boolean) {
    this.identities = [...identities];
    this.dataLoadedSubject.next(true);
    this.isCompleteDataSubject.next(isCompleteDataset);
  }

  getIdentities(): IdentityV2025[] {
    return [...this.identities]; // Return a copy to prevent direct modification
  }

  clearIdentities() {
    this.identities = [];
    this.dataLoadedSubject.next(false);
    this.isCompleteDataSubject.next(false);
  }
  
  hasLoadedData(): boolean {
    return this.dataLoadedSubject.getValue() && this.identities.length > 0;
  }
  
  isDataComplete(): boolean {
    return this.isCompleteDataSubject.getValue();
  }
}
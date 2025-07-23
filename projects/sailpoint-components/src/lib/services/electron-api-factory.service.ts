import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { WebApiService, ElectronAPIInterface } from './web-api.service';

/**
 * A simplified service that provides API access for both Electron and Web environments.
 * No longer attempts to modify window.electronAPI as that's handled by Electron's preload script.
 */
@Injectable({
  providedIn: 'root'
})
export class ElectronApiFactoryService {
  /**
   * Get the appropriate API based on environment
   */
  public getApi(): ElectronAPIInterface {
    if (this.electronService.isElectron) {
      return this.electronService.electronAPI;
    } else {
      return this.webApiService;
    }
  }
  
  constructor(
    private electronService: ElectronService,
    private webApiService: WebApiService
  ) {}
  
  /**
   * Configure the web API URL (only applies to web mode)
   */
  configureApiUrl(url: string): void {
    if (!this.electronService.isElectron) {
      this.webApiService.setApiUrl(url);
    }
  }
}
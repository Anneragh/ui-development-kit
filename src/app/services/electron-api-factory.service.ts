import { Injectable, NgZone, Optional } from '@angular/core';
import { ElectronService } from '../core/services/electron/electron.service';
import { WebApiService, ElectronAPIInterface } from './web-api.service';

/**
 * Factory service that provides the appropriate API implementation based on platform
 * For Electron, it will use the actual Electron API
 * For web, it will use the WebApiService that communicates with a backend
 */
@Injectable({
  providedIn: 'root'
})
export class ElectronApiFactoryService {
  private api: ElectronAPIInterface;
  
  constructor(
    private electronService: ElectronService,
    private webApiService: WebApiService,
    private ngZone: NgZone
  ) {
    // Determine which API to use
    if (this.electronService.isElectron) {
      // In Electron environment, use the actual Electron API
      this.api = this.wrapElectronApi(this.electronService.electronAPI);
    } else {
      // In web environment, use the web API service
      this.api = this.webApiService;
    }

    // Make the API available globally through window object
    this.setupWindowApi();
  }

  /**
   * Wraps the Electron API to ensure that callbacks run in the Angular zone
   * to trigger change detection properly
   */
  private wrapElectronApi(electronApi: any): ElectronAPIInterface {
    const wrappedApi: any = {};
    
    // Wrap each method to ensure it runs in Angular's zone
    for (const key of Object.getOwnPropertyNames(electronApi)) {
      const value = electronApi[key];
      
      if (typeof value === 'function') {
        wrappedApi[key] = (...args: any[]) => {
          return new Promise((resolve, reject) => {
            Promise.resolve(value(...args))
              .then(result => {
                // Run inside Angular zone to ensure change detection happens
                this.ngZone.run(() => resolve(result));
              })
              .catch(error => {
                // Run inside Angular zone to ensure change detection happens
                this.ngZone.run(() => reject(error));
              });
          });
        };
      } else {
        wrappedApi[key] = value;
      }
    }
    
    return wrappedApi as ElectronAPIInterface;
  }

  /**
   * Setup the API on the window object
   */
  private setupWindowApi(): void {
    // Create a proxy to handle dynamic SDK method calls
    const apiProxy = new Proxy(this.api, {
      get: (target, prop) => {
        if (prop in target) {
          return target[prop as keyof typeof target];
        }
        
        // Handle any SDK method calls dynamically
        if (typeof prop === 'string') {
          return (...args: any[]) => {
            if (this.electronService.isElectron) {
              // In Electron, call the method directly
              return this.electronService.electronAPI[prop](...args);
            } else {
              // In web, call through the SDK proxy
              return this.webApiService.callSdkMethod(prop, ...args);
            }
          };
        }
        
        return undefined;
      }
    });

    // Set up the API on the window object
    (window as any).electronAPI = apiProxy;
  }

  /**
   * Get the API implementation
   */
  getApi(): ElectronAPIInterface {
    return this.api;
  }

  /**
   * Configure the web API URL (only applies to web mode)
   */
  configureApiUrl(url: string): void {
    if (!this.electronService.isElectron) {
      this.webApiService.setApiUrl(url);
    }
  }
}
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app.routes';
import { AppComponent } from './app.component';

import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { ElectronApiFactoryService } from './services/electron-api-factory.service';
import { environment } from '../environments/environment';

/**
 * Factory function to initialize the Electron API Factory
 */
function initializeElectronApi(apiFactory: ElectronApiFactoryService) {
  return () => {
    // If running in web mode and an API URL is set in the environment, configure it
    if (environment.webApiUrl) {
      apiFactory.configureApiUrl(environment.webApiUrl);
    }
    
    // Return a resolved promise to indicate initialization is complete
    return Promise.resolve();
  };
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    CoreModule,
    SharedModule,
    AppRoutingModule
  ],
  providers: [
    // Initialize the Electron API Factory before the app starts
    {
      provide: APP_INITIALIZER,
      useFactory: initializeElectronApi,
      deps: [ElectronApiFactoryService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
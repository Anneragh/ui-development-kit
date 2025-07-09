import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withHashLocation } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { CoreModule } from './app/core/core.module';
import { SharedModule } from './app/shared/shared.module';
import { appRoutes } from './app/app.routes';


const fs = require('fs');
const path = require('path');

import { ipcMain, IpcMainInvokeEvent } from 'electron';

ipcMain.handle(
  'write-logo-file',
  async (_event: IpcMainInvokeEvent, buffer: Uint8Array, fileName: string) => {
    const fs = require('fs');
    const path = require('path');
    const dest = path.join(__dirname, 'assets', 'icons', fileName);
    await fs.promises.writeFile(dest, buffer);
  }
);


// AoT-compatible translate loader factory
export const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>
  new TranslateHttpLoader(http, './assets/i18n/', '.json');

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(appRoutes, withHashLocation()),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient],
        },
      }),
      CoreModule,
      SharedModule,

    )
  ],
}).catch((err) => console.error(err));

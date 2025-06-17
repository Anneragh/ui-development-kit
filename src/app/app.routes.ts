import { Routes } from '@angular/router';
import { IdentitiesComponent, TransformsComponent } from 'sailpoint-components';
import { TransformBuilderComponent } from '../../projects/sailpoint-components/src/lib/transforms/transform-builder/transform-builder.component';
import { campaignsComponent } from './campaigns/campaigns.component';
import { PageNotFoundComponent } from './shared/components';

import { SailPointImportsComponent } from './sailpoint-imports/sailpoint-imports.component';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'transforms',
    component: TransformsComponent
  },
  {
    path: 'identities',
    component: IdentitiesComponent
  },
  {
    path: 'campaigns',
    component: campaignsComponent
  },
  {
    path: 'transform-builder',
    component: TransformBuilderComponent
  },
  {
    path: 'component',
    component: SailPointImportsComponent
  },

  {
    path: '**',
    component: PageNotFoundComponent
  }
];

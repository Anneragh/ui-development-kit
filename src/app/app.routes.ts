import { Routes } from '@angular/router';
import { campaignsComponent } from './campaigns/campaigns.component';
import { IdentitiesComponent, REPORT_EXAMPLE_ROUTES } from 'sailpoint-components';
import { PageNotFoundComponent } from './shared/components';
import { TransformBuilderComponent } from 'sailpoint-components';
import { TransformsComponent } from 'sailpoint-components';
import { HomeComponent } from './home/home.component';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent
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
    path: 'component-selector',
    loadComponent: () => import('./component-selector/component-selector.component').then(m => m.ComponentSelectorComponent)
  },

  {
    path: 'report-example',
    children: REPORT_EXAMPLE_ROUTES
  },

  {
    path: '**',
    component: PageNotFoundComponent
  }
];

import { Routes } from '@angular/router';
import { IdentitiesComponent, REPORT_EXAMPLE_ROUTES, TransformBuilderComponent, TransformsComponent, VelocityEditorDialogComponent } from 'sailpoint-components';
import { campaignsComponent } from './campaigns/campaigns.component';
import { HomeComponent } from './home/home.component';
import { PageNotFoundComponent } from './shared/components';

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
    path: 'velocity-editor-dialog',
    component: VelocityEditorDialogComponent
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

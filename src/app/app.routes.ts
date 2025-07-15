import { Routes } from '@angular/router';
import { REPORT_EXAMPLE_ROUTES , IdentitiesComponent } from 'sailpoint-components';
import { PageNotFoundComponent } from './shared/components';
import { TransformBuilderComponent } from 'sailpoint-components';
import { TransformsComponent } from 'sailpoint-components';
import { HomeComponent } from './home/home.component';
import  { ThemePickerComponent } from 'sailpoint-components';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'theme-picker',
    component: ThemePickerComponent
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
    path: 'transform-builder',
    component: TransformBuilderComponent
  },
  {
    path: 'component-selector',
    loadComponent: () => import('./component-selector/component-selector.component').then(m => m.ComponentSelectorComponent)
  },

  {
    path: 'theme-picker',
    component: ThemePickerComponent
  },
  {
    path: 'report-example',
    children: REPORT_EXAMPLE_ROUTES
  },

  {
    path: 'identities',
    component: IdentitiesComponent
  },

  {
    path: '**',
    component: PageNotFoundComponent
  }
];

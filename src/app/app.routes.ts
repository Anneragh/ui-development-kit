import { Routes } from '@angular/router';
import { AttachRuleComponent, IdentitiesComponent, REPORT_EXAMPLE_ROUTES, ThemePickerComponent, TransformBuilderComponent, TransformsComponent , AccountsComponent, CertificationManagementComponent, AccessObjectsManagementComponent, ManageObjectsListComponent } from 'sailpoint-components';
import { HomeComponent } from './home/home.component';
import { PageNotFoundComponent } from './shared/components';
 
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
    path: 'attach-rule',
    component: AttachRuleComponent
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
    path: 'accounts',
    component: AccountsComponent
  },
  {
    path: 'certification-management',
    component: CertificationManagementComponent
  },

  {
    path: 'access-objects-management',
    component: AccessObjectsManagementComponent
  },
  {
    path: 'access-objects-management/:type',
    component: ManageObjectsListComponent
  },
  {
    path: 'entitlement-details/:type/:id',
  loadComponent: () => import('../../projects/sailpoint-components/src/lib/access-objects-management/entitlement-details/entitlement-details.component').then(m => m.EntitlementDetailsComponent)
  },
  {
    path: 'role-details/:id',
    loadComponent: () => import('../../projects/sailpoint-components/src/lib/access-objects-management/role-details/role-details.component').then(m => m.RoleDetailsComponent)
  },
  {
    path: 'governance-groups',
    loadComponent: () => import('../../projects/sailpoint-components/src/lib/access-objects-management/governance-groups/governance-groups-list.component').then(m => m.GovernanceGroupsListComponent)
  },
  {
    path: 'governance-group-details/:id',
    loadComponent: () => import('../../projects/sailpoint-components/src/lib/access-objects-management/governance-groups/governance-group-details.component').then(m => m.GovernanceGroupDetailsComponent)
  },
 
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

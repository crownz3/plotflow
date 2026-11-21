import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboards/dashboard-dispatcher.component').then(m => m.DashboardDispatcherComponent)
  },
  {
    path: 'properties',
    loadComponent: () =>
      import('./pages/properties/properties.component').then(m => m.PropertiesComponent)
  },
  {
    path: 'leads',
    loadComponent: () =>
      import('./pages/leads/leads.component').then(m => m.LeadsComponent)
  },
  {
    path: 'site-visits',
    loadComponent: () =>
      import('./pages/site-visits/site-visits.component').then(m => m.SiteVisitsComponent)
  },
  {
    path: 'deals',
    loadComponent: () =>
      import('./pages/deals/deals.component').then(m => m.DealsComponent)
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];


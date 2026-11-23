import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboards/dashboard-dispatcher.component').then(m => m.DashboardDispatcherComponent)
  },
  {
    path: 'properties',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/properties/properties.component').then(m => m.PropertiesComponent)
  },
  {
    path: 'leads',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/leads/leads.component').then(m => m.LeadsComponent)
  },
  {
    path: 'site-visits',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/site-visits/site-visits.component').then(m => m.SiteVisitsComponent)
  },
  {
    path: 'deals',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/deals/deals.component').then(m => m.DealsComponent)
  },
  {
    path: 'ai',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/ai/ai.component').then(m => m.PlotflowAiComponent)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/auth/onboarding/onboarding.component').then(m => m.OnboardingComponent)
  },
  {
    path: 'pending-approval',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/auth/pending-approval/pending-approval.component').then(m => m.PendingApprovalComponent)
  },
  {
    path: 'view/:shareId',
    loadComponent: () =>
      import('./pages/public-property-view/public-property-view.component').then(m => m.PublicPropertyViewComponent)
  },
  {
    path: 'visit-status/:bookingId',
    loadComponent: () =>
      import('./pages/public-site-visit-status/public-site-visit-status.component').then(m => m.PublicSiteVisitStatusComponent)
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


import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TenantService } from '../services/tenant.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const tenantService = inject(TenantService);
  const router = inject(Router);

  const url = state.url;

  // Onboarding wizard is publicly accessible for new agency registrations
  if (url === '/onboarding') {
    return true;
  }

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  const user = auth.currentUser();
  if (!user) {
    return router.parseUrl('/login');
  }

  // 1. Super Admin has unrestricted platform-wide access across all routes
  if (user.role === 'super_admin' || auth.isSuperAdmin()) {
    if (url === '/onboarding' || url === '/pending-approval') {
      return router.parseUrl('/dashboard');
    }
    return true;
  }

  // 2. If user hasn't completed onboarding, require /onboarding
  if (!user.onboardingCompleted) {
    if (url === '/onboarding') {
      return true;
    }
    return router.parseUrl('/onboarding');
  }

  // 2. Check tenant approval status
  const tenant = tenantService.getTenantById(user.tenantId);
  if (!tenant) {
    auth.logout();
    return router.parseUrl('/login');
  }
  const status = tenant.status || 'pending_approval';

  if (status === 'pending_approval' || status === 'rejected') {
    if (url === '/pending-approval') {
      return true;
    }
    return router.parseUrl('/pending-approval');
  }

  // 3. Approved active tenant: if navigating to auth waiting rooms, route to dashboard
  if (status === 'active') {
    if (url === '/onboarding' || url === '/pending-approval') {
      return router.parseUrl('/dashboard');
    }
    return true;
  }

  return true;
};


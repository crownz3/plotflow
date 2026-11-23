import { Injectable, signal, computed } from '@angular/core';
import { UserProfile, UserRole } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Current user reactive signal — null when unauthenticated
  readonly currentUser = signal<UserProfile | null>(null);

  // Active tenant ID signal (supports super admin inspection context)
  readonly activeTenantId = signal<string>('');

  // Computed authentication & role state
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly currentRole = computed(() => this.currentUser()?.role || 'agent');
  readonly isSuperAdmin = computed(() => this.currentUser()?.role === 'super_admin');
  readonly isAgencyAdmin = computed(() => this.currentUser()?.role === 'agency_admin' || this.isSuperAdmin());
  readonly isOnboardingCompleted = computed(() =>
    this.isSuperAdmin() || this.currentUser()?.onboardingCompleted === true
  );

  // Support context inspection: true when a super admin is inspecting a specific tenant agency
  readonly isSupportContext = computed(() =>
    this.isSuperAdmin() && this.activeTenantId() !== '' && this.activeTenantId() !== 'platform_global'
  );

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const saved = sessionStorage.getItem('pf_user_session');
    if (saved) {
      try {
        const user = JSON.parse(saved) as UserProfile;
        this.currentUser.set(user);
        this.activeTenantId.set(user.tenantId);
        return;
      } catch (e) {
        sessionStorage.removeItem('pf_user_session');
      }
    }

    // Do NOT auto-login non-authenticated users. Must sign in via /login.
    this.currentUser.set(null);
    this.activeTenantId.set('');
  }

  login(user: UserProfile): void {
    this.currentUser.set(user);
    this.activeTenantId.set(user.tenantId);
    try {
      sessionStorage.setItem('pf_user_session', JSON.stringify(user));
    } catch {}
  }

  updateCurrentUser(updates: Partial<UserProfile>): void {
    const current = this.currentUser();
    if (!current) return;
    const updated = { ...current, ...updates };
    this.currentUser.set(updated);
    if (updates.tenantId) {
      this.activeTenantId.set(updates.tenantId);
    }
    try {
      sessionStorage.setItem('pf_user_session', JSON.stringify(updated));
    } catch {}
  }

  logout(): void {
    this.currentUser.set(null);
    this.activeTenantId.set('');
    try {
      sessionStorage.removeItem('pf_user_session');
    } catch {}
  }

  /**
   * Support Impersonation / Inspection Context
   * Allows platform Super Admin to inspect any tenant's inventory, leads, visits, and deals.
   */
  supportSwitchTenant(targetTenantId: string): void {
    if (!this.isSuperAdmin()) {
      console.warn('Unauthorized tenant switch attempt rejected.');
      return;
    }
    this.activeTenantId.set(targetTenantId);
  }

  exitSupportContext(): void {
    if (this.isSuperAdmin()) {
      this.activeTenantId.set('platform_global');
    }
  }
}

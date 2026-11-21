import { Injectable, signal, computed } from '@angular/core';
import { UserProfile, UserRole } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Current user reactive signal — null until Firebase Auth resolves.
  readonly currentUser = signal<UserProfile | null>(null);

  // Active tenant ID signal (supports silent support impersonation)
  readonly activeTenantId = signal<string>('');

  // Computed state
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly currentRole = computed(() => this.currentUser()?.role || 'agent');
  readonly isSuperAdmin = computed(() => this.currentUser()?.role === 'super_admin');
  readonly isAgencyAdmin = computed(() => this.currentUser()?.role === 'agency_admin' || this.isSuperAdmin());

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const saved = localStorage.getItem('pf_user_session');
    if (saved) {
      try {
        const user = JSON.parse(saved) as UserProfile;
        this.currentUser.set(user);
        this.activeTenantId.set(user.tenantId);
        return;
      } catch (e) {
        localStorage.removeItem('pf_user_session');
      }
    }
  }

  login(user: UserProfile): void {
    this.currentUser.set(user);
    this.activeTenantId.set(user.tenantId);
    localStorage.setItem('pf_user_session', JSON.stringify(user));
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('pf_user_session');
  }

  /**
   * One-click login for E2E testing and demo evaluation only.
   * In production, Firebase Auth (Google Sign-In) is used exclusively.
   */
  loginDemo(role: UserRole, customTenantId?: string): void {
    const tenantId = customTenantId || 'tenant_prime_properties';
    const demoProfiles: Record<UserRole, UserProfile> = {
      super_admin: {
        uid: 'user_super_01',
        email: 'mohamedibrahim040125@gmail.com',
        displayName: 'Mohamed Ibrahim (Super Admin)',
        role: 'super_admin',
        tenantId: 'platform_global',
        agencyName: 'PlotFlow HQ',
        isActive: true,
        createdAt: Date.now() - 86400000 * 30
      },
      agency_admin: {
        uid: 'user_admin_01',
        email: 'primeproperties.broker@gmail.com',
        displayName: 'Rajesh Sharma (Principal Broker)',
        phoneNumber: '+91 98765 43210',
        role: 'agency_admin',
        tenantId: tenantId,
        agencyName: 'Prime Properties & Realty',
        isActive: true,
        createdAt: Date.now() - 86400000 * 15
      },
      agent: {
        uid: 'user_agent_01',
        email: 'primeproperties.agent@gmail.com',
        displayName: 'Arun Kumar (Associate Broker)',
        phoneNumber: '+91 91234 56789',
        role: 'agent',
        tenantId: tenantId,
        agencyName: 'Prime Properties & Realty',
        isActive: true,
        createdAt: Date.now() - 86400000 * 7
      }
    };

    const profile = demoProfiles[role];
    this.login(profile);
  }

  /**
   * Silent Support Impersonation Context
   * Allows authorized support operators to inspect any tenant's data for troubleshooting.
   */
  supportSwitchTenant(targetTenantId: string): void {
    if (!this.isSuperAdmin() && this.currentRole() !== 'agency_admin') {
      console.warn('Unauthorized context switch attempt rejected.');
      return;
    }
    this.activeTenantId.set(targetTenantId);
  }
}


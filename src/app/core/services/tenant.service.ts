import { Injectable, signal, computed, inject } from '@angular/core';
import { Tenant, UserProfile, TenantApprovalNotification, TenantStatus } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private auth = inject(AuthService);
  private storageKeyTenants = 'pf_tenants';
  private storageKeyMembers = 'pf_team_members';
  private storageKeyNotifications = 'pf_super_admin_notifications';

  readonly teamMembers = signal<UserProfile[]>(this.loadMembers());
  readonly tenants = signal<Tenant[]>(this.loadTenants());
  readonly pendingNotifications = signal<TenantApprovalNotification[]>(this.loadNotifications());

  readonly pendingTenants = computed(() => this.tenants().filter(t => t.status === 'pending_approval'));
  readonly activeTenants = computed(() => this.tenants().filter(t => t.status === 'active'));

  readonly activeTenant = signal<Tenant>(this.getInitialActiveTenant());

  constructor() {
    this.refreshActiveTenant();
  }

  private loadTenants(): Tenant[] {
    try {
      const saved = localStorage.getItem(this.storageKeyTenants);
      if (saved) return JSON.parse(saved);
    } catch {}

    // Default primary tenant
    return [{
      id: 'tenant_prime_properties',
      agencyName: 'Prime Properties & Realty',
      ownerUid: 'user_admin_01',
      reraNumber: 'TN/01/RealEstate/2024/7890',
      phone: '+91 98765 43210',
      email: 'primeproperties.broker@gmail.com',
      address: 'Express Chambers, Anna Salai, Chennai',
      currency: 'INR',
      defaultAreaUnit: 'sqft',
      subscriptionPlan: 'pro',
      status: 'active',
      trialExpiresAt: Date.now() + 86400000 * 30,
      totalAgentsCount: 2,
      totalListingsCount: 0,
      createdAt: Date.now() - 86400000 * 30,
      updatedAt: Date.now()
    }];
  }

  private loadMembers(): UserProfile[] {
    try {
      const saved = localStorage.getItem(this.storageKeyMembers);
      if (saved) return JSON.parse(saved);
    } catch {}

    return [];
  }

  private saveTenants(): void {
    try {
      localStorage.setItem(this.storageKeyTenants, JSON.stringify(this.tenants()));
    } catch (e) {
      console.warn('Failed to persist tenants:', e);
    }
  }

  private loadNotifications(): TenantApprovalNotification[] {
    try {
      const saved = localStorage.getItem(this.storageKeyNotifications);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  private saveNotifications(): void {
    try {
      localStorage.setItem(this.storageKeyNotifications, JSON.stringify(this.pendingNotifications()));
    } catch (e) {
      console.warn('Failed to persist notifications:', e);
    }
  }

  getTenantById(tenantId: string): Tenant | undefined {
    return this.tenants().find(t => t.id === tenantId);
  }

  submitOnboarding(data: {
    agencyName: string;
    brokerName: string;
    phone: string;
    reraNumber: string;
    address: string;
    city: string;
    teamSize: string;
    currency: 'INR' | 'USD' | 'AED' | 'EUR';
    defaultAreaUnit: 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha';
  }): Tenant {
    const user = this.auth.currentUser();
    const userEmail = user?.email || 'broker@gmail.com';
    const cleanPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const tenantId = `tenant_${cleanPrefix}`;

    const newTenant: Tenant = {
      id: tenantId,
      agencyName: data.agencyName.trim(),
      ownerUid: user?.uid || `owner_${Date.now()}`,
      reraNumber: data.reraNumber.trim(),
      phone: data.phone.trim(),
      email: userEmail,
      address: data.address.trim(),
      operatingCity: data.city.trim(),
      teamSize: data.teamSize,
      currency: data.currency,
      defaultAreaUnit: data.defaultAreaUnit,
      subscriptionPlan: 'trial',
      status: 'pending_approval',
      submittedAt: Date.now(),
      trialExpiresAt: Date.now() + 86400000 * 14,
      totalAgentsCount: 1,
      totalListingsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Upsert tenant
    const existingIndex = this.tenants().findIndex(t => t.id === tenantId);
    if (existingIndex >= 0) {
      this.tenants.update(list => {
        const copy = [...list];
        copy[existingIndex] = newTenant;
        return copy;
      });
    } else {
      this.tenants.update(list => [newTenant, ...list]);
    }
    this.saveTenants();
    this.activeTenant.set(newTenant);

    // Create Notification for Super Admin
    const notification: TenantApprovalNotification = {
      id: `notif_${Date.now()}`,
      tenantId: newTenant.id,
      agencyName: newTenant.agencyName,
      applicantEmail: userEmail,
      applicantName: data.brokerName.trim(),
      phone: newTenant.phone,
      reraNumber: newTenant.reraNumber,
      address: newTenant.address,
      operatingCity: newTenant.operatingCity,
      teamSize: newTenant.teamSize,
      submittedAt: Date.now(),
      read: false
    };

    this.pendingNotifications.update(n => [notification, ...n.filter(x => x.tenantId !== newTenant.id)]);
    this.saveNotifications();

    // Update current user's profile
    this.auth.updateCurrentUser({
      agencyName: newTenant.agencyName,
      tenantId: newTenant.id,
      displayName: data.brokerName.trim() || user?.displayName,
      phoneNumber: newTenant.phone,
      onboardingCompleted: true
    });

    return newTenant;
  }

  approveTenant(tenantId: string): void {
    this.tenants.update(list =>
      list.map(t => {
        if (t.id === tenantId) {
          return {
            ...t,
            status: 'active',
            approvedAt: Date.now(),
            updatedAt: Date.now()
          };
        }
        return t;
      })
    );
    this.saveTenants();

    // Remove or mark notification read
    this.pendingNotifications.update(list => list.filter(n => n.tenantId !== tenantId));
    this.saveNotifications();

    this.refreshActiveTenant();
  }

  rejectTenant(tenantId: string, reason?: string): void {
    this.tenants.update(list =>
      list.map(t => {
        if (t.id === tenantId) {
          return {
            ...t,
            status: 'rejected',
            rejectionReason: reason || 'Information verification failed or invalid license.',
            updatedAt: Date.now()
          };
        }
        return t;
      })
    );
    this.saveTenants();

    this.pendingNotifications.update(list => list.filter(n => n.tenantId !== tenantId));
    this.saveNotifications();

    this.refreshActiveTenant();
  }

  private saveMembers(): void {
    try {
      localStorage.setItem(this.storageKeyMembers, JSON.stringify(this.teamMembers()));
    } catch (e) {
      console.warn('Failed to persist team members:', e);
    }
  }

  private getInitialActiveTenant(): Tenant {
    const list = this.loadTenants();
    return list[0];
  }

  refreshActiveTenant(): void {
    const activeId = this.auth.activeTenantId();
    if (!activeId) return;

    let found = this.tenants().find(t => t.id === activeId);
    if (!found) {
      // Create tenant object if user logged in with a fresh tenant
      const user = this.auth.currentUser();
      if (user && user.tenantId === activeId) {
        found = {
          id: activeId,
          agencyName: user.agencyName || 'Agency Realty',
          ownerUid: user.uid,
          phone: user.phoneNumber || '+91 98765 00000',
          email: user.email,
          address: 'Headquarters',
          currency: 'INR',
          defaultAreaUnit: 'sqft',
          subscriptionPlan: 'trial',
          status: 'active',
          trialExpiresAt: Date.now() + 86400000 * 14,
          totalAgentsCount: 1,
          totalListingsCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        this.tenants.update(t => [...t, found!]);
        this.saveTenants();
      } else {
        found = this.tenants()[0];
      }
    }
    if (found) {
      this.activeTenant.set(found);
    }
  }

  isGoogleMail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i.test(email.trim());
  }

  registerNewTenant(data: Partial<Tenant>): Tenant {
    let email = data.email || 'sunrisemetro.realty@gmail.com';
    if (!this.isGoogleMail(email)) {
      email = email.split('@')[0] + '@gmail.com';
    }

    const newTenant: Tenant = {
      id: data.id || `tenant_${Date.now()}`,
      agencyName: data.agencyName || 'New Agency Realty',
      ownerUid: data.ownerUid || this.auth.currentUser()?.uid || `owner_${Date.now()}`,
      reraNumber: data.reraNumber || 'Applied / Pending',
      phone: data.phone || '+91 90000 00000',
      email,
      address: data.address || 'Business District',
      currency: data.currency || 'INR',
      defaultAreaUnit: data.defaultAreaUnit || 'sqft',
      subscriptionPlan: data.subscriptionPlan || 'trial',
      status: data.status || 'active',
      trialExpiresAt: Date.now() + 86400000 * 14, // 14-day trial
      totalAgentsCount: 1,
      totalListingsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tenants.update(list => [newTenant, ...list]);
    this.saveTenants();
    this.activeTenant.set(newTenant);
    this.auth.activeTenantId.set(newTenant.id);
    return newTenant;
  }

  inviteAgent(displayName: string, email: string, role: 'agency_admin' | 'agent' = 'agent'): UserProfile {
    const newMember: UserProfile = {
      uid: `user_${Date.now()}`,
      email,
      displayName,
      tenantId: this.auth.activeTenantId(),
      agencyName: this.activeTenant().agencyName,
      role,
      isActive: true,
      createdAt: Date.now()
    };
    this.teamMembers.update(members => [...members, newMember]);
    this.saveMembers();
    return newMember;
  }

  removeAgent(uid: string): void {
    this.teamMembers.update(members => members.filter(m => m.uid !== uid));
    this.saveMembers();
  }
}

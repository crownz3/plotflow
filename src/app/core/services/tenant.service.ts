import { Injectable, signal, inject } from '@angular/core';
import { Tenant, UserProfile } from '../models/models';
import { AuthService } from './auth.service';
import { DEMO_TENANTS, DEMO_TEAM_MEMBERS } from './demo-data';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private auth = inject(AuthService);

  readonly teamMembers = signal<UserProfile[]>(DEMO_TEAM_MEMBERS);

  readonly tenants = signal<Tenant[]>(DEMO_TENANTS);

  readonly activeTenant = signal<Tenant>(DEMO_TENANTS[0]);

  constructor() {
    this.refreshActiveTenant();
  }

  refreshActiveTenant(): void {
    const activeId = this.auth.activeTenantId();
    let found = this.tenants().find(t => t.id === activeId);
    if (!found) {
      found = this.tenants().find(t => t.id === 'tenant_prime_properties') || this.tenants()[0];
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
      id: `tenant_${Date.now()}`,
      agencyName: data.agencyName || 'New Agency Realty',
      ownerUid: this.auth.currentUser()?.uid || `owner_${Date.now()}`,
      reraNumber: data.reraNumber || 'Applied / Pending',
      phone: data.phone || '+91 90000 00000',
      email,
      address: data.address || 'Business District',
      currency: data.currency || 'INR',
      defaultAreaUnit: data.defaultAreaUnit || 'sqft',
      subscriptionPlan: 'trial',
      trialExpiresAt: Date.now() + 86400000 * 14, // 14-day trial
      totalAgentsCount: 1,
      totalListingsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tenants.update(list => [newTenant, ...list]);
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
    return newMember;
  }

  removeAgent(uid: string): void {
    this.teamMembers.update(members => members.filter(m => m.uid !== uid));
  }
}


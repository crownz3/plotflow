import { Injectable, signal, computed, inject } from '@angular/core';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Tenant, UserProfile, TenantApprovalNotification, TenantStatus } from '../models/models';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  private storageKeyTenants = 'pf_tenants';
  private storageKeyMembers = 'pf_team_members';
  private storageKeyNotifications = 'pf_super_admin_notifications';

  readonly teamMembers = signal<UserProfile[]>(this.loadMembers());
  readonly tenants = signal<Tenant[]>(this.loadTenants());
  readonly pendingNotifications = signal<TenantApprovalNotification[]>(this.loadNotifications());

  readonly pendingTenants = computed(() => this.tenants().filter(t => t.status === 'pending_approval'));
  readonly activeTenants = computed(() => this.tenants().filter(t => t.status === 'active'));

  readonly activeTenant = signal<Tenant>(this.getInitialActiveTenant());
  private unsubscribeTenants: Unsubscribe | null = null;

  constructor() {
    this.refreshActiveTenant();
    this.bindFirestoreTenantsListener();
  }

  bindFirestoreTenantsListener(): void {
    if (this.unsubscribeTenants) {
      this.unsubscribeTenants();
      this.unsubscribeTenants = null;
    }

    try {
      const colRef = collection(this.firebase.firestore, 'tenants');
      this.unsubscribeTenants = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: Tenant[] = [];
            snapshot.forEach(d => {
              remote.push({ id: d.id, ...d.data() } as Tenant);
            });
            const clean = remote.filter(t => t.id !== 'tenant_prime_properties' && t.id !== 'platform_global');
            this.tenants.set(clean);
            this.saveTenants();
            this.refreshActiveTenant();
          }
        },
        (err) => {
          // When unauthenticated or before super_admin credentials sync, Firestore rules disallow full tenant collection reads.
          // Fall back gracefully to local persistence without spamming console errors.
          if (err.code !== 'permission-denied') {
            console.warn('Firestore tenants listener operating in offline cache mode:', err.message);
          }
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot for tenants:', e);
    }
  }

  private loadTenants(): Tenant[] {
    try {
      const saved = localStorage.getItem(this.storageKeyTenants);
      if (saved) {
        const parsed: Tenant[] = JSON.parse(saved);
        const clean = parsed.filter(t => t.id !== 'tenant_prime_properties' && t.id !== 'platform_global');
        if (clean.length !== parsed.length) {
          localStorage.setItem(this.storageKeyTenants, JSON.stringify(clean));
        }
        return clean;
      }
    } catch {}

    return [];
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

    // Persist to Cloud Firestore with IndexedDB offline queueing
    try {
      const docRef = doc(this.firebase.firestore, 'tenants', newTenant.id);
      setDoc(docRef, { ...newTenant, _cloudSyncedAt: Date.now() });
    } catch (e) {
      console.warn('Firestore offline tenant write queued:', e);
    }

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

    try {
      const docRef = doc(this.firebase.firestore, 'tenants', tenantId);
      updateDoc(docRef, { status: 'active', approvedAt: Date.now(), updatedAt: Date.now() });
    } catch (e) {
      console.warn('Firestore offline approve sync queued:', e);
    }

    // Remove or mark notification read
    this.pendingNotifications.update(list => list.filter(n => n.tenantId !== tenantId));
    this.saveNotifications();

    this.refreshActiveTenant();
  }

  extendSubscription(tenantId: string, days: number = 30): void {
    this.tenants.update(list =>
      list.map(t => {
        if (t.id === tenantId) {
          const currentExpiry = t.trialExpiresAt && t.trialExpiresAt > Date.now() ? t.trialExpiresAt : Date.now();
          const newExpiry = currentExpiry + (days * 86400000);
          return {
            ...t,
            status: 'active',
            trialExpiresAt: newExpiry,
            updatedAt: Date.now()
          };
        }
        return t;
      })
    );
    this.saveTenants();

    try {
      const docRef = doc(this.firebase.firestore, 'tenants', tenantId);
      const tenant = this.tenants().find(t => t.id === tenantId);
      if (tenant) {
        updateDoc(docRef, { status: 'active', trialExpiresAt: tenant.trialExpiresAt, updatedAt: Date.now() });
      }
    } catch (e) {
      console.warn('Firestore offline extend sync queued:', e);
    }

    this.refreshActiveTenant();
  }

  cancelSubscription(tenantId: string): void {
    this.tenants.update(list =>
      list.map(t => {
        if (t.id === tenantId) {
          return {
            ...t,
            status: 'suspended',
            trialExpiresAt: Date.now(),
            updatedAt: Date.now()
          };
        }
        return t;
      })
    );
    this.saveTenants();

    try {
      const docRef = doc(this.firebase.firestore, 'tenants', tenantId);
      updateDoc(docRef, { status: 'suspended', trialExpiresAt: Date.now(), updatedAt: Date.now() });
    } catch (e) {
      console.warn('Firestore offline cancel sync queued:', e);
    }

    this.refreshActiveTenant();
  }

  deleteTenant(tenantId: string): void {
    this.tenants.update(list => list.filter(t => t.id !== tenantId));
    this.saveTenants();

    try {
      const docRef = doc(this.firebase.firestore, 'tenants', tenantId);
      deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore offline delete sync queued:', e);
    }

    this.refreshActiveTenant();
  }

  getSubscriptionExpiryInfo(tenant?: Tenant): { isExpiringSoon: boolean; daysLeft: number; isExpired: boolean } {
    const target = tenant || this.activeTenant();
    if (!target || !target.trialExpiresAt) {
      return { isExpiringSoon: false, daysLeft: 999, isExpired: false };
    }
    const msLeft = target.trialExpiresAt - Date.now();
    const daysLeft = Math.ceil(msLeft / 86400000);
    const isExpired = msLeft <= 0 || target.status === 'suspended';
    const isExpiringSoon = daysLeft <= 7;
    return { isExpiringSoon, daysLeft, isExpired };
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

    try {
      const docRef = doc(this.firebase.firestore, 'tenants', tenantId);
      updateDoc(docRef, { status: 'rejected', rejectionReason: reason || 'Information verification failed', updatedAt: Date.now() });
    } catch (e) {
      console.warn('Firestore offline reject sync queued:', e);
    }

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
    if (list.length > 0) return list[0];
    return {
      id: 'tenant_default',
      agencyName: 'PlotFlow Agency',
      ownerUid: '',
      phone: '',
      email: '',
      address: '',
      currency: 'INR',
      defaultAreaUnit: 'sqft',
      subscriptionPlan: 'pro',
      status: 'active',
      trialExpiresAt: Date.now() + 86400000 * 30,
      totalAgentsCount: 0,
      totalListingsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  refreshActiveTenant(): void {
    const activeId = this.auth.activeTenantId();
    if (!activeId) return;

    // Super Admin is platform global operator, not a tenant brokerage
    if (activeId === 'platform_global' || this.auth.isSuperAdmin()) {
      // Purge any accidental platform_global from tenants list
      this.tenants.update(list => list.filter(t => t.id !== 'platform_global' && t.id !== 'tenant_prime_properties'));
      this.saveTenants();
      return;
    }

    let found = this.tenants().find(t => t.id === activeId);
    if (!found) {
      const user = this.auth.currentUser();
      if (user && user.tenantId === activeId && user.role !== 'super_admin') {
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
        this.tenants.update(t => [...t.filter(x => x.id !== activeId), found!]);
        this.saveTenants();
      } else {
        found = this.tenants()[0];
      }
    }
    if (found) {
      this.activeTenant.set(found);
    }
  }

  updateActiveTenant(updates: Partial<Tenant>): void {
    const active = this.activeTenant();
    if (!active) return;
    const updated: Tenant = {
      ...active,
      ...updates,
      updatedAt: Date.now()
    };
    this.activeTenant.set(updated);
    this.tenants.update(list => list.map(t => t.id === updated.id ? updated : t));
    this.saveTenants();

    // Persist to Cloud Firestore (/tenants/{tenantId})
    try {
      const docRef = doc(this.firebase.firestore, 'tenants', updated.id);
      setDoc(docRef, { ...updated, _cloudSyncedAt: Date.now() }, { merge: true });
    } catch (e) {
      console.warn('Firestore offline tenant update queued:', e);
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

    try {
      const docRef = doc(this.firebase.firestore, 'tenants', newTenant.id);
      setDoc(docRef, { ...newTenant, _cloudSyncedAt: Date.now() });
    } catch (e) {
      console.warn('Firestore offline tenant write queued:', e);
    }

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

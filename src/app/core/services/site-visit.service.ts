import { Injectable, signal, computed, inject, effect } from '@angular/core';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { SiteVisit } from '../models/models';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class SiteVisitService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  private storageKey = 'pf_visits';

  readonly allVisits = signal<SiteVisit[]>(this.loadCache());
  private unsubscribeSnapshot: Unsubscribe | null = null;

  readonly tenantVisits = computed(() => {
    const tId = this.auth.activeTenantId();
    if (!tId) return [];
    if (this.auth.isSuperAdmin() && tId === 'platform_global') {
      return this.allVisits();
    }
    return this.allVisits().filter(v => v.tenantId === tId);
  });

  readonly upcomingCount = computed(() =>
    this.tenantVisits().filter(v => v.status === 'scheduled').length
  );

  constructor() {
    effect(() => {
      const tenantId = this.auth.activeTenantId();
      this.bindFirestoreListener(tenantId);
    });
  }

  private loadCache(): SiteVisit[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed: SiteVisit[] = JSON.parse(saved);
        return parsed.filter(v => v.tenantId !== 'tenant_prime_properties');
      }
    } catch {}
    return [];
  }

  private saveCache(list: SiteVisit[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch {}
  }

  private bindFirestoreListener(tenantId: string): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    if (!tenantId) return;

    const path = tenantId === 'platform_global' ? 'tenants/tenant_default/site_visits' : `tenants/${tenantId}/site_visits`;
    try {
      const colRef = collection(this.firebase.firestore, path);
      this.unsubscribeSnapshot = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: SiteVisit[] = [];
            snapshot.forEach(d => {
              remote.push({ id: d.id, ...d.data() } as SiteVisit);
            });
            this.allVisits.set(remote);
            this.saveCache(remote);
          }
        },
        (error) => {
          console.warn(`Firestore real-time sync for ${path} operating in offline cache mode:`, error.message);
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot for visits:', e);
    }
  }

  async scheduleVisit(data: Omit<SiteVisit, 'id' | 'createdAt'>): Promise<SiteVisit> {
    const tenantId = data.tenantId || this.auth.activeTenantId() || 'tenant_default';
    const id = `visit_${Date.now()}`;
    const newVisit: SiteVisit = {
      ...data,
      id,
      tenantId,
      createdAt: Date.now()
    };

    this.allVisits.update(list => [newVisit, ...list]);
    this.saveCache(this.allVisits());

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/site_visits`, id);
      await setDoc(docRef, { ...newVisit, _cloudSyncedAt: Date.now() });
    } catch (err) {
      console.warn('Firestore offline write queued for sync:', err);
    }

    return newVisit;
  }

  async updateStatus(visitId: string, status: 'completed' | 'cancelled', feedback?: string): Promise<void> {
    const current = this.allVisits().find(v => v.id === visitId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allVisits.update(list =>
      list.map(v => v.id === visitId ? { ...v, status, feedback } : v)
    );
    this.saveCache(this.allVisits());

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/site_visits`, visitId);
      await updateDoc(docRef, { status, feedback });
    } catch (err) {
      console.warn('Firestore offline update queued:', err);
    }
  }

  async recordBuyerConcern(visitId: string, concernData: {
    buyerConcernCategory?: SiteVisit['buyerConcernCategory'];
    buyerConcernNotes?: string;
    interestedInNextProject?: boolean;
    nextProjectPreferences?: SiteVisit['nextProjectPreferences'];
  }): Promise<void> {
    await this.updateVisit(visitId, {
      ...concernData,
      status: 'completed'
    });
  }

  async updateVisit(visitId: string, updates: Partial<SiteVisit>): Promise<void> {
    const current = this.allVisits().find(v => v.id === visitId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allVisits.update(list =>
      list.map(v => v.id === visitId ? { ...v, ...updates } : v)
    );
    this.saveCache(this.allVisits());

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/site_visits`, visitId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.warn('Firestore offline update queued:', err);
    }
  }

  async deleteVisit(visitId: string): Promise<void> {
    const current = this.allVisits().find(v => v.id === visitId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allVisits.update(list => list.filter(v => v.id !== visitId));
    this.saveCache(this.allVisits());

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/site_visits`, visitId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore offline delete queued:', err);
    }
  }
}

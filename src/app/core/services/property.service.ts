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
import { Property } from '../models/models';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  private storageKey = 'pf_properties';

  readonly allProperties = signal<Property[]>(this.loadCache());
  private unsubscribeSnapshot: Unsubscribe | null = null;

  // Scoped strictly by active tenant
  readonly tenantProperties = computed(() => {
    const tId = this.auth.activeTenantId();
    if (!tId) return [];
    if (this.auth.isSuperAdmin() && tId === 'platform_global') {
      return this.allProperties();
    }
    return this.allProperties().filter(p => p.tenantId === tId);
  });

  // Active listings count
  readonly activeCount = computed(() =>
    this.tenantProperties().filter(p => p.status === 'available').length
  );

  constructor() {
    // Reactively watch activeTenantId and bind Cloud Firestore real-time listener
    effect(() => {
      const tenantId = this.auth.activeTenantId();
      this.bindFirestoreListener(tenantId);
    });
  }

  private loadCache(): Property[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed: Property[] = JSON.parse(saved);
        return parsed.filter(p => !p.id.startsWith('prop_seed_') && p.tenantId !== 'tenant_prime_properties');
      }
    } catch {}
    return [];
  }

  private saveCache(list: Property[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch {}
  }

  private bindFirestoreListener(tenantId: string): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    if (!tenantId) {
      return;
    }

    const path = tenantId === 'platform_global' ? 'tenants/tenant_default/properties' : `tenants/${tenantId}/properties`;
    try {
      const colRef = collection(this.firebase.firestore, path);
      this.unsubscribeSnapshot = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: Property[] = [];
            snapshot.forEach(d => {
              remote.push({ id: d.id, ...d.data() } as Property);
            });
            this.allProperties.set(remote);
            this.saveCache(remote);
          }
        },
        (error) => {
          console.warn(`Firestore real-time sync for ${path} operating in offline cache mode:`, error.message);
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot listener:', e);
    }
  }

  async addProperty(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const tenantId = data.tenantId || this.auth.activeTenantId() || 'tenant_default';
    const id = `prop_${Date.now()}`;
    const newProp: Property = {
      ...data,
      id,
      tenantId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 1. Optimistic Signal Update (instant UI responsiveness)
    this.allProperties.update(list => [newProp, ...list]);
    this.saveCache(this.allProperties());

    // 2. Persist to Cloud Firestore (with automatic IndexedDB offline queueing)
    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/properties`, id);
      await setDoc(docRef, { ...newProp, _cloudSyncedAt: Date.now() });
    } catch (err) {
      console.warn('Firestore offline write queued for sync:', err);
    }

    return newProp;
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<void> {
    const current = this.allProperties().find(p => p.id === id);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    // 1. Optimistic Signal Update
    this.allProperties.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
    );
    this.saveCache(this.allProperties());

    // 2. Cloud Firestore update
    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/properties`, id);
      await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch (err) {
      console.warn('Firestore offline update queued:', err);
    }
  }

  async deleteProperty(id: string): Promise<void> {
    const current = this.allProperties().find(p => p.id === id);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    // 1. Optimistic Signal Update
    this.allProperties.update(list => list.filter(p => p.id !== id));
    this.saveCache(this.allProperties());

    // 2. Cloud Firestore delete
    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/properties`, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore offline delete queued:', err);
    }
  }

  clearAllProperties(): void {
    this.allProperties.set([]);
    this.saveCache([]);
  }
}

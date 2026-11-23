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
import { sanitizeForFirestore } from '../utils/firestore.util';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);

  // Synced purely from Cloud Firestore with IndexedDB offline persistence
  readonly allProperties = signal<Property[]>([]);
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
    }, { allowSignalWrites: true });
  }

  private bindFirestoreListener(tenantId: string): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    if (!tenantId) {
      this.allProperties.set([]);
      return;
    }

    const path = tenantId === 'platform_global' ? 'tenants/tenant_default/properties' : `tenants/${tenantId}/properties`;
    try {
      const colRef = collection(this.firebase.firestore, path);
      this.unsubscribeSnapshot = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          const remote: Property[] = [];
          snapshot.forEach(d => {
            remote.push({ id: d.id, ...d.data() } as Property);
          });
          this.allProperties.set(remote);
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

    // 2. Persist to Cloud Firestore (with automatic IndexedDB offline queueing)
    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/properties`, id);
      const payload = sanitizeForFirestore({ ...newProp, _cloudSyncedAt: Date.now() });
      await setDoc(docRef, payload);
      console.log('✅ Property saved to Cloud Firestore:', id, `tenants/${tenantId}/properties/${id}`);
    } catch (err) {
      console.error('❌ Cloud Firestore property write error:', err);
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

    // 2. Cloud Firestore update
    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/properties`, id);
      const payload = sanitizeForFirestore({ ...updates, updatedAt: Date.now() });
      await updateDoc(docRef, payload);
      console.log('✅ Property updated in Cloud Firestore:', id);
    } catch (err) {
      console.error('❌ Cloud Firestore property update error:', err);
    }
  }

  async deleteProperty(id: string): Promise<void> {
    const current = this.allProperties().find(p => p.id === id);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    // 1. Optimistic Signal Update
    this.allProperties.update(list => list.filter(p => p.id !== id));

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
  }
}

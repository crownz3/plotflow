import { Injectable, signal, computed, inject } from '@angular/core';
import { Property } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private auth = inject(AuthService);
  private storageKey = 'pf_properties';

  readonly allProperties = signal<Property[]>(this.loadInitial());

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

  private loadInitial(): Property[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge any dummy seed items to start 100% clean
          const clean = parsed.filter(p => !p.id.startsWith('prop_seed_'));
          this.saveClean(clean);
          return clean;
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.allProperties()));
    } catch (e) {
      console.warn('Failed to persist properties:', e);
    }
  }

  private saveClean(list: Property[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to persist clean properties:', e);
    }
  }

  addProperty(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
    const newProp: Property = {
      ...data,
      id: `prop_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.allProperties.update(list => [newProp, ...list]);
    this.save();
    return newProp;
  }

  updateProperty(id: string, updates: Partial<Property>): void {
    this.allProperties.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
    );
    this.save();
  }

  deleteProperty(id: string): void {
    this.allProperties.update(list => list.filter(p => p.id !== id));
    this.save();
  }

  clearAllProperties(): void {
    this.allProperties.set([]);
    this.save();
  }
}

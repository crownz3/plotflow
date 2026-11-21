import { Injectable, signal, computed, inject } from '@angular/core';
import { Property } from '../models/models';
import { AuthService } from './auth.service';
import { DEMO_PROPERTIES } from './demo-data';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private auth = inject(AuthService);

  readonly allProperties = signal<Property[]>(DEMO_PROPERTIES);

  // Scoped strictly by active tenant
  readonly tenantProperties = computed(() => {
    const tId = this.auth.activeTenantId() || 'tenant_prime_properties';
    return this.allProperties().filter(p => p.tenantId === tId);
  });

  // Active listings count
  readonly activeCount = computed(() =>
    this.tenantProperties().filter(p => p.status === 'available').length
  );

  addProperty(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
    const newProp: Property = {
      ...data,
      id: `prop_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.allProperties.update(list => [newProp, ...list]);
    return newProp;
  }

  updateProperty(id: string, updates: Partial<Property>): void {
    this.allProperties.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
    );
  }

  deleteProperty(id: string): void {
    this.allProperties.update(list => list.filter(p => p.id !== id));
  }
}


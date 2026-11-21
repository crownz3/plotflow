import { Injectable, signal, computed, inject } from '@angular/core';
import { SiteVisit } from '../models/models';
import { AuthService } from './auth.service';
import { DEMO_VISITS } from './demo-data';

@Injectable({
  providedIn: 'root'
})
export class SiteVisitService {
  private auth = inject(AuthService);

  readonly allVisits = signal<SiteVisit[]>(DEMO_VISITS);

  readonly tenantVisits = computed(() => {
    const tId = this.auth.activeTenantId() || 'tenant_prime_properties';
    return this.allVisits().filter(v => v.tenantId === tId);
  });

  readonly upcomingCount = computed(() =>
    this.tenantVisits().filter(v => v.status === 'scheduled').length
  );

  scheduleVisit(data: Omit<SiteVisit, 'id' | 'createdAt'>): SiteVisit {
    const newVisit: SiteVisit = {
      ...data,
      id: `visit_${Date.now()}`,
      createdAt: Date.now()
    };
    this.allVisits.update(list => [newVisit, ...list]);
    return newVisit;
  }

  updateStatus(visitId: string, status: 'completed' | 'cancelled', feedback?: string): void {
    this.allVisits.update(list =>
      list.map(v => v.id === visitId ? { ...v, status, feedback } : v)
    );
  }

  updateVisit(visitId: string, updates: Partial<SiteVisit>): void {
    this.allVisits.update(list =>
      list.map(v => v.id === visitId ? { ...v, ...updates } : v)
    );
  }

  deleteVisit(visitId: string): void {
    this.allVisits.update(list => list.filter(v => v.id !== visitId));
  }
}


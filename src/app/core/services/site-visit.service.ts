import { Injectable, signal, computed, inject } from '@angular/core';
import { SiteVisit } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SiteVisitService {
  private auth = inject(AuthService);
  private storageKey = 'pf_visits';

  readonly allVisits = signal<SiteVisit[]>(this.loadInitial());

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

  private loadInitial(): SiteVisit[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.allVisits()));
    } catch (e) {
      console.warn('Failed to persist visits:', e);
    }
  }

  scheduleVisit(data: Omit<SiteVisit, 'id' | 'createdAt'>): SiteVisit {
    const newVisit: SiteVisit = {
      ...data,
      id: `visit_${Date.now()}`,
      createdAt: Date.now()
    };
    this.allVisits.update(list => [newVisit, ...list]);
    this.save();
    return newVisit;
  }

  updateStatus(visitId: string, status: 'completed' | 'cancelled', feedback?: string): void {
    this.allVisits.update(list =>
      list.map(v => v.id === visitId ? { ...v, status, feedback } : v)
    );
    this.save();
  }

  updateVisit(visitId: string, updates: Partial<SiteVisit>): void {
    this.allVisits.update(list =>
      list.map(v => v.id === visitId ? { ...v, ...updates } : v)
    );
    this.save();
  }

  deleteVisit(visitId: string): void {
    this.allVisits.update(list => list.filter(v => v.id !== visitId));
    this.save();
  }
}

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Expense } from '../models/models';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  private storageKey = 'pf_expenses';

  readonly allExpenses = signal<Expense[]>(this.loadCache());
  private unsubscribeSnapshot: Unsubscribe | null = null;

  readonly tenantExpenses = computed(() => {
    const tId = this.auth.activeTenantId();
    if (!tId) return [];
    if (this.auth.isSuperAdmin() && tId === 'platform_global') {
      return this.allExpenses();
    }
    return this.allExpenses().filter(e => e.tenantId === tId);
  });

  readonly totalExpenses = computed(() =>
    this.tenantExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  // Time-based calculations for Weekly vs Monthly Reports
  readonly weeklyReport = computed(() => {
    const expenses = this.tenantExpenses();
    const now = Date.now();
    const sevenDaysMs = 7 * 86400000;
    const fourteenDaysMs = 14 * 86400000;

    const thisWeekList = expenses.filter(e => e.date >= now - sevenDaysMs);
    const lastWeekList = expenses.filter(e => e.date >= now - fourteenDaysMs && e.date < now - sevenDaysMs);

    const thisWeekTotal = thisWeekList.reduce((acc, e) => acc + e.amount, 0);
    const lastWeekTotal = lastWeekList.reduce((acc, e) => acc + e.amount, 0);

    const diff = thisWeekTotal - lastWeekTotal;
    const percentChange = lastWeekTotal > 0 ? Math.round((diff / lastWeekTotal) * 100) : (thisWeekTotal > 0 ? 100 : 0);

    return {
      thisWeekTotal,
      lastWeekTotal,
      diff,
      percentChange,
      isIncrease: diff > 0,
      countThisWeek: thisWeekList.length
    };
  });

  readonly monthlyReport = computed(() => {
    const expenses = this.tenantExpenses();
    const now = Date.now();
    const thirtyDaysMs = 30 * 86400000;
    const sixtyDaysMs = 60 * 86400000;

    const thisMonthList = expenses.filter(e => e.date >= now - thirtyDaysMs);
    const lastMonthList = expenses.filter(e => e.date >= now - sixtyDaysMs && e.date < now - thirtyDaysMs);

    const thisMonthTotal = thisMonthList.reduce((acc, e) => acc + e.amount, 0);
    const lastMonthTotal = lastMonthList.reduce((acc, e) => acc + e.amount, 0);

    const diff = thisMonthTotal - lastMonthTotal;
    const percentChange = lastMonthTotal > 0 ? Math.round((diff / lastMonthTotal) * 100) : (thisMonthTotal > 0 ? 100 : 0);

    return {
      thisMonthTotal,
      lastMonthTotal,
      diff,
      percentChange,
      isIncrease: diff > 0,
      countThisMonth: thisMonthList.length
    };
  });

  readonly expensesByCategory = computed(() => {
    const expenses = this.tenantExpenses();
    const total = this.totalExpenses();
    const map = new Map<string, number>();

    const categoryLabels: Record<string, string> = {
      marketing: 'Digital & Social Ads',
      travel_fuel: 'Site Visit Commute & Fuel',
      client_hospitality: 'Buyer Hospitality & Refreshments',
      legal_documentation: 'Legal, Patta & EC Searches',
      site_maintenance: 'Site Clearing & Signboards',
      portal_listing_fee: 'Listing Portals (99acres/MagicBricks)',
      office_rent: 'Office Rent & Operations',
      miscellaneous: 'Miscellaneous Overhead'
    };

    for (const exp of expenses) {
      const cat = exp.category || 'miscellaneous';
      map.set(cat, (map.get(cat) || 0) + exp.amount);
    }

    return Array.from(map.entries())
      .map(([cat, amount]) => ({
        category: cat,
        label: categoryLabels[cat] || cat,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  readonly expensesByProperty = computed(() => {
    const expenses = this.tenantExpenses();
    const map = new Map<string, { propertyId: string; propertyTitle: string; total: number; count: number }>();

    for (const exp of expenses) {
      const key = exp.propertyId || 'general_agency';
      const title = exp.propertyTitle || 'General Agency Operations';

      const existing = map.get(key) || {
        propertyId: key,
        propertyTitle: title,
        total: 0,
        count: 0
      };

      existing.total += exp.amount;
      existing.count += 1;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  });

  constructor() {
    effect(() => {
      const tenantId = this.auth.activeTenantId();
      this.bindFirestoreListener(tenantId);
    });
  }

  private loadCache(): Expense[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed: Expense[] = JSON.parse(saved);
        return parsed.filter(e => e.tenantId !== 'tenant_prime_properties');
      }
    } catch {}
    return [];
  }

  private saveCache(list: Expense[]): void {
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

    const path = tenantId === 'platform_global' ? 'tenants/tenant_default/expenses' : `tenants/${tenantId}/expenses`;
    try {
      const colRef = collection(this.firebase.firestore, path);
      this.unsubscribeSnapshot = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: Expense[] = [];
            snapshot.forEach(d => {
              remote.push({ id: d.id, ...d.data() } as Expense);
            });
            this.allExpenses.set(remote);
            this.saveCache(remote);
          }
        },
        (error) => {
          console.warn(`Firestore real-time sync for ${path} operating in offline cache mode:`, error.message);
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot for expenses:', e);
    }
  }

  async addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const tenantId = data.tenantId || this.auth.activeTenantId() || 'tenant_default';
    const id = `exp_${Date.now()}`;
    const newExp: Expense = {
      ...data,
      id,
      tenantId,
      createdAt: Date.now()
    };

    this.allExpenses.update(list => [newExp, ...list]);
    this.saveCache(this.allExpenses());

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/expenses`, id);
      await setDoc(docRef, { ...newExp, _cloudSyncedAt: Date.now() });
    } catch (err) {
      console.warn('Firestore offline write queued for sync:', err);
    }

    return newExp;
  }

  async deleteExpense(id: string): Promise<void> {
    const current = this.allExpenses().find(e => e.id === id);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allExpenses.update(list => list.filter(e => e.id !== id));
    this.saveCache(this.allExpenses());

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/expenses`, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore offline delete queued:', err);
    }
  }
}

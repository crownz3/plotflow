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
import { Deal } from '../models/models';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { fireConfetti } from '../utils/confetti.util';
import { sanitizeForFirestore } from '../utils/firestore.util';

@Injectable({
  providedIn: 'root'
})
export class DealService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);

  readonly allDeals = signal<Deal[]>([]);
  private unsubscribeSnapshot: Unsubscribe | null = null;

  readonly tenantDeals = computed(() => {
    const tId = this.auth.activeTenantId();
    if (!tId) return [];
    if (this.auth.isSuperAdmin() && tId === 'platform_global') {
      return this.allDeals();
    }
    return this.allDeals().filter(d => d.tenantId === tId);
  });

  // Total Gross Brokerage Earned
  readonly totalGrossBrokerage = computed(() =>
    this.tenantDeals().reduce((acc, d) => acc + (d.grossBrokerage || 0), 0)
  );

  // Total Net Agency Brokerage
  readonly totalNetBrokerage = computed(() =>
    this.tenantDeals().reduce((acc, d) => acc + (d.netAgencyBrokerage || 0), 0)
  );

  // Total Balance Receivable
  readonly totalReceivable = computed(() =>
    this.tenantDeals().reduce((acc, d) => acc + (d.balanceReceivable || 0), 0)
  );

  // Time-based calculations for Sales & Revenue Reports
  readonly weeklySales = computed(() => {
    const deals = this.tenantDeals();
    const now = Date.now();
    const sevenDaysMs = 7 * 86400000;
    const fourteenDaysMs = 14 * 86400000;

    const thisWeekList = deals.filter(d => (d.closingDate || d.createdAt) >= now - sevenDaysMs);
    const lastWeekList = deals.filter(d => {
      const t = d.closingDate || d.createdAt;
      return t >= now - fourteenDaysMs && t < now - sevenDaysMs;
    });

    const thisWeekRevenue = thisWeekList.reduce((acc, d) => acc + (d.grossBrokerage || 0), 0);
    const lastWeekRevenue = lastWeekList.reduce((acc, d) => acc + (d.grossBrokerage || 0), 0);

    const diff = thisWeekRevenue - lastWeekRevenue;
    const percentChange = lastWeekRevenue > 0 ? Math.round((diff / lastWeekRevenue) * 100) : (thisWeekRevenue > 0 ? 100 : 0);

    return {
      thisWeekRevenue,
      lastWeekRevenue,
      diff,
      percentChange,
      isIncrease: diff > 0,
      dealsThisWeek: thisWeekList.length
    };
  });

  readonly monthlySales = computed(() => {
    const deals = this.tenantDeals();
    const now = Date.now();
    const thirtyDaysMs = 30 * 86400000;
    const sixtyDaysMs = 60 * 86400000;

    const thisMonthList = deals.filter(d => (d.closingDate || d.createdAt) >= now - thirtyDaysMs);
    const lastMonthList = deals.filter(d => {
      const t = d.closingDate || d.createdAt;
      return t >= now - sixtyDaysMs && t < now - thirtyDaysMs;
    });

    const thisMonthRevenue = thisMonthList.reduce((acc, d) => acc + (d.grossBrokerage || 0), 0);
    const lastMonthRevenue = lastMonthList.reduce((acc, d) => acc + (d.grossBrokerage || 0), 0);

    const diff = thisMonthRevenue - lastMonthRevenue;
    const percentChange = lastMonthRevenue > 0 ? Math.round((diff / lastMonthRevenue) * 100) : (thisMonthRevenue > 0 ? 100 : 0);

    return {
      thisMonthRevenue,
      lastMonthRevenue,
      diff,
      percentChange,
      isIncrease: diff > 0,
      dealsThisMonth: thisMonthList.length
    };
  });

  constructor() {
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
      this.allDeals.set([]);
      return;
    }

    const path = tenantId === 'platform_global' ? 'tenants/tenant_default/deals' : `tenants/${tenantId}/deals`;
    try {
      const colRef = collection(this.firebase.firestore, path);
      this.unsubscribeSnapshot = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          const remote: Deal[] = [];
          snapshot.forEach(d => {
            remote.push({ id: d.id, ...d.data() } as Deal);
          });
          this.allDeals.set(remote);
        },
        (error) => {
          console.warn(`Firestore real-time sync for ${path} operating in offline cache mode:`, error.message);
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot for deals:', e);
    }
  }

  calculateFinancials(
    dealValue: number,
    buyerPct: number,
    sellerPct: number,
    gstPct: number = 18,
    agentSplitPct: number = 25
  ) {
    const grossBrokerage = dealValue * ((buyerPct + sellerPct) / 100);
    const gstAmount = grossBrokerage * (gstPct / 100);
    const netAfterGst = grossBrokerage - gstAmount;
    const agentCommissionAmount = netAfterGst * (agentSplitPct / 100);
    const netAgencyBrokerage = netAfterGst - agentCommissionAmount;

    return {
      grossBrokerage,
      gstAmount,
      netAfterGst,
      agentCommissionAmount,
      netAgencyBrokerage
    };
  }

  async closeDeal(data: Omit<Deal, 'id' | 'createdAt'>): Promise<Deal> {
    const tenantId = data.tenantId || this.auth.activeTenantId() || 'tenant_default';
    const id = `deal_${Date.now()}`;
    const newDeal: Deal = {
      ...data,
      id,
      tenantId,
      status: 'closed_won',
      createdAt: Date.now()
    };

    // 1. Optimistic Signal Update
    this.allDeals.update(list => [newDeal, ...list]);

    // 2. Cloud Firestore with IndexedDB persistence
    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/deals`, id);
      const payload = sanitizeForFirestore({ ...newDeal, _cloudSyncedAt: Date.now() });
      await setDoc(docRef, payload);
    } catch (err) {
      console.warn('Firestore offline write queued for sync:', err);
    }

    try {
      fireConfetti(3000);
    } catch (e) {
      console.log('Confetti triggered!');
    }

    return newDeal;
  }

  async updateDeal(dealId: string, updates: Partial<Deal>): Promise<void> {
    const current = this.allDeals().find(d => d.id === dealId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allDeals.update(list =>
      list.map(d => d.id === dealId ? { ...d, ...updates } : d)
    );

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/deals`, dealId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.warn('Firestore offline update queued:', err);
    }
  }

  async deleteDeal(dealId: string): Promise<void> {
    const current = this.allDeals().find(d => d.id === dealId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allDeals.update(list => list.filter(d => d.id !== dealId));

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/deals`, dealId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore offline delete queued:', err);
    }
  }
}

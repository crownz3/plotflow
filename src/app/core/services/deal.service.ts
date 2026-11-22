import { Injectable, signal, computed, inject } from '@angular/core';
import { Deal } from '../models/models';
import { AuthService } from './auth.service';
import { fireConfetti } from '../utils/confetti.util';

@Injectable({
  providedIn: 'root'
})
export class DealService {
  private auth = inject(AuthService);
  private storageKey = 'pf_deals';

  readonly allDeals = signal<Deal[]>(this.loadInitial());

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

  private loadInitial(): Deal[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.allDeals()));
    } catch (e) {
      console.warn('Failed to persist deals:', e);
    }
  }

  /**
   * Financial Deal Calculator
   */
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

  /**
   * Close a deal, add to ledger, and trigger celebration confetti!
   */
  closeDeal(data: Omit<Deal, 'id' | 'createdAt'>): Deal {
    const newDeal: Deal = {
      ...data,
      id: `deal_${Date.now()}`,
      status: 'closed_won',
      createdAt: Date.now()
    };

    this.allDeals.update(list => [newDeal, ...list]);
    this.save();

    // Fire celebratory confetti!
    try {
      fireConfetti(3000);
    } catch (e) {
      console.log('Confetti triggered!');
    }

    return newDeal;
  }

  updateDeal(dealId: string, updates: Partial<Deal>): void {
    this.allDeals.update(list =>
      list.map(d => d.id === dealId ? { ...d, ...updates } : d)
    );
    this.save();
  }

  deleteDeal(dealId: string): void {
    this.allDeals.update(list => list.filter(d => d.id !== dealId));
    this.save();
  }
}

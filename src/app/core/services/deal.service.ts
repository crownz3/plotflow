import { Injectable, signal, computed, inject } from '@angular/core';
import { Deal } from '../models/models';
import { AuthService } from './auth.service';
import { fireConfetti } from '../utils/confetti.util';
import { DEMO_DEALS } from './demo-data';

@Injectable({
  providedIn: 'root'
})
export class DealService {
  private auth = inject(AuthService);

  readonly allDeals = signal<Deal[]>(DEMO_DEALS);

  readonly tenantDeals = computed(() => {
    const tId = this.auth.activeTenantId();
    return this.allDeals().filter(d => d.tenantId === tId);
  });

  // Total Gross Brokerage Earned
  readonly totalGrossBrokerage = computed(() =>
    this.tenantDeals().reduce((acc, d) => acc + d.grossBrokerage, 0)
  );

  // Total Net Agency Brokerage
  readonly totalNetBrokerage = computed(() =>
    this.tenantDeals().reduce((acc, d) => acc + d.netAgencyBrokerage, 0)
  );

  // Total Balance Receivable
  readonly totalReceivable = computed(() =>
    this.tenantDeals().reduce((acc, d) => acc + d.balanceReceivable, 0)
  );

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
   * Close a deal, add to ledger, and trigger celebration confetti! 🎊
   */
  closeDeal(data: Omit<Deal, 'id' | 'createdAt'>): Deal {
    const newDeal: Deal = {
      ...data,
      id: `deal_${Date.now()}`,
      status: 'closed_won',
      createdAt: Date.now()
    };

    this.allDeals.update(list => [newDeal, ...list]);

    // Fire celebratory confetti! 🎊
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
  }

  deleteDeal(dealId: string): void {
    this.allDeals.update(list => list.filter(d => d.id !== dealId));
  }
}


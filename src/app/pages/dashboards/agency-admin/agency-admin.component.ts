import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PropertyService } from '../../../core/services/property.service';
import { LeadService } from '../../../core/services/lead.service';
import { DealService } from '../../../core/services/deal.service';
import { SiteVisitService } from '../../../core/services/site-visit.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { DealModalComponent } from '../../../shared/components/deal-modal/deal-modal.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

export interface AgentLeaderboardEntry {
  agentName: string;
  agentId: string;
  initials: string;
  dealsClosed: number;
  commissionEarned: number;
}

@Component({
  selector: 'app-agency-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatCardComponent,
    StatusPillComponent,
    CurrencyFormatPipe,
    DealModalComponent,
    EmptyStateComponent
  ],
  templateUrl: './agency-admin.component.html',
  styleUrl: './agency-admin.component.scss'
})
export class AgencyAdminDashboardComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  propertyService = inject(PropertyService);
  leadService = inject(LeadService);
  dealService = inject(DealService);
  siteVisitService = inject(SiteVisitService);
  expenseService = inject(ExpenseService);

  openDealModal = signal(false);

  scheduleInitialVisit(): void {
    this.siteVisitService.scheduleVisit({
      tenantId: this.auth.activeTenantId(),
      leadId: 'lead_temp',
      leadName: 'Direct Walk-in',
      leadPhone: '+91 98765 00000',
      propertyId: 'prop_temp',
      propertyTitle: 'Initial Inspection Visit',
      propertyLocation: 'Property Site',
      agentId: this.auth.currentUser()?.uid || 'user_agent_01',
      agentName: this.auth.currentUser()?.displayName || 'Advisor',
      scheduledTime: Date.now() + 86400000,
      status: 'scheduled'
    });
  }

  // Dynamic real leaderboard computed strictly from closed deals in active tenant
  readonly agentLeaderboard = computed<AgentLeaderboardEntry[]>(() => {
    const deals = this.dealService.tenantDeals();
    const map = new Map<string, AgentLeaderboardEntry>();

    for (const deal of deals) {
      const name = deal.agentName || 'Agent';
      const key = deal.agentId || name;
      const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AG';

      const existing = map.get(key) || {
        agentName: name,
        agentId: deal.agentId || '',
        initials,
        dealsClosed: 0,
        commissionEarned: 0
      };

      existing.dealsClosed += 1;
      existing.commissionEarned += deal.agentCommissionAmount || 0;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.commissionEarned - a.commissionEarned);
  });

  handleDealClosed() {
    console.log('Deal closed successfully with confetti celebration!');
  }
}

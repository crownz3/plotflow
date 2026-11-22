import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PropertyService } from '../../../core/services/property.service';
import { LeadService } from '../../../core/services/lead.service';
import { SiteVisitService } from '../../../core/services/site-visit.service';
import { DealService } from '../../../core/services/deal.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { DealModalComponent } from '../../../shared/components/deal-modal/deal-modal.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-agent-dashboard',
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
  templateUrl: './agent.component.html',
  styleUrl: './agent.component.scss'
})
export class AgentDashboardComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  propertyService = inject(PropertyService);
  leadService = inject(LeadService);
  siteVisitService = inject(SiteVisitService);
  dealService = inject(DealService);
  router = inject(Router);

  openDealModal = signal(false);

  expiryInfo = computed(() => this.tenantService.getSubscriptionExpiryInfo());

  navigateToLeads(): void {
    this.router.navigate(['/leads']);
  }

  // Real Agent Assigned Leads
  readonly myAssignedLeads = computed(() => {
    const uid = this.auth.currentUser()?.uid;
    const leads = this.leadService.tenantLeads();
    if (!uid) return leads;
    const filtered = leads.filter(l => l.assignedAgentId === uid || !l.assignedAgentId);
    return filtered.length > 0 ? filtered : leads;
  });

  // Real Site Visits for this agent
  readonly myTodayVisits = computed(() => {
    const uid = this.auth.currentUser()?.uid;
    const name = this.auth.currentUser()?.displayName;
    const visits = this.siteVisitService.tenantVisits();
    return visits.filter(v =>
      v.agentId === uid ||
      v.agentName === name ||
      !v.agentId
    );
  });

  // Real Closed Deals by this agent
  readonly myClosedDeals = computed(() => {
    const uid = this.auth.currentUser()?.uid;
    const name = this.auth.currentUser()?.displayName;
    const deals = this.dealService.tenantDeals();
    return deals.filter(d =>
      d.agentId === uid ||
      d.agentName === name ||
      !d.agentId
    );
  });

  // Real Commission Payout
  readonly myCommissionPayout = computed(() => {
    return this.myClosedDeals().reduce((acc, d) => acc + (d.agentCommissionAmount || 0), 0);
  });
}

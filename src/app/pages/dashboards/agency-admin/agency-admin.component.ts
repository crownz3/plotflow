import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PropertyService } from '../../../core/services/property.service';
import { LeadService } from '../../../core/services/lead.service';
import { DealService } from '../../../core/services/deal.service';
import { SiteVisitService } from '../../../core/services/site-visit.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AiService } from '../../../core/services/ai.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { DealModalComponent } from '../../../shared/components/deal-modal/deal-modal.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SiteVisit, Expense } from '../../../core/models/models';

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
    FormsModule,
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
  snackbar = inject(SnackbarService);
  ai = inject(AiService);

  // Active Hub Tab: 'overview' | 'visitors_concerns' | 'expenses_reports'
  activeTab = signal<'overview' | 'visitors_concerns' | 'expenses_reports'>('overview');

  openDealModal = signal(false);
  expiryInfo = computed(() => this.tenantService.getSubscriptionExpiryInfo());

  // ==========================================
  // BUYERS & VISITORS CONCERNS / RETARGETING
  // ==========================================
  visitorSearch = signal('');
  selectedConcernFilter = signal<'all' | 'price_budget' | 'location_connectivity' | 'vastu_facing' | 'bank_loan_legal' | 'size_layout' | 'next_project'>('all');

  openConcernModal = signal(false);
  selectedVisit = signal<SiteVisit | null>(null);

  concernForm = {
    category: 'price_budget' as SiteVisit['buyerConcernCategory'],
    notes: '',
    interestedInNextProject: true,
    targetBudget: null as number | null,
    preferredLocality: '',
    preferredSize: ''
  };

  readonly visitorsWithConcerns = computed(() => {
    const visits = this.siteVisitService.tenantVisits();
    const search = this.visitorSearch().toLowerCase().trim();
    const filter = this.selectedConcernFilter();

    return visits.filter(v => {
      const matchesSearch = !search ||
        v.leadName.toLowerCase().includes(search) ||
        v.leadPhone.toLowerCase().includes(search) ||
        v.propertyTitle.toLowerCase().includes(search) ||
        (v.buyerConcernNotes && v.buyerConcernNotes.toLowerCase().includes(search)) ||
        (v.feedback && v.feedback.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      if (filter === 'all') return true;
      if (filter === 'next_project') return !!v.interestedInNextProject;
      return v.buyerConcernCategory === filter;
    });
  });

  readonly concernStats = computed(() => {
    const visits = this.siteVisitService.tenantVisits();
    return {
      totalVisits: visits.length,
      loggedConcerns: visits.filter(v => !!v.buyerConcernCategory).length,
      nextProjectReady: visits.filter(v => !!v.interestedInNextProject).length,
      budgetIssueCount: visits.filter(v => v.buyerConcernCategory === 'price_budget').length,
      locationIssueCount: visits.filter(v => v.buyerConcernCategory === 'location_connectivity').length,
      vastuIssueCount: visits.filter(v => v.buyerConcernCategory === 'vastu_facing').length,
      loanIssueCount: visits.filter(v => v.buyerConcernCategory === 'bank_loan_legal').length
    };
  });

  openLogConcernModal(visit: SiteVisit): void {
    this.selectedVisit.set(visit);
    this.concernForm = {
      category: visit.buyerConcernCategory || 'price_budget',
      notes: visit.buyerConcernNotes || visit.feedback || '',
      interestedInNextProject: visit.interestedInNextProject !== undefined ? visit.interestedInNextProject : true,
      targetBudget: visit.nextProjectPreferences?.targetBudget || null,
      preferredLocality: visit.nextProjectPreferences?.preferredLocality || '',
      preferredSize: visit.nextProjectPreferences?.preferredSize || ''
    };
    this.openConcernModal.set(true);
  }

  saveBuyerConcern(): void {
    const visit = this.selectedVisit();
    if (!visit) return;

    this.siteVisitService.recordBuyerConcern(visit.id, {
      buyerConcernCategory: this.concernForm.category,
      buyerConcernNotes: this.concernForm.notes.trim(),
      interestedInNextProject: this.concernForm.interestedInNextProject,
      nextProjectPreferences: {
        targetBudget: this.concernForm.targetBudget || undefined,
        preferredLocality: this.concernForm.preferredLocality.trim() || undefined,
        preferredSize: this.concernForm.preferredSize.trim() || undefined
      }
    });

    this.openConcernModal.set(false);
    this.snackbar.success(`Visitor concern & next project preferences saved for ${visit.leadName}.`);
  }

  getConcernBadge(category?: string): { label: string; color: string } {
    switch (category) {
      case 'price_budget': return { label: 'Budget / Price Issue', color: 'red' };
      case 'location_connectivity': return { label: 'Location / Roads', color: 'amber' };
      case 'vastu_facing': return { label: 'Vastu / Facing Preference', color: 'blue' };
      case 'bank_loan_legal': return { label: 'Loan / Legal Clearance', color: 'amber' };
      case 'size_layout': return { label: 'Plot Size / Dimensions', color: 'blue' };
      case 'timeline': return { label: 'Timeline / Possession Delay', color: 'amber' };
      case 'other': return { label: 'Specific Requirement', color: 'gray' };
      default: return { label: 'Not Recorded', color: 'gray' };
    }
  }

  // ==========================================
  // PROPERTY EXPENSES & COMPARISON REPORTS
  // ==========================================
  reportPeriod = signal<'weekly' | 'monthly'>('weekly');
  openExpenseModal = signal(false);

  expenseForm = {
    title: '',
    category: 'travel_fuel' as Expense['category'],
    amount: 2500,
    propertyId: '',
    notes: '',
    date: new Date().toISOString().slice(0, 10)
  };

  readonly weeklyComparisonData = computed(() => {
    const exp = this.expenseService.weeklyReport();
    const sales = this.dealService.weeklySales();
    const netThisWeek = sales.thisWeekRevenue - exp.thisWeekTotal;
    const netLastWeek = sales.lastWeekRevenue - exp.lastWeekTotal;
    const roiRatio = sales.thisWeekRevenue > 0 ? Math.round((exp.thisWeekTotal / sales.thisWeekRevenue) * 100) : 0;

    return {
      exp,
      sales,
      netThisWeek,
      netLastWeek,
      roiRatio
    };
  });

  readonly monthlyComparisonData = computed(() => {
    const exp = this.expenseService.monthlyReport();
    const sales = this.dealService.monthlySales();
    const netThisMonth = sales.thisMonthRevenue - exp.thisMonthTotal;
    const netLastMonth = sales.lastMonthRevenue - exp.lastMonthTotal;
    const roiRatio = sales.thisMonthRevenue > 0 ? Math.round((exp.thisMonthTotal / sales.thisMonthRevenue) * 100) : 0;

    return {
      exp,
      sales,
      netThisMonth,
      netLastMonth,
      roiRatio
    };
  });

  openAddExpenseModal(propertyId?: string): void {
    const props = this.propertyService.tenantProperties();
    this.expenseForm = {
      title: '',
      category: 'travel_fuel',
      amount: 1500,
      propertyId: propertyId || (props.length > 0 ? props[0].id : ''),
      notes: '',
      date: new Date().toISOString().slice(0, 10)
    };
    this.openExpenseModal.set(true);
  }

  savePropertyExpense(): void {
    if (!this.expenseForm.title.trim() || this.expenseForm.amount <= 0) {
      this.snackbar.error('Please enter expense title and a valid amount.');
      return;
    }

    const props = this.propertyService.tenantProperties();
    const prop = props.find(p => p.id === this.expenseForm.propertyId);

    this.expenseService.addExpense({
      tenantId: this.auth.activeTenantId(),
      title: this.expenseForm.title.trim(),
      category: this.expenseForm.category,
      amount: Number(this.expenseForm.amount),
      propertyId: prop?.id,
      propertyTitle: prop?.title,
      notes: this.expenseForm.notes.trim() || undefined,
      date: new Date(this.expenseForm.date).getTime(),
      loggedBy: this.auth.currentUser()?.displayName || 'Principal Broker'
    });

    this.openExpenseModal.set(false);
    this.snackbar.success(`Property sale expense of ₹${this.expenseForm.amount.toLocaleString('en-IN')} recorded successfully.`);
  }

  deleteExpense(id: string): void {
    if (confirm('Delete this expense record?')) {
      this.expenseService.deleteExpense(id);
      this.snackbar.info('Expense record deleted.');
    }
  }

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

  askAiForConcern(visit: SiteVisit): void {
    const props = this.propertyService.tenantProperties();
    const prop = props.find(p => p.id === visit.propertyId) || props[0];

    this.ai.openAiPromptDialog({
      mode: 'objection_handling',
      title: `AI Deal Coach: ${visit.leadName}`,
      subtitle: `Resolve ${visit.buyerConcernCategory || 'Buyer Objection'} with micro-market pricing data`,
      payload: {
        category: visit.buyerConcernCategory || 'price_budget',
        notes: visit.buyerConcernNotes || visit.feedback || 'Buyer hesitated on asking price and wants negotiation discount',
        propertyTitle: visit.propertyTitle || prop?.title || 'Property Site',
        price: prop ? prop.price : 4500000,
        buyerName: visit.leadName,
        buyerPhone: visit.leadPhone,
        summary: `Buyer ${visit.leadName} raised: "${visit.buyerConcernNotes || visit.buyerConcernCategory || 'Budget issue'}" on ${visit.propertyTitle}.`
      }
    });
  }

  promptObjectionAi(): void {
    this.ai.openAiPromptDialog({
      mode: 'objection_handling',
      title: 'AI Deal Coach: Negotiation Assistance',
      subtitle: 'Overcome common buyer resistance and book appointments',
      payload: {
        category: 'price_budget',
        notes: 'Buyer claims adjacent layouts are cheaper and wants an unviable discount',
        propertyTitle: 'Prime Residential Layout',
        price: 4500000,
        buyerName: 'Prospective Client',
        summary: 'Buyer is comparing approved layout against unapproved roadside plots.'
      }
    });
  }

  askAiForExpenseAudit(): void {
    this.ai.openAiPromptDialog({
      mode: 'expense_audit',
      title: 'PlotFlow AI Financial Audit',
      subtitle: 'Identify marketing leaks & calculate acquisition efficiency',
      payload: {
        weeklyData: this.expenseService.weeklyReport(),
        monthlyData: this.expenseService.monthlyReport(),
        summary: `Evaluating ₹${this.expenseService.totalExpenses()} in sales expenses against ₹${this.dealService.totalGrossBrokerage()} in brokerage revenue.`
      }
    });
  }

  handleDealClosed() {
    this.snackbar.success('Deal closed and recorded in agency ledger with commission calculations!');
  }
}

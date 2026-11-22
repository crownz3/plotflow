import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../core/services/lead.service';
import { AuthService } from '../../core/services/auth.service';
import { Lead, LeadStage, Property } from '../../core/models/models';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DealModalComponent } from '../../shared/components/deal-modal/deal-modal.component';
import { LeadCardComponent } from '../../shared/components/lead-card/lead-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { fireConfetti } from '../../core/utils/confetti.util';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusPillComponent,
    CurrencyFormatPipe,
    DealModalComponent,
    LeadCardComponent,
    EmptyStateComponent
  ],
  templateUrl: './leads.component.html',
  styleUrl: './leads.component.scss'
})
export class LeadsComponent {
  leadService = inject(LeadService);
  auth = inject(AuthService);

  readonly stages: { id: LeadStage; title: string }[] = [
    { id: 'new', title: 'New Leads' },
    { id: 'contacted', title: 'Contacted' },
    { id: 'visit_scheduled', title: 'Visit Scheduled' },
    { id: 'negotiation', title: 'Negotiation' },
    { id: 'closed_won', title: 'Closed Won' }
  ];

  // View Mode: Cards vs Kanban vs Table
  readonly viewMode = signal<'kanban' | 'cards' | 'table'>(
    typeof window !== 'undefined' && window.innerWidth < 992 ? 'cards' : 'kanban'
  );

  toggleView(mode: 'kanban' | 'cards' | 'table') {
    this.viewMode.set(mode);
  }

  searchQuery = '';
  selectedFilterStage = signal<string>('all');

  filteredLinearLeads = computed(() => {
    let list = this.leadService.tenantLeads();
    const st = this.selectedFilterStage();
    if (st !== 'all') {
      list = list.filter(l => l.stage === st);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.requirement?.preferredLocations && l.requirement.preferredLocations.some(loc => loc.toLowerCase().includes(q)))
      );
    }
    return list;
  });

  selectedLeadForMatch = signal<Lead | null>(null);
  matchedProperties = signal<Property[]>([]);
  openAddModal = signal(false);
  editingLead = signal<Lead | null>(null);
  dealModalOpen = signal(false);
  dealModalProp?: Property;

  editLeadForm = {
    name: '',
    phone: '',
    stage: 'new' as LeadStage,
    priority: 'hot' as any,
    budgetMax: 20000000
  };

  newLead = {
    name: '',
    phone: '',
    source: 'walk_in' as any,
    budgetMin: 15000000,
    budgetMax: 22000000,
    locations: 'ECR, OMR'
  };

  openMatcher(lead: Lead) {
    this.selectedLeadForMatch.set(lead);
    const matches = this.leadService.getMatchingProperties(lead);
    this.matchedProperties.set(matches);
  }

  markAsWon(lead: Lead) {
    this.leadService.updateStage(lead.id, 'closed_won');
    fireConfetti(3000); // 🎊 Celebrate closed won!
  }

  closeDealWithProp(prop: Property) {
    this.dealModalProp = prop;
    this.dealModalOpen.set(true);
  }

  saveLead() {
    if (!this.newLead.name) return;
    this.leadService.addLead({
      tenantId: this.auth.activeTenantId(),
      name: this.newLead.name,
      phone: this.newLead.phone,
      source: this.newLead.source,
      stage: 'new',
      priority: 'hot',
      requirement: {
        propertyTypes: ['apartment', 'villa'],
        listingType: 'sale',
        budgetMin: this.newLead.budgetMin,
        budgetMax: this.newLead.budgetMax,
        preferredLocations: this.newLead.locations.split(',').map(s => s.trim())
      }
    });

    this.openAddModal.set(false);
  }

  startEditLead(lead: Lead) {
    this.editingLead.set(lead);
    this.editLeadForm = {
      name: lead.name,
      phone: lead.phone,
      stage: lead.stage,
      priority: lead.priority,
      budgetMax: lead.requirement.budgetMax
    };
  }

  saveEditLead() {
    const cur = this.editingLead();
    if (!cur) return;
    this.leadService.updateLead(cur.id, {
      name: this.editLeadForm.name,
      phone: this.editLeadForm.phone,
      stage: this.editLeadForm.stage,
      priority: this.editLeadForm.priority,
      requirement: {
        ...cur.requirement,
        budgetMax: this.editLeadForm.budgetMax
      }
    });
    this.editingLead.set(null);
  }

  deleteLead(lead: Lead) {
    if (confirm(`Are you sure you want to delete "${lead.name}"?`)) {
      this.leadService.deleteLead(lead.id);
    }
  }
}

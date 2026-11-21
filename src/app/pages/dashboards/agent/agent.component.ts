import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PropertyService } from '../../../core/services/property.service';
import { LeadService } from '../../../core/services/lead.service';
import { SiteVisitService } from '../../../core/services/site-visit.service';
import { DealService } from '../../../core/services/deal.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { DealModalComponent } from '../../../shared/components/deal-modal/deal-modal.component';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, StatusPillComponent, CurrencyFormatPipe, DealModalComponent],
  templateUrl: './agent.component.html',
  styleUrl: './agent.component.scss'
})
export class AgentDashboardComponent {
  auth = inject(AuthService);
  propertyService = inject(PropertyService);
  leadService = inject(LeadService);
  siteVisitService = inject(SiteVisitService);
  dealService = inject(DealService);

  openDealModal = signal(false);
}

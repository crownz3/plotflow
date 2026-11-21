import { Component, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-agency-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, StatusPillComponent, CurrencyFormatPipe, DealModalComponent],
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

  handleDealClosed() {
    console.log('Deal closed successfully with confetti celebration!');
  }
}

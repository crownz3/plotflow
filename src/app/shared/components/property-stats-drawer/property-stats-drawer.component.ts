import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Property, Lead, SiteVisit } from '../../../core/models/models';
import { PropertyAnalyticsService, PropertyIntelligence } from '../../../core/services/property-analytics.service';
import { LeadService } from '../../../core/services/lead.service';
import { StatusPillComponent } from '../status-pill/status-pill.component';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { AreaFormatPipe } from '../../pipes/area-format.pipe';

@Component({
  selector: 'app-property-stats-drawer',
  standalone: true,
  imports: [CommonModule, StatusPillComponent, CurrencyFormatPipe, AreaFormatPipe],
  templateUrl: './property-stats-drawer.component.html',
  styleUrl: './property-stats-drawer.component.scss'
})
export class PropertyStatsDrawerComponent {
  @Input({ required: true }) property!: Property;
  @Output() onClose = new EventEmitter<void>();
  @Output() onCloseDeal = new EventEmitter<Property>();

  analyticsService = inject(PropertyAnalyticsService);
  leadService = inject(LeadService);

  get intel(): PropertyIntelligence {
    return this.analyticsService.getPropertyIntelligence(this.property);
  }

  getWhatsAppPitchUrl(lead: Lead): string {
    return this.leadService.getWhatsAppShareUrl(lead, this.property);
  }
}


import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Property } from '../../../core/models/models';
import { StatusPillComponent } from '../status-pill/status-pill.component';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { AreaFormatPipe } from '../../pipes/area-format.pipe';
import { BrochureService } from '../../../core/services/brochure.service';
import { AuthService } from '../../../core/services/auth.service';
import { PropertyAnalyticsService, PropertyIntelligence } from '../../../core/services/property-analytics.service';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [CommonModule, StatusPillComponent, CurrencyFormatPipe, AreaFormatPipe],
  templateUrl: './property-card.component.html',
  styleUrl: './property-card.component.scss'
})
export class PropertyCardComponent {
  @Input({ required: true }) property!: Property;
  @Output() onSelect = new EventEmitter<Property>();
  @Output() onEdit = new EventEmitter<Property>();
  @Output() onDelete = new EventEmitter<Property>();
  @Output() onViewStats = new EventEmitter<Property>();
  @Output() onShare = new EventEmitter<Property>();

  auth = inject(AuthService);
  brochureService = inject(BrochureService);
  private analyticsService = inject(PropertyAnalyticsService);

  isSharing = false;
  defaultImg = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';

  get intel(): PropertyIntelligence {
    return this.analyticsService.getPropertyIntelligence(this.property);
  }

  openShare(event: Event): void {
    event.stopPropagation();
    this.onShare.emit(this.property);
  }

  async shareBrochureDirect(event: Event): Promise<void> {
    event.stopPropagation();
    if (this.isSharing) return;
    this.isSharing = true;
    try {
      await this.brochureService.generateAndShareBrochure(this.property);
    } catch (err) {
      console.error('Error generating brochure:', err);
    } finally {
      this.isSharing = false;
    }
  }
}

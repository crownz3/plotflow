import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-pill.component.html',
  styleUrl: './status-pill.component.scss'
})
export class StatusPillComponent {
  @Input({ required: true }) status!: string;
  @Input() label?: string;

  get mappedClass(): string {
    const s = this.status?.toLowerCase() || '';
    if (['available', 'closed_won', 'active', 'completed', 'pro'].includes(s)) return 'success';
    if (['under_offer', 'negotiation', 'trial', 'visit_scheduled', 'warm'].includes(s)) return 'warning';
    if (['sold', 'rented', 'closed_lost', 'cancelled', 'urgent', 'hot'].includes(s)) return 'danger';
    return 'info';
  }

  get displayLabel(): string {
    if (this.label) return this.label;
    if (!this.status) return 'Available';
    const s = this.status.replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}


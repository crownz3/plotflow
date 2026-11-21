import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lead } from '../../../core/models/models';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { LeadService } from '../../../core/services/lead.service';

@Component({
  selector: 'app-lead-card',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe],
  templateUrl: './lead-card.component.html',
  styleUrl: './lead-card.component.scss'
})
export class LeadCardComponent {
  @Input({ required: true }) lead!: Lead;
  @Output() onOpenMatcher = new EventEmitter<Lead>();
  @Output() onMarkWon = new EventEmitter<Lead>();
  @Output() onEdit = new EventEmitter<Lead>();
  @Output() onDelete = new EventEmitter<Lead>();

  leadService = inject(LeadService);
}


import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: string | number;
  @Input() subtitle?: string;
  @Input() badgeText?: string;
  @Input() badgeColor: 'green' | 'blue' | 'amber' | 'red' = 'green';
  @Input() iconColor: 'blue' | 'green' | 'amber' | 'red' = 'blue';
  @Input() theme: string = '';
}


import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateType = 'properties' | 'leads' | 'deals' | 'visits' | 'agenda' | 'leaderboard' | 'search' | 'general';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() type: EmptyStateType = 'general';
  @Input() title = 'No records found';
  @Input() description = 'There is currently no data to display in this view.';
  @Input() actionText?: string;
  @Input() actionIcon?: string;

  @Output() onAction = new EventEmitter<void>();

  handleAction(): void {
    this.onAction.emit();
  }
}


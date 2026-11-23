import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ConfirmVariant = 'primary' | 'danger' | 'warning' | 'success';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  @Input({ required: true }) isOpen: boolean = false;
  @Input({ required: true }) title: string = 'Confirm Action';
  @Input({ required: true }) message: string = '';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() variant: ConfirmVariant = 'primary';
  @Input() icon: 'warning' | 'danger' | 'success' | 'info' | 'swap' | 'trash' = 'info';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.cancel.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancel.emit();
    }
  }
}


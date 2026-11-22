import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DealService } from '../../core/services/deal.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { DealModalComponent } from '../../shared/components/deal-modal/deal-modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { Deal } from '../../core/models/models';

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, StatusPillComponent, DealModalComponent, EmptyStateComponent],
  templateUrl: './deals.component.html',
  styleUrl: './deals.component.scss'
})
export class DealsComponent {
  dealService = inject(DealService);
  snackbarService = inject(SnackbarService);
  openDealModal = signal(false);

  // Auto-detect mobile width: default to cards on phone screens, table on desktop
  readonly viewMode = signal<'cards' | 'table'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'
  );

  toggleView(mode: 'cards' | 'table') {
    this.viewMode.set(mode);
  }

  markPaidInFull(deal: Deal) {
    this.dealService.updateDeal(deal.id, {
      totalReceived: deal.grossBrokerage,
      balanceReceivable: 0
    });
    this.snackbarService.success(`Deal "${deal.dealTitle}" marked as paid in full!`);
  }

  deleteDeal(deal: Deal) {
    if (confirm(`Delete deal "${deal.dealTitle}" from ledger?`)) {
      this.dealService.deleteDeal(deal.id);
      this.snackbarService.info(`Deal "${deal.dealTitle}" removed.`);
    }
  }
}

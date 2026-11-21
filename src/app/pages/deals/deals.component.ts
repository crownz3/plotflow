import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DealService } from '../../core/services/deal.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { DealModalComponent } from '../../shared/components/deal-modal/deal-modal.component';
import { Deal } from '../../core/models/models';

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe, StatusPillComponent, DealModalComponent],
  templateUrl: './deals.component.html',
  styleUrl: './deals.component.scss'
})
export class DealsComponent {
  dealService = inject(DealService);
  openDealModal = signal(false);

  markPaidInFull(deal: Deal) {
    this.dealService.updateDeal(deal.id, {
      totalReceived: deal.grossBrokerage,
      balanceReceivable: 0
    });
  }

  deleteDeal(deal: Deal) {
    if (confirm(`Delete deal "${deal.dealTitle}" from ledger?`)) {
      this.dealService.deleteDeal(deal.id);
    }
  }
}

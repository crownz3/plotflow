import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DealService } from '../../../core/services/deal.service';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { Property, Lead } from '../../../core/models/models';

@Component({
  selector: 'app-deal-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  templateUrl: './deal-modal.component.html',
  styleUrl: './deal-modal.component.scss'
})
export class DealModalComponent implements OnInit {
  @Input() property?: Property;
  @Input() lead?: Lead;
  @Output() onClose = new EventEmitter<void>();
  @Output() onDealClosed = new EventEmitter<void>();

  private dealService = inject(DealService);
  private auth = inject(AuthService);
  private loadingService = inject(LoadingService);
  private snackbarService = inject(SnackbarService);

  dealTitle = 'Property Deal Closing';
  dealValue = 24500000;
  buyerPct = 1.0;
  sellerPct = 1.0;
  gstPct = 18;
  agentSplitPct = 25;

  financials = signal(
    this.dealService.calculateFinancials(this.dealValue, this.buyerPct, this.sellerPct, this.gstPct, this.agentSplitPct)
  );

  ngOnInit() {
    if (this.property) {
      this.dealTitle = `${this.property.title} Closing`;
      this.dealValue = this.property.price;
    }
    this.recalculate();
  }

  recalculate() {
    this.financials.set(
      this.dealService.calculateFinancials(this.dealValue || 0, this.buyerPct || 0, this.sellerPct || 0, this.gstPct || 0, this.agentSplitPct || 0)
    );
  }

  submitDeal() {
    this.loadingService.show('Finalizing Deal...', 'Updating tenant ledger and commission ledger');
    const fin = this.financials();
    setTimeout(() => {
      this.dealService.closeDeal({
        tenantId: this.property?.tenantId || this.auth.activeTenantId() || 'tenant_default',
        dealTitle: this.dealTitle,
        propertyId: this.property?.id || 'prop_01',
        propertyTitle: this.property?.title || 'Prime Property',
        leadId: this.lead?.id || 'lead_01',
        clientName: this.lead?.name || 'Verified Buyer',
        agentId: 'user_agent_01',
        agentName: 'Arun Kumar',
        dealValue: this.dealValue,
        buyerBrokeragePercent: this.buyerPct,
        sellerBrokeragePercent: this.sellerPct,
        grossBrokerage: fin.grossBrokerage,
        gstPercent: this.gstPct,
        gstAmount: fin.gstAmount,
        agentCommissionPercent: this.agentSplitPct,
        agentCommissionAmount: fin.agentCommissionAmount,
        netAgencyBrokerage: fin.netAgencyBrokerage,
        totalReceived: fin.grossBrokerage,
        balanceReceivable: 0,
        closingDate: Date.now(),
        status: 'closed_won'
      });

      this.loadingService.hide();
      this.snackbarService.success(`Deal "${this.dealTitle}" finalized successfully!`);
      this.onDealClosed.emit();
      this.onClose.emit();
    }, 400);
  }
}


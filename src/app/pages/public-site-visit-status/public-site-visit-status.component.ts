import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SecureShareService } from '../../core/services/secure-share.service';
import { PublicSiteVisitBooking } from '../../core/models/models';
import { Unsubscribe } from 'firebase/firestore';

@Component({
  selector: 'app-public-site-visit-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-site-visit-status.component.html',
  styleUrl: './public-site-visit-status.component.scss'
})
export class PublicSiteVisitStatusComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shareService = inject(SecureShareService);

  bookingId = signal<string>('');
  booking = signal<PublicSiteVisitBooking | null>(null);
  isLoading = signal<boolean>(true);
  loadError = signal<string | null>(null);
  copiedNotice = signal<boolean>(false);

  private visitUnsubscribe: Unsubscribe | null = null;

  readonly cleanAgentPhone = computed(() => {
    const b = this.booking();
    const phone = b?.assignedAgentPhone || b?.agencyPhone || '';
    return phone.replace(/[^0-9]/g, '');
  });

  readonly whatsappUrl = computed(() => {
    const b = this.booking();
    const phone = this.cleanAgentPhone();
    if (!b) return '';
    const text = encodeURIComponent(
      `Hi, I am tracking my site visit (Ref: ${b.id}) for "${b.propertyTitle}". Could you please assist me?`
    );
    return `https://wa.me/${phone}?text=${text}`;
  });

  readonly statusColorClass = computed(() => {
    const s = this.booking()?.status;
    switch (s) {
      case 'confirmed': return 'status-confirmed';
      case 'rescheduled': return 'status-rescheduled';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  });

  readonly statusLabel = computed(() => {
    const s = this.booking()?.status;
    switch (s) {
      case 'confirmed': return 'Confirmed';
      case 'rescheduled': return 'Rescheduled by Agency';
      case 'completed': return 'Visit Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending Agency Confirmation';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('bookingId');
    if (!id) {
      this.isLoading.set(false);
      this.loadError.set('No site visit booking identifier provided.');
      return;
    }

    this.bookingId.set(id);
    this.bindVisit(id);
  }

  ngOnDestroy(): void {
    if (this.visitUnsubscribe) {
      this.visitUnsubscribe();
      this.visitUnsubscribe = null;
    }
  }

  private bindVisit(id: string): void {
    this.visitUnsubscribe = this.shareService.bindSiteVisitListener(id, data => {
      this.isLoading.set(false);
      if (!data) {
        if (!this.booking()) {
          this.loadError.set('Site visit booking was not found or has been removed.');
        }
        return;
      }
      this.loadError.set(null);
      this.booking.set(data);
    });
  }

  async copyTrackingUrl(): Promise<void> {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        this.copiedNotice.set(true);
        setTimeout(() => this.copiedNotice.set(false), 2500);
      } catch {}
    }
  }

  goToPropertyView(): void {
    const b = this.booking();
    if (b?.shareLinkId) {
      this.router.navigate(['/view', b.shareLinkId]);
    }
  }
}


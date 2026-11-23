import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecureShareService } from '../../core/services/secure-share.service';
import { SecureSharedLink, PublicSiteVisitBooking } from '../../core/models/models';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AreaFormatPipe } from '../../shared/pipes/area-format.pipe';
import { PlotMapViewerComponent } from '../../shared/components/plot-map-viewer/plot-map-viewer.component';
import { Unsubscribe } from 'firebase/firestore';

@Component({
  selector: 'app-public-property-view',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe, AreaFormatPipe, PlotMapViewerComponent],
  templateUrl: './public-property-view.component.html',
  styleUrl: './public-property-view.component.scss'
})
export class PublicPropertyViewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shareService = inject(SecureShareService);

  shareId = signal<string>('');
  link = signal<SecureSharedLink | null>(null);
  isLoading = signal<boolean>(true);
  loadError = signal<string | null>(null);
  currentTimestamp = Date.now();

  // Privacy and Anti-Screenshot states
  isWindowBlurred = signal<boolean>(false);
  activeImageIndex = signal<number>(0);

  // Extension request form
  reqName = '';
  reqMobile = '';
  reqNotes = '';
  isSubmittingExtension = signal<boolean>(false);
  extensionSuccessMessage = signal<string | null>(null);

  // Site Visit Booking Modal Form
  showSiteVisitModal = signal<boolean>(false);
  visitName = '';
  visitMobile = '';
  visitDate = '';
  visitSlot = 'Morning (9:00 AM - 12:00 PM)';
  visitNotes = '';
  isSubmittingVisit = signal<boolean>(false);
  createdVisitBooking = signal<PublicSiteVisitBooking | null>(null);
  visitLinkCopied = signal<boolean>(false);

  readonly visitTrackingUrl = computed(() => {
    const b = this.createdVisitBooking();
    return b ? this.shareService.getPublicVisitStatusUrl(b.id) : null;
  });

  private linkUnsubscribe: Unsubscribe | null = null;
  private timerInterval: any = null;

  readonly isExpired = computed(() => {
    const l = this.link();
    if (!l) return false;
    return Date.now() > l.expiresAt || l.status !== 'active';
  });

  readonly remainingTimeFormatted = computed(() => {
    const l = this.link();
    if (!l || this.isExpired()) return 'Expired';
    const diffMs = l.expiresAt - this.currentTimestamp;
    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${mins}m remaining`;
  });

  readonly cleanAgentPhone = computed(() => {
    const p = this.link()?.agentPhone || this.link()?.agencyPhone || '';
    return p.replace(/[^0-9]/g, '');
  });

  readonly whatsappUrl = computed(() => {
    const phone = this.cleanAgentPhone();
    const propTitle = this.link()?.propertyTitle || 'Property';
    const text = encodeURIComponent(`Hi, I am viewing "${propTitle}" on the secure link and would like to speak with you.`);
    return `https://wa.me/${phone}?text=${text}`;
  });

  // Anti-Screenshot and Anti-Theft Handlers
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    if (this.link() && !this.link()?.allowScreenshots) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.link() || this.link()?.allowScreenshots) return;

    // Block PrintScreen
    if (event.key === 'PrintScreen') {
      event.preventDefault();
      this.isWindowBlurred.set(true);
      setTimeout(() => this.isWindowBlurred.set(false), 2000);
      return;
    }

    // Block Ctrl+P / Cmd+P
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      return;
    }

    // Block Ctrl+S / Cmd+S
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      return;
    }

    // Block Mac screenshot shortcuts (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5)
    if (event.metaKey && event.shiftKey && ['3', '4', '5'].includes(event.key)) {
      event.preventDefault();
      this.isWindowBlurred.set(true);
      setTimeout(() => this.isWindowBlurred.set(false), 2500);
      return;
    }
  }

  @HostListener('window:blur')
  onWindowBlur() {
    if (this.link() && !this.link()?.allowScreenshots) {
      this.isWindowBlurred.set(true);
    }
  }

  @HostListener('window:focus')
  onWindowFocus() {
    this.isWindowBlurred.set(false);
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden && this.link() && !this.link()?.allowScreenshots) {
      this.isWindowBlurred.set(true);
    } else {
      this.isWindowBlurred.set(false);
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('shareId');
    if (!id) {
      this.isLoading.set(false);
      this.loadError.set('No share link identifier provided.');
      return;
    }

    this.shareId.set(id);
    this.bindLink(id);

    // Record non-blocking view telemetry
    this.shareService.recordView(id);

    // Update remaining time ticker every minute
    this.timerInterval = setInterval(() => {
      this.currentTimestamp = Date.now();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.linkUnsubscribe) {
      this.linkUnsubscribe();
      this.linkUnsubscribe = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private bindLink(id: string): void {
    this.linkUnsubscribe = this.shareService.bindPublicLinkListener(id, data => {
      this.isLoading.set(false);
      if (!data) {
        if (!this.link()) {
          this.loadError.set('This property link does not exist or has been removed.');
        }
        return;
      }
      this.loadError.set(null);
      this.link.set(data);
    });
  }

  async submitExtensionRequest(): Promise<void> {
    if (!this.reqName.trim() || !this.reqMobile.trim()) {
      alert('Please provide your Name and a valid Mobile Number so the agency can approve your access.');
      return;
    }

    this.isSubmittingExtension.set(true);
    try {
      await this.shareService.requestExtension(
        this.shareId(),
        this.reqName,
        this.reqMobile,
        this.reqNotes
      );
      this.extensionSuccessMessage.set(
        `Thank you ${this.reqName.trim()}! Your extension request has been sent to ${this.link()?.agencyName}. You will receive immediate access once approved.`
      );
    } catch (err) {
      console.error('Error submitting extension request:', err);
      alert('Could not submit request. Please call or WhatsApp the agency directly.');
    } finally {
      this.isSubmittingExtension.set(false);
    }
  }

  // --- Site Visit Booking Methods ---
  openSiteVisitModal(): void {
    if (!this.visitDate) {
      const tomorrow = new Date(Date.now() + 86400000);
      this.visitDate = tomorrow.toISOString().split('T')[0];
    }
    this.createdVisitBooking.set(null);
    this.showSiteVisitModal.set(true);
  }

  closeSiteVisitModal(): void {
    this.showSiteVisitModal.set(false);
  }

  async submitSiteVisitBooking(): Promise<void> {
    if (!this.visitName.trim() || !this.visitMobile.trim()) {
      alert('Please enter your Name and Mobile Number to schedule a site inspection.');
      return;
    }

    if (!this.visitDate) {
      alert('Please select your preferred visit date.');
      return;
    }

    this.isSubmittingVisit.set(true);
    try {
      const booking = await this.shareService.bookSiteVisit(this.shareId(), {
        clientName: this.visitName,
        clientPhone: this.visitMobile,
        preferredDate: this.visitDate,
        preferredSlot: this.visitSlot,
        notes: this.visitNotes
      });
      this.createdVisitBooking.set(booking);
    } catch (err) {
      console.error('Error booking site visit:', err);
      alert('Failed to schedule site visit. Please call the agency directly.');
    } finally {
      this.isSubmittingVisit.set(false);
    }
  }

  async copyVisitUrl(): Promise<void> {
    const url = this.visitTrackingUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.visitLinkCopied.set(true);
      setTimeout(() => this.visitLinkCopied.set(false), 2500);
    } catch {}
  }

  goToVisitStatus(): void {
    const booking = this.createdVisitBooking();
    if (booking) {
      this.closeSiteVisitModal();
      this.router.navigate(['/visit-status', booking.id]);
    }
  }

  nextImage(): void {
    const images = this.link()?.propertySnapshot.images;
    if (!images || images.length <= 1) return;
    this.activeImageIndex.update(idx => (idx + 1) % images.length);
  }

  prevImage(): void {
    const images = this.link()?.propertySnapshot.images;
    if (!images || images.length <= 1) return;
    this.activeImageIndex.update(idx => (idx - 1 + images.length) % images.length);
  }
}


import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SiteVisitService } from '../../core/services/site-visit.service';
import { PropertyService } from '../../core/services/property.service';
import { LeadService } from '../../core/services/lead.service';
import { AuthService } from '../../core/services/auth.service';
import { SecureShareService } from '../../core/services/secure-share.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SiteVisit, PublicSiteVisitBooking } from '../../core/models/models';

@Component({
  selector: 'app-site-visits',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPillComponent, EmptyStateComponent],
  templateUrl: './site-visits.component.html',
  styleUrl: './site-visits.component.scss'
})
export class SiteVisitsComponent {
  siteVisitService = inject(SiteVisitService);
  propertyService = inject(PropertyService);
  leadService = inject(LeadService);
  auth = inject(AuthService);
  secureShareService = inject(SecureShareService);
  snackbar = inject(SnackbarService);

  readonly activeSubTab = signal<'scheduled' | 'inbound'>('scheduled');

  openAddModal = signal(false);
  editingVisit = signal<SiteVisit | null>(null);
  editVisitStatus: any = 'scheduled';
  editVisitDateTime = '';

  // Reschedule Modal for Inbound Bookings
  rescheduleModalOpen = signal(false);
  activeBookingForReschedule = signal<PublicSiteVisitBooking | null>(null);
  rescheduleNewDate = '';
  rescheduleNewSlot = 'Morning (9:00 AM - 12:00 PM)';
  rescheduleReason = '';

  // Smart Mobile View Mode Toggle
  readonly viewMode = signal<'cards' | 'table'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'
  );

  selectedLeadId = '';
  selectedPropertyId = '';
  scheduledDateTime = '';

  toggleView(mode: 'cards' | 'table') {
    this.viewMode.set(mode);
  }

  cleanPhone(phone?: string): string {
    return (phone || '').replace(/[^0-9]/g, '');
  }

  openClientTrackingPage(bookingId: string): void {
    const url = `/visit-status/${bookingId}`;
    window.open(url, '_blank');
  }

  async confirmInboundVisit(booking: PublicSiteVisitBooking): Promise<void> {
    try {
      const scheduledTime = new Date(`${booking.preferredDate}T10:00:00`).getTime() || Date.now();
      const currentUser = this.auth.currentUser();
      const agentName = currentUser?.displayName || 'Advisor';
      const agentPhone = currentUser?.phoneNumber || '';

      // 1. Check if lead already exists by phone or create a new CRM lead
      const cleanTargetPhone = booking.clientPhone.replace(/[^0-9]/g, '');
      let lead = this.leadService.tenantLeads().find(l =>
        l.phone.replace(/[^0-9]/g, '') === cleanTargetPhone
      );

      if (!lead) {
        lead = await this.leadService.addLead({
          tenantId: this.auth.activeTenantId(),
          name: booking.clientName,
          phone: booking.clientPhone,
          stage: 'contacted',
          source: 'direct_call',
          priority: 'hot',
          requirement: {
            propertyTypes: ['plot'],
            listingType: 'sale',
            budgetMin: 1500000,
            budgetMax: 5000000,
            preferredLocations: []
          },
          assignedAgentId: currentUser?.uid || 'user_agent_01',
          assignedAgentName: agentName
        });
      }

      // 2. Add to SiteVisitService (tenants/{tenantId}/site_visits)
      await this.siteVisitService.scheduleVisit({
        tenantId: this.auth.activeTenantId(),
        leadId: lead?.id || `lead_${Date.now()}`,
        leadName: booking.clientName,
        leadPhone: booking.clientPhone,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
        propertyLocation: 'Property Site',
        agentId: currentUser?.uid || 'user_agent_01',
        agentName,
        scheduledTime,
        status: 'scheduled'
      });

      // 3. Mark public booking confirmed in Firestore so client's live status page updates
      await this.secureShareService.confirmSiteVisitBooking(
        booking.id,
        scheduledTime,
        agentName,
        agentPhone
      );

      this.snackbar.success(`Site visit confirmed for ${booking.clientName}! Added to CRM leads & schedule.`);
    } catch (err) {
      console.error('Error confirming site visit:', err);
      this.snackbar.error('Could not confirm site visit.');
    }
  }

  openRescheduleModal(booking: PublicSiteVisitBooking): void {
    this.activeBookingForReschedule.set(booking);
    this.rescheduleNewDate = booking.preferredDate;
    this.rescheduleNewSlot = booking.preferredSlot;
    this.rescheduleReason = '';
    this.rescheduleModalOpen.set(true);
  }

  async submitReschedule(): Promise<void> {
    const booking = this.activeBookingForReschedule();
    if (!booking) return;

    if (!this.rescheduleNewDate) {
      this.snackbar.error('Please select a new date for rescheduling.');
      return;
    }

    try {
      const scheduledTime = new Date(`${this.rescheduleNewDate}T10:00:00`).getTime() || Date.now();
      await this.secureShareService.rescheduleSiteVisitBooking(
        booking.id,
        this.rescheduleNewDate,
        this.rescheduleNewSlot,
        scheduledTime,
        this.rescheduleReason
      );
      this.rescheduleModalOpen.set(false);
      this.snackbar.success(`Site visit rescheduled for ${booking.clientName}! Client tracking link updated.`);
    } catch (err) {
      console.error('Error rescheduling site visit:', err);
      this.snackbar.error('Could not reschedule site visit.');
    }
  }

  markCompleted(id: string) {
    this.siteVisitService.updateStatus(id, 'completed', 'Client inspected property, follow-up scheduled.');
  }

  startEditVisit(visit: SiteVisit) {
    this.editingVisit.set(visit);
    this.editVisitStatus = visit.status;
    this.editVisitDateTime = new Date(visit.scheduledTime).toISOString().slice(0, 16);
  }

  saveEditVisit() {
    const cur = this.editingVisit();
    if (!cur) return;
    this.siteVisitService.updateVisit(cur.id, {
      status: this.editVisitStatus,
      scheduledTime: this.editVisitDateTime ? new Date(this.editVisitDateTime).getTime() : cur.scheduledTime
    });
    this.editingVisit.set(null);
  }

  deleteVisit(visit: SiteVisit) {
    if (confirm(`Cancel and delete appointment with ${visit.leadName}?`)) {
      this.siteVisitService.deleteVisit(visit.id);
    }
  }

  saveVisit() {
    const leads = this.leadService.tenantLeads();
    const props = this.propertyService.tenantProperties();
    const lead = leads.find(l => l.id === this.selectedLeadId) || leads[0];
    const prop = props.find(p => p.id === this.selectedPropertyId) || props[0];

    const leadName = lead ? lead.name : 'Walk-in Prospect';
    const leadPhone = lead ? lead.phone : '+91 90000 00000';
    const leadId = lead ? lead.id : `lead_${Date.now()}`;

    const propTitle = prop ? prop.title : 'Direct Site Inspection';
    const propLoc = prop ? `${prop.location.locality}, ${prop.location.city}` : 'Property Site';
    const propId = prop ? prop.id : `prop_${Date.now()}`;

    this.siteVisitService.scheduleVisit({
      tenantId: this.auth.activeTenantId(),
      leadId,
      leadName,
      leadPhone,
      propertyId: propId,
      propertyTitle: propTitle,
      propertyLocation: propLoc,
      agentId: this.auth.currentUser()?.uid || 'user_agent_01',
      agentName: this.auth.currentUser()?.displayName || 'Advisor',
      scheduledTime: this.scheduledDateTime ? new Date(this.scheduledDateTime).getTime() : Date.now() + 86400000,
      status: 'scheduled'
    });

    this.openAddModal.set(false);
  }
}

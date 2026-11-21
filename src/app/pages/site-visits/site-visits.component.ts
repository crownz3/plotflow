import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SiteVisitService } from '../../core/services/site-visit.service';
import { PropertyService } from '../../core/services/property.service';
import { LeadService } from '../../core/services/lead.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { SiteVisit } from '../../core/models/models';

@Component({
  selector: 'app-site-visits',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPillComponent],
  templateUrl: './site-visits.component.html',
  styleUrl: './site-visits.component.scss'
})
export class SiteVisitsComponent {
  siteVisitService = inject(SiteVisitService);
  propertyService = inject(PropertyService);
  leadService = inject(LeadService);
  auth = inject(AuthService);

  openAddModal = signal(false);
  editingVisit = signal<SiteVisit | null>(null);
  editVisitStatus: any = 'scheduled';
  editVisitDateTime = '';

  selectedLeadId = 'lead_01';
  selectedPropertyId = 'prop_01';
  scheduledDateTime = '';

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

    const leadName = lead ? lead.name : 'Karthik Narayanan';
    const leadPhone = lead ? lead.phone : '+91 97911 33445';
    const leadId = lead ? lead.id : `lead_${Date.now()}`;

    const propTitle = prop ? prop.title : 'Modern Gated Community Villa';
    const propLoc = prop ? `${prop.location.locality}, ${prop.location.city}` : 'Sholinganallur, OMR';
    const propId = prop ? prop.id : `prop_${Date.now()}`;

    this.siteVisitService.scheduleVisit({
      tenantId: this.auth.activeTenantId() || 'tenant_prime_properties',
      leadId,
      leadName,
      leadPhone,
      propertyId: propId,
      propertyTitle: propTitle,
      propertyLocation: propLoc,
      agentId: this.auth.currentUser()?.uid || 'user_agent_01',
      agentName: this.auth.currentUser()?.displayName || 'Arun Kumar',
      scheduledTime: this.scheduledDateTime ? new Date(this.scheduledDateTime).getTime() : Date.now() + 86400000,
      status: 'scheduled'
    });

    this.openAddModal.set(false);
  }
}

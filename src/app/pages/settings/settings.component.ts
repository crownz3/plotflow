import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  tenantService = inject(TenantService);

  openInviteModal = signal(false);
  savedNotice = signal(false);

  inviteName = '';
  inviteEmail = '';
  inviteRole: 'agency_admin' | 'agent' = 'agent';
  inviteErrorMessage = '';

  agencyName = this.tenantService.activeTenant().agencyName;
  reraNumber = this.tenantService.activeTenant().reraNumber || '';
  phone = this.tenantService.activeTenant().phone;
  currency = this.tenantService.activeTenant().currency;
  defaultAreaUnit = this.tenantService.activeTenant().defaultAreaUnit;
  address = this.tenantService.activeTenant().address;

  sendInvite() {
    if (!this.inviteName || !this.inviteEmail) return;
    if (!this.tenantService.isGoogleMail(this.inviteEmail)) {
      this.inviteErrorMessage = 'Only Google Mail (@gmail.com) addresses are permitted for tenant team members.';
      return;
    }
    this.tenantService.inviteAgent(this.inviteName, this.inviteEmail, this.inviteRole);
    this.inviteName = '';
    this.inviteEmail = '';
    this.inviteErrorMessage = '';
    this.openInviteModal.set(false);
  }

  removeMember(uid: string) {
    this.tenantService.removeAgent(uid);
  }

  saveSettings() {
    this.tenantService.updateActiveTenant({
      agencyName: this.agencyName,
      reraNumber: this.reraNumber,
      phone: this.phone,
      currency: this.currency as any,
      defaultAreaUnit: this.defaultAreaUnit as any,
      address: this.address
    });
    this.savedNotice.set(true);
    setTimeout(() => this.savedNotice.set(false), 3000);
  }
}


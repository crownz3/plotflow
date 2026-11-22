import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  tenantService = inject(TenantService);
  snackbarService = inject(SnackbarService);

  openInviteModal = signal(false);

  inviteName = '';
  inviteEmail = '';
  inviteRole: 'agency_admin' | 'agent' = 'agent';
  inviteErrorMessage = '';

  agencyName = this.tenantService.activeTenant().agencyName;
  reraNumber = this.tenantService.activeTenant().reraNumber || '';
  phone = this.tenantService.activeTenant().phone;
  currency = this.tenantService.activeTenant().currency;
  defaultAreaUnit = this.tenantService.activeTenant().defaultAreaUnit;
  defaultLanguage = this.tenantService.activeTenant().defaultLanguage || 'English';
  address = this.tenantService.activeTenant().address;

  sendInvite() {
    if (!this.inviteName || !this.inviteEmail) return;
    if (!this.tenantService.isGoogleMail(this.inviteEmail)) {
      this.inviteErrorMessage = 'Only Google Mail (@gmail.com) addresses are permitted for tenant team members.';
      return;
    }
    this.tenantService.inviteAgent(this.inviteName, this.inviteEmail, this.inviteRole);
    this.snackbarService.success(`Invitation sent to ${this.inviteEmail}!`);
    this.inviteName = '';
    this.inviteEmail = '';
    this.inviteErrorMessage = '';
    this.openInviteModal.set(false);
  }

  removeMember(uid: string) {
    this.tenantService.removeAgent(uid);
    this.snackbarService.info('Team member removed.');
  }

  saveSettings() {
    this.tenantService.updateActiveTenant({
      agencyName: this.agencyName,
      reraNumber: this.reraNumber,
      phone: this.phone,
      currency: this.currency as any,
      defaultAreaUnit: this.defaultAreaUnit as any,
      defaultLanguage: this.defaultLanguage as any,
      address: this.address
    });
    this.snackbarService.success('Agency settings saved successfully!');
  }
}


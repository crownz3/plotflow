import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PropertyService } from '../../../core/services/property.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';
import { Tenant } from '../../../core/models/models';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent, StatusPillComponent],
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.scss'
})
export class SuperAdminDashboardComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  propertyService = inject(PropertyService);
  platformConfig = inject(PlatformConfigService);
  router = inject(Router);

  totalAgentsCount = computed(() => {
    return this.tenantService.teamMembers().length || this.tenantService.tenants().reduce((acc, t) => acc + (t.totalAgentsCount || 1), 0);
  });

  platformNameInput = this.platformConfig.platformName();
  taglineInput = this.platformConfig.tagline();
  emailInput = this.platformConfig.supportEmail();
  saveSuccess = false;

  openProvisionModal = signal(false);
  approvalAlert = signal<string | null>(null);

  approveAgency(tenantId: string): void {
    const tenant = this.tenantService.getTenantById(tenantId);
    this.tenantService.approveTenant(tenantId);
    this.approvalAlert.set(`✓ Agency "${tenant?.agencyName || tenantId}" has been approved and activated! The tenant can now access the full platform.`);
    setTimeout(() => this.approvalAlert.set(null), 5000);
  }

  rejectAgency(tenantId: string): void {
    const reason = prompt('Please enter the reason for declining this agency registration:', 'RERA registration number could not be verified with the official regulatory portal.');
    if (reason !== null) {
      const tenant = this.tenantService.getTenantById(tenantId);
      this.tenantService.rejectTenant(tenantId, reason.trim() || undefined);
      this.approvalAlert.set(`Agency "${tenant?.agencyName || tenantId}" application has been declined.`);
      setTimeout(() => this.approvalAlert.set(null), 5000);
    }
  }

  newTenantForm = {
    agencyName: '',
    email: '',
    phone: '+91 98888 11111',
    reraNumber: 'TN/01/TEST/2026/789',
    address: 'Express Business Hub, Chennai',
    subscriptionPlan: 'pro' as 'trial' | 'starter' | 'pro' | 'enterprise'
  };

  updateGlobalBranding(): void {
    if (this.platformNameInput.trim()) {
      this.platformConfig.updatePlatformBranding(
        this.platformNameInput,
        this.taglineInput,
        this.emailInput
      );
      this.saveSuccess = true;
      setTimeout(() => this.saveSuccess = false, 3500);
    }
  }

  supportContext(tenantId: string) {
    this.auth.supportSwitchTenant(tenantId);
    this.tenantService.refreshActiveTenant();
  }


  provisionTestTenant(): void {
    if (!this.newTenantForm.agencyName.trim() || !this.newTenantForm.email.trim()) return;

    const email = this.newTenantForm.email.trim().toLowerCase();
    const cleanPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const tenantId = `tenant_${cleanPrefix}`;

    const newTenant = this.tenantService.registerNewTenant({
      id: tenantId,
      agencyName: this.newTenantForm.agencyName.trim(),
      email: email,
      phone: this.newTenantForm.phone.trim(),
      reraNumber: this.newTenantForm.reraNumber.trim(),
      address: this.newTenantForm.address.trim(),
      subscriptionPlan: this.newTenantForm.subscriptionPlan
    });

    this.openProvisionModal.set(false);

    // Immediately switch context into the newly created tenant for end-to-end testing!
    this.supportContext(newTenant.id);
  }
}

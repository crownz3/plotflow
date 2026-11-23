import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PropertyService } from '../../../core/services/property.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LoadingService } from '../../../core/services/loading.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';
import { ConfirmDialogComponent, ConfirmVariant } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Tenant } from '../../../core/models/models';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent, StatusPillComponent, ConfirmDialogComponent],
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.scss'
})
export class SuperAdminDashboardComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  propertyService = inject(PropertyService);
  platformConfig = inject(PlatformConfigService);
  snackbar = inject(SnackbarService);
  loading = inject(LoadingService);
  router = inject(Router);

  totalAgentsCount = computed(() => {
    return this.tenantService.teamMembers().length || this.agencyTenants().reduce((acc, t) => acc + (t.totalAgentsCount || 1), 0);
  });

  agencyTenants = computed(() => {
    return this.tenantService.tenants().filter(t => t.id !== 'platform_global');
  });

  activeTenantsCount = computed(() => {
    return this.agencyTenants().filter(t => t.status === 'active').length;
  });

  pendingTenantsCount = computed(() => {
    return this.tenantService.pendingTenants().length;
  });

  platformNameInput = this.platformConfig.platformName();
  taglineInput = this.platformConfig.tagline();
  emailInput = this.platformConfig.supportEmail();
  saveSuccess = false;

  openProvisionModal = signal(false);
  approvalAlert = signal<string | null>(null);

  // Reusable Confirmation Dialog State
  confirmDialog = signal<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: ConfirmVariant;
    icon: 'warning' | 'danger' | 'success' | 'info' | 'swap' | 'trash';
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    icon: 'info',
    action: () => {}
  });

  // Change Subscription Plan Modal State
  planModal = signal<{
    isOpen: boolean;
    tenant: Tenant | null;
    selectedPlan: 'trial' | 'starter' | 'pro' | 'enterprise';
  }>({
    isOpen: false,
    tenant: null,
    selectedPlan: 'trial'
  });

  availablePlans: { id: 'trial' | 'starter' | 'pro' | 'enterprise'; name: string; tag: string; desc: string; price: string }[] = [
    {
      id: 'trial',
      name: 'Trial Plan',
      tag: '14 Days Free',
      desc: 'Free trial evaluation with full platform capabilities.',
      price: 'Free'
    },
    {
      id: 'starter',
      name: 'Starter Agency',
      tag: 'Small Brokerage',
      desc: 'Up to 5 agents, standard CRM leads, and inventory tracking.',
      price: '₹4,999/mo'
    },
    {
      id: 'pro',
      name: 'Pro Agency',
      tag: 'Most Popular',
      desc: 'Unlimited listings, 2D/3D plot layouts, AI matching, and PDF brochures.',
      price: '₹9,999/mo'
    },
    {
      id: 'enterprise',
      name: 'Enterprise Brokerage',
      tag: 'Multi-Branch',
      desc: 'Custom white-label branding, multi-branch, dedicated SLA support.',
      price: '₹24,999/mo'
    }
  ];

  openConfirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: 'warning' | 'danger' | 'success' | 'info' | 'swap' | 'trash';
    action: () => void;
  }): void {
    this.confirmDialog.set({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'primary',
      icon: options.icon || 'info',
      action: options.action
    });
  }

  handleConfirm(): void {
    const act = this.confirmDialog().action;
    this.confirmDialog.update(s => ({ ...s, isOpen: false }));
    if (act) act();
  }

  handleCancel(): void {
    this.confirmDialog.update(s => ({ ...s, isOpen: false }));
  }

  // --- PLAN CHANGE WORKFLOW ---
  openChangePlanModal(tenant: Tenant): void {
    this.planModal.set({
      isOpen: true,
      tenant,
      selectedPlan: tenant.subscriptionPlan || 'trial'
    });
  }

  closeChangePlanModal(): void {
    this.planModal.update(s => ({ ...s, isOpen: false }));
  }

  selectPlanTier(plan: 'trial' | 'starter' | 'pro' | 'enterprise'): void {
    this.planModal.update(s => ({ ...s, selectedPlan: plan }));
  }

  submitPlanChange(): void {
    const { tenant, selectedPlan } = this.planModal();
    if (!tenant) return;

    if (tenant.subscriptionPlan === selectedPlan) {
      this.closeChangePlanModal();
      return;
    }

    const currentName = tenant.subscriptionPlan.toUpperCase();
    const newName = selectedPlan.toUpperCase();
    const agencyName = tenant.agencyName;
    const targetTenantId = tenant.id;

    // Close plan modal and open Confirmation Dialog
    this.closeChangePlanModal();

    this.openConfirm({
      title: 'Confirm Subscription Plan Change',
      message: `Are you sure you want to change the subscription tier for <strong>${agencyName}</strong> from <strong>${currentName}</strong> to <strong>${newName}</strong>?`,
      confirmText: `Switch to ${newName}`,
      variant: 'primary',
      icon: 'swap',
      action: () => {
        this.tenantService.updateTenantPlan(targetTenantId, selectedPlan);
        this.snackbar.success(`Subscription plan for "${agencyName}" updated to ${newName}.`);
      }
    });
  }

  // --- CONFIRMED ACTION WRAPPERS ---

  promptInspectAgency(tenant: Tenant): void {
    this.openConfirm({
      title: 'Inspect Tenant Workspace',
      message: `Are you sure you want to inspect <strong>${tenant.agencyName}</strong>? You will be switched into this agency's tenant view to inspect listings and broker data.`,
      confirmText: 'Proceed to Inspect',
      variant: 'primary',
      icon: 'info',
      action: () => this.supportContext(tenant.id)
    });
  }

  promptExtendAgency(tenant: Tenant, days: number = 30): void {
    this.openConfirm({
      title: 'Extend Subscription (+30 Days)',
      message: `Are you sure you want to grant a <strong>+${days} days extension</strong> to <strong>${tenant.agencyName}</strong>?`,
      confirmText: `Extend +${days} Days`,
      variant: 'success',
      icon: 'success',
      action: () => this.extendAgency(tenant.id, days)
    });
  }

  promptCancelAgency(tenant: Tenant): void {
    this.openConfirm({
      title: 'Cancel Agency Subscription',
      message: `Are you sure you want to cancel the subscription for <strong>${tenant.agencyName}</strong>? This will immediately suspend active broker access.`,
      confirmText: 'Cancel Subscription',
      variant: 'warning',
      icon: 'warning',
      action: () => {
        this.tenantService.cancelSubscription(tenant.id);
        this.snackbar.warning(`Subscription cancelled for "${tenant.agencyName}".`);
      }
    });
  }

  promptReactivateAgency(tenant: Tenant, days: number = 30): void {
    this.openConfirm({
      title: 'Reactivate Agency Subscription',
      message: `Are you sure you want to reactivate <strong>${tenant.agencyName}</strong> with <strong>${days} days</strong> of active platform validity?`,
      confirmText: `Reactivate (+${days}d)`,
      variant: 'success',
      icon: 'success',
      action: () => {
        this.tenantService.extendSubscription(tenant.id, days);
        this.snackbar.success(`Agency "${tenant.agencyName}" has been reactivated with ${days} days.`);
      }
    });
  }

  promptDeleteAgency(tenant: Tenant): void {
    this.openConfirm({
      title: 'Permanently Delete Agency',
      message: `Are you sure you want to permanently DELETE <strong>${tenant.agencyName}</strong> (${tenant.email})?<br><br><span style="color: #dc2626; font-weight: 600;">Warning: All listings, broker accounts, and isolated subcollections will be permanently removed. This action CANNOT be undone.</span>`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      icon: 'trash',
      action: () => {
        this.tenantService.deleteTenant(tenant.id);
        this.snackbar.error(`Agency "${tenant.agencyName}" has been permanently deleted.`);
      }
    });
  }

  promptApproveAgency(tenantId: string): void {
    const tenant = this.tenantService.getTenantById(tenantId);
    const agencyName = tenant?.agencyName || tenantId;

    this.openConfirm({
      title: 'Approve Agency Onboarding',
      message: `Are you sure you want to approve and activate <strong>${agencyName}</strong>? Their broker account will be granted immediate access.`,
      confirmText: 'Approve & Activate',
      variant: 'success',
      icon: 'success',
      action: () => this.approveAgency(tenantId)
    });
  }

  promptRejectAgency(tenantId: string): void {
    const tenant = this.tenantService.getTenantById(tenantId);
    const agencyName = tenant?.agencyName || tenantId;

    this.openConfirm({
      title: 'Decline Agency Application',
      message: `Are you sure you want to decline the registration for <strong>${agencyName}</strong>?`,
      confirmText: 'Decline Agency',
      variant: 'danger',
      icon: 'danger',
      action: () => this.rejectAgency(tenantId)
    });
  }

  approveAgency(tenantId: string): void {
    const tenant = this.tenantService.getTenantById(tenantId);
    this.tenantService.approveTenant(tenantId);
    this.approvalAlert.set(`Agency "${tenant?.agencyName || tenantId}" has been approved and activated! The tenant can now access the full platform.`);
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

  extendAgency(tenantId: string, days: number = 30): void {
    const tenant = this.tenantService.getTenantById(tenantId);
    this.tenantService.extendSubscription(tenantId, days);
    this.snackbar.success(`Subscription extended by ${days} days for "${tenant?.agencyName || tenantId}".`);
  }

  cancelAgency(tenantId: string): void {
    const tenant = this.tenantService.getTenantById(tenantId);
    this.tenantService.cancelSubscription(tenantId);
    this.snackbar.warning(`Subscription cancelled for "${tenant?.agencyName || tenantId}".`);
  }

  deleteAgency(tenantId: string): void {
    const tenant = this.tenantService.getTenantById(tenantId);
    this.tenantService.deleteTenant(tenantId);
    this.snackbar.error(`Agency "${tenant?.agencyName || tenantId}" has been deleted.`);
  }

  getTenantExpiryBadge(tenant: Tenant): { label: string; color: 'green' | 'amber' | 'red' } {
    const info = this.tenantService.getSubscriptionExpiryInfo(tenant);
    if (info.isExpired) {
      return { label: 'Expired', color: 'red' };
    }
    if (info.isExpiringSoon) {
      return { label: `${info.daysLeft}d left`, color: 'amber' };
    }
    return { label: `${info.daysLeft}d left`, color: 'green' };
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

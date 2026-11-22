import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { fireConfetti } from '../../../core/utils/confetti.util';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-approval.component.html',
  styleUrl: './pending-approval.component.scss'
})
export class PendingApprovalComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  platformConfig = inject(PlatformConfigService);
  router = inject(Router);

  checkFeedback = signal<string | null>(null);
  isChecking = signal(false);

  readonly tenant = computed(() => {
    const tId = this.auth.currentUser()?.tenantId;
    return tId ? this.tenantService.getTenantById(tId) : undefined;
  });

  readonly status = computed(() => this.tenant()?.status || 'pending_approval');
  readonly rejectionReason = computed(() => this.tenant()?.rejectionReason);

  checkApprovalStatus(): void {
    this.isChecking.set(true);
    this.checkFeedback.set(null);

    setTimeout(() => {
      this.tenantService.refreshActiveTenant();
      const current = this.tenant();

      if (current?.status === 'active') {
        fireConfetti();
        this.checkFeedback.set('Congratulations! Your agency has been approved and activated by Super Admin. Redirecting to your workspace...');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      } else if (current?.status === 'rejected') {
        this.checkFeedback.set('Your application has been declined. Please review the notes below or contact support.');
      } else {
        this.checkFeedback.set('Application is under active review by Platform Super Admin (mohamedibrahim040125@gmail.com). Please check back shortly.');
      }
      this.isChecking.set(false);
    }, 600);
  }

  editApplication(): void {
    this.auth.updateCurrentUser({ onboardingCompleted: false });
    this.router.navigate(['/onboarding']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}


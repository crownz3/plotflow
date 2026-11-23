import { Component, inject, computed, signal, OnInit, effect } from '@angular/core';
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
export class PendingApprovalComponent implements OnInit {
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

  constructor() {
    // Automatically detect real-time Firestore approval from Super Admin & route to dashboard
    effect(() => {
      const s = this.status();
      if (s === 'active') {
        fireConfetti();
        this.checkFeedback.set('Agency Approved! Redirecting to your dashboard...');
        setTimeout(() => {
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        }, 1200);
      }
    });
  }

  ngOnInit(): void {
    if (this.status() === 'active') {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  async checkApprovalStatus(): Promise<void> {
    this.isChecking.set(true);
    this.checkFeedback.set(null);

    const tId = this.auth.currentUser()?.tenantId;
    let current: any = null;

    if (tId) {
      current = await this.tenantService.fetchTenantStatus(tId);
    }
    if (!current) {
      this.tenantService.refreshActiveTenant();
      current = this.tenant();
    }

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


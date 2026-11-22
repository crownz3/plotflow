import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { fireConfetti } from '../../../core/utils/confetti.util';
import { UserProfile } from '../../../core/models/models';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss'
})
export class OnboardingComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  platformConfig = inject(PlatformConfigService);
  router = inject(Router);

  currentStep = signal(1);
  readonly totalSteps = 4;
  readonly progressPercent = computed(() => (this.currentStep() / this.totalSteps) * 100);

  email = this.auth.currentUser()?.email || '';
  agencyName = '';
  reraNumber = '';
  brokerName = this.auth.currentUser()?.displayName || '';
  phone = this.auth.currentUser()?.phoneNumber || '';
  city = '';
  address = '';
  teamSize = '1-5';
  currency: 'INR' | 'USD' | 'AED' | 'EUR' = 'INR';
  defaultAreaUnit: 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha' = 'sqft';

  errorMessage = '';
  isSubmitting = false;

  readonly agencyInitials = computed(() => {
    const name = this.agencyName.trim();
    return name.slice(0, 2).toUpperCase() || 'AG';
  });

  readonly previewTenantPath = computed(() => {
    const name = this.agencyName.trim();
    if (!name) return '/tenants/tenant_id/...';
    const clean = name.toLowerCase().slice(0, 10).replace(/[^a-z0-9]/g, '_');
    return `/tenants/tenant_${clean}/...`;
  });

  nextStep(): void {
    this.errorMessage = '';

    if (this.currentStep() === 1) {
      if (!this.email.trim()) {
        this.errorMessage = 'Please provide an official broker work email address.';
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email.trim())) {
        this.errorMessage = 'Please enter a valid email format.';
        return;
      }
      if (!this.agencyName.trim()) {
        this.errorMessage = 'Please enter your Brokerage / Agency Organization Name.';
        return;
      }
      if (!this.reraNumber.trim()) {
        this.errorMessage = 'Please enter your RERA registration or license number (or "Applied / In Process").';
        return;
      }
      this.currentStep.set(2);
      return;
    }

    if (this.currentStep() === 2) {
      if (!this.brokerName.trim()) {
        this.errorMessage = 'Please enter Principal Broker / Licensee Full Name.';
        return;
      }
      if (!this.phone.trim()) {
        this.errorMessage = 'Please enter a direct phone number for client inquiries.';
        return;
      }
      if (!this.city.trim()) {
        this.errorMessage = 'Please specify your primary operating city / market territory.';
        return;
      }
      this.currentStep.set(3);
      return;
    }

    if (this.currentStep() === 3) {
      this.currentStep.set(4);
      return;
    }
  }

  prevStep(): void {
    this.errorMessage = '';
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number): void {
    if (step < this.currentStep()) {
      this.currentStep.set(step);
    }
  }

  submitOnboarding(): void {
    this.errorMessage = '';
    this.isSubmitting = true;

    try {
      // Ensure user profile exists
      let user = this.auth.currentUser();
      const email = this.email.trim().toLowerCase();
      const cleanPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const tenantId = `tenant_${cleanPrefix}`;

      if (!user) {
        user = {
          uid: `user_${Date.now()}`,
          email,
          displayName: this.brokerName.trim(),
          phoneNumber: this.phone.trim(),
          role: 'agency_admin',
          tenantId,
          agencyName: this.agencyName.trim(),
          isActive: true,
          onboardingCompleted: true,
          createdAt: Date.now()
        };
        this.auth.login(user);
      }

      this.tenantService.submitOnboarding({
        agencyName: this.agencyName.trim(),
        brokerName: this.brokerName.trim(),
        phone: this.phone.trim(),
        reraNumber: this.reraNumber.trim(),
        city: this.city.trim(),
        address: this.address.trim() || `${this.city.trim()} Commercial Center`,
        teamSize: this.teamSize,
        currency: this.currency,
        defaultAreaUnit: this.defaultAreaUnit
      });

      fireConfetti();

      setTimeout(() => {
        this.router.navigate(['/pending-approval']);
      }, 800);
    } catch (err: any) {
      this.errorMessage = err.message || 'Unable to submit onboarding application. Please try again.';
      this.isSubmitting = false;
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}


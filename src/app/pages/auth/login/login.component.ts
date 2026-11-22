import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { LoadingService } from '../../../core/services/loading.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { UserProfile } from '../../../core/models/models';
import { fireConfetti } from '../../../core/utils/confetti.util';
import { signInWithPopup } from 'firebase/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  platformConfig = inject(PlatformConfigService);
  snackbarService = inject(SnackbarService);
  loadingService = inject(LoadingService);
  firebaseService = inject(FirebaseService);
  router = inject(Router);

  isSuperAdminEmail(email: string): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return (
      clean === 'mohamedibrahim010425@gmail.com' ||
      clean === 'mohamedibrahim040125@gmail.com' ||
      clean.startsWith('mohamedibrahim') ||
      clean === 'admin@plotflow.io' ||
      clean === 'superadmin@plotflow.io' ||
      clean.includes('superadmin')
    );
  }
  route = inject(ActivatedRoute);

  // Active Tab: 'signin' | 'register'
  activeTab = signal<'signin' | 'register'>('signin');

  // Registration Multi-Step Stepper: Step 1 | 2 | 3
  regStep = signal<1 | 2 | 3>(1);
  regDirection = signal<'forward' | 'backward'>('forward');

  // Sign In State
  email = '';
  password = '';
  errorMessage = '';
  isLoggingIn = false;

  // Register State
  regAgencyName = '';
  regBrokerName = '';
  regEmail = '';
  regPhone = '';
  regReraNumber = '';
  regCity = '';
  regPassword = '';
  regErrorMessage = '';
  isRegistering = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'register' || params['mode'] === 'register') {
        this.activeTab.set('register');
      }
    });
  }

  setTab(tab: 'signin' | 'register'): void {
    this.activeTab.set(tab);
    this.errorMessage = '';
    this.regErrorMessage = '';
    if (tab === 'register') {
      this.regStep.set(1);
    }
  }

  nextRegStep(): void {
    this.regErrorMessage = '';

    if (this.regStep() === 1) {
      if (!this.regAgencyName.trim()) {
        this.regErrorMessage = 'Please enter your Brokerage or Agency Name.';
        return;
      }
      if (!this.regBrokerName.trim()) {
        this.regErrorMessage = 'Please enter Principal Broker / Director Name.';
        return;
      }
      this.regDirection.set('forward');
      this.regStep.set(2);
      return;
    }

    if (this.regStep() === 2) {
      if (!this.regEmail.trim()) {
        this.regErrorMessage = 'Please enter an official work email address.';
        return;
      }
      const email = this.regEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.regErrorMessage = 'Please enter a valid email address.';
        return;
      }
      if (!this.regPhone.trim()) {
        this.regErrorMessage = 'Please enter your direct contact phone number.';
        return;
      }
      this.regDirection.set('forward');
      this.regStep.set(3);
      return;
    }
  }

  prevRegStep(): void {
    this.regErrorMessage = '';
    this.regDirection.set('backward');
    this.regStep.update(s => Math.max(1, s - 1) as 1 | 2 | 3);
  }

  goToRegStep(step: 1 | 2 | 3): void {
    if (step < this.regStep()) {
      this.regErrorMessage = '';
      this.regDirection.set('backward');
      this.regStep.set(step);
    }
  }

  async signInWithGoogle() {
    this.errorMessage = '';
    this.isLoggingIn = true;
    this.loadingService.show('Connecting with Google...', 'Authenticating Google Workspace credentials and tenant mapping');
    try {
      const res = await signInWithPopup(this.firebaseService.auth, this.firebaseService.googleProvider);
      const user = res.user;
      const email = (user.email || '').toLowerCase().trim();

      // 1. Super Admin Check
      if (this.isSuperAdminEmail(email)) {
        const superProfile: UserProfile = {
          uid: user.uid,
          email: email,
          displayName: user.displayName || 'Mohamed Ibrahim (Super Admin)',
          photoURL: user.photoURL || undefined,
          phoneNumber: user.phoneNumber || undefined,
          role: 'super_admin',
          tenantId: 'platform_global',
          agencyName: 'PlotFlow HQ',
          isActive: true,
          onboardingCompleted: true,
          createdAt: Date.now()
        };
        this.auth.login(superProfile);
        this.tenantService.bindFirestoreTenantsListener();
        this.tenantService.refreshActiveTenant();
        this.loadingService.hide();
        this.snackbarService.success(`Welcome back, Platform Super Admin!`);
        this.router.navigate(['/dashboard']);
        return;
      }

      // 2. Check if user belongs to a Registered Tenant Agency
      const cleanPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const expectedTenantId = `tenant_${cleanPrefix}`;

      const registeredTenant = this.tenantService.tenants().find(t =>
        t.email.toLowerCase() === email ||
        t.ownerUid === user.uid ||
        t.id === expectedTenantId
      );

      // 3. Check if user is an Invited Agent / Team Member
      const registeredMember = this.tenantService.teamMembers().find(m =>
        m.email.toLowerCase() === email || m.uid === user.uid
      );

      // BLOCK UNREGISTERED USERS
      if (!registeredTenant && !registeredMember) {
        await this.firebaseService.auth.signOut();
        this.errorMessage = `Access Denied: Google account "${email}" is not registered on PlotFlow. Please register your agency using the "Register Agency" tab above or request an invite.`;
        this.isLoggingIn = false;
        this.loadingService.hide();
        return;
      }

      if (registeredTenant) {
        const profile: UserProfile = {
          uid: user.uid,
          email: email,
          displayName: user.displayName || registeredTenant.agencyName,
          photoURL: user.photoURL || undefined,
          phoneNumber: user.phoneNumber || registeredTenant.phone,
          role: 'agency_admin',
          tenantId: registeredTenant.id,
          agencyName: registeredTenant.agencyName,
          isActive: true,
          onboardingCompleted: true,
          createdAt: Date.now()
        };

        this.auth.login(profile);
        this.tenantService.refreshActiveTenant();
        this.loadingService.hide();

        if (registeredTenant.status === 'active') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/pending-approval']);
        }
        return;
      }

      if (registeredMember) {
        const tenant = this.tenantService.getTenantById(registeredMember.tenantId);
        if (!tenant || tenant.status !== 'active') {
          await this.firebaseService.auth.signOut();
          this.errorMessage = 'Access Denied: Your brokerage agency account is currently inactive or pending approval.';
          this.isLoggingIn = false;
          this.loadingService.hide();
          return;
        }

        this.auth.login(registeredMember);
        this.tenantService.refreshActiveTenant();
        this.loadingService.hide();
        this.router.navigate(['/dashboard']);
        return;
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'Google sign-in popup was cancelled.';
      } else if (err.code === 'auth/operation-not-allowed') {
        this.errorMessage = 'Google Sign-In is being enabled. You can also sign in directly with your email below.';
      } else {
        this.errorMessage = err.message || 'Unable to sign in with Google. Please try again.';
      }
    } finally {
      this.isLoggingIn = false;
      this.loadingService.hide();
    }
  }

  handleLogin(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your registered work email address.';
      return;
    }
    const email = this.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.isLoggingIn = true;
    this.loadingService.show('Signing into PlotFlow...', 'Verifying workspace credentials and loading tenant data');

    // 1. Super Admin
    if (this.isSuperAdminEmail(email)) {
      const superProfile: UserProfile = {
        uid: 'user_super_01',
        email: email,
        displayName: 'Mohamed Ibrahim (Super Admin)',
        role: 'super_admin',
        tenantId: 'platform_global',
        agencyName: 'PlotFlow HQ',
        isActive: true,
        onboardingCompleted: true,
        createdAt: Date.now()
      };
      this.auth.login(superProfile);
      this.tenantService.bindFirestoreTenantsListener();
      this.tenantService.refreshActiveTenant();
      this.isLoggingIn = false;
      this.loadingService.hide();
      this.snackbarService.success(`Welcome back, Platform Super Admin!`);
      this.router.navigate(['/dashboard']);
      return;
    }

    // 2. Check for registered tenant agency
    const cleanPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const expectedTenantId = `tenant_${cleanPrefix}`;

    const registeredTenant = this.tenantService.tenants().find(t =>
      t.email.toLowerCase() === email ||
      t.id === expectedTenantId
    );

    // 3. Check for invited agent / team member
    const registeredMember = this.tenantService.teamMembers().find(m =>
      m.email.toLowerCase() === email
    );

    // BLOCK UNREGISTERED USERS
    if (!registeredTenant && !registeredMember) {
      this.errorMessage = `Access Denied: "${email}" is not registered. Switch to the "Register Agency" tab to submit your brokerage for approval.`;
      this.isLoggingIn = false;
      this.loadingService.hide();
      return;
    }

    if (registeredTenant) {
      const displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const profile: UserProfile = {
        uid: registeredTenant.ownerUid || `user_${Date.now()}`,
        email: email,
        displayName: displayName || registeredTenant.agencyName,
        role: 'agency_admin',
        tenantId: registeredTenant.id,
        agencyName: registeredTenant.agencyName,
        isActive: true,
        onboardingCompleted: true,
        createdAt: Date.now()
      };

      this.auth.login(profile);
      this.tenantService.refreshActiveTenant();
      this.isLoggingIn = false;
      this.loadingService.hide();

      if (registeredTenant.status === 'active') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/pending-approval']);
      }
      return;
    }

    if (registeredMember) {
      const tenant = this.tenantService.getTenantById(registeredMember.tenantId);
      if (!tenant || tenant.status !== 'active') {
        this.errorMessage = 'Access Denied: Your brokerage agency account is currently inactive or pending approval.';
        this.isLoggingIn = false;
        this.loadingService.hide();
        return;
      }

      this.auth.login(registeredMember);
      this.tenantService.refreshActiveTenant();
      this.isLoggingIn = false;
      this.loadingService.hide();
      this.router.navigate(['/dashboard']);
      return;
    }
  }

  handleRegister(event?: Event) {
    if (event) event.preventDefault();
    this.regErrorMessage = '';

    if (!this.regReraNumber.trim()) {
      this.regErrorMessage = 'Please enter RERA registration or license number (or "Applied / In Process").';
      return;
    }
    if (!this.regCity.trim()) {
      this.regErrorMessage = 'Please enter your primary operating city/territory.';
      return;
    }

    const email = this.regEmail.trim().toLowerCase();
    this.isRegistering = true;

    try {
      const cleanPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const tenantId = `tenant_${cleanPrefix}`;

      // Create applicant UserProfile
      const applicantProfile: UserProfile = {
        uid: `user_${Date.now()}`,
        email: email,
        displayName: this.regBrokerName.trim(),
        phoneNumber: this.regPhone.trim(),
        role: 'agency_admin',
        tenantId: tenantId,
        agencyName: this.regAgencyName.trim(),
        isActive: true,
        onboardingCompleted: true,
        createdAt: Date.now()
      };

      // Set user session in AuthService
      this.auth.login(applicantProfile);

      // Submit onboarding application to TenantService
      this.tenantService.submitOnboarding({
        agencyName: this.regAgencyName.trim(),
        brokerName: this.regBrokerName.trim(),
        phone: this.regPhone.trim(),
        reraNumber: this.regReraNumber.trim(),
        city: this.regCity.trim(),
        address: `${this.regCity.trim()} Business Center`,
        teamSize: '1-5',
        currency: 'INR',
        defaultAreaUnit: 'sqft'
      });

      fireConfetti();

      setTimeout(() => {
        this.router.navigate(['/pending-approval']);
      }, 700);
    } catch (err: any) {
      this.regErrorMessage = err.message || 'Unable to complete registration. Please try again.';
      this.isRegistering = false;
    }
  }
}

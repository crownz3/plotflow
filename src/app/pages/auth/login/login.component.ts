import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { UserProfile, UserRole } from '../../../core/models/models';
import { signInWithPopup } from 'firebase/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  platformConfig = inject(PlatformConfigService);
  firebaseService = inject(FirebaseService);
  router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';
  isLoggingIn = false;

  async signInWithGoogle() {
    this.errorMessage = '';
    this.isLoggingIn = true;
    try {
      const res = await signInWithPopup(this.firebaseService.auth, this.firebaseService.googleProvider);
      const user = res.user;
      const email = user.email || '';

      const isGoogleMail = /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i.test(email);
      if (!isGoogleMail) {
        await this.firebaseService.auth.signOut();
        this.errorMessage = 'PlotFlow access is restricted to verified Google Mail (@gmail.com) accounts only.';
        this.isLoggingIn = false;
        return;
      }

      // Check for Super Admin
      if (email.toLowerCase() === 'mohamedibrahim040125@gmail.com') {
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
          createdAt: Date.now()
        };
        this.auth.login(superProfile);
        this.router.navigate(['/dashboard']);
        return;
      }

      // Regular Tenant Broker / Agent
      const tenantId = `tenant_${user.uid.slice(0, 10)}`;
      const profile: UserProfile = {
        uid: user.uid,
        email: email,
        displayName: user.displayName || 'Broker Principal',
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || undefined,
        role: 'agency_admin',
        tenantId: tenantId,
        agencyName: `${user.displayName || 'PlotFlow'} Realty`,
        isActive: true,
        createdAt: Date.now()
      };

      let activeTenant = this.tenantService.tenants().find(t => t.id === tenantId);
      if (!activeTenant) {
        activeTenant = {
          id: tenantId,
          agencyName: `${user.displayName || 'PlotFlow'} Realty`,
          ownerUid: user.uid,
          phone: user.phoneNumber || '+91 90000 00000',
          email: email,
          address: 'Headquarters',
          currency: 'INR',
          defaultAreaUnit: 'sqft',
          subscriptionPlan: 'pro',
          trialExpiresAt: Date.now() + 86400000 * 14,
          totalAgentsCount: 1,
          totalListingsCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        this.tenantService.tenants.update(list => [activeTenant!, ...list]);
      }
      this.tenantService.activeTenant.set(activeTenant);
      this.auth.login(profile);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'Google sign-in popup was cancelled.';
      } else if (err.code === 'auth/operation-not-allowed') {
        this.errorMessage = 'Google Sign-In provider is currently being enabled in Firebase Console. You can also sign in with the 1-Click fast demo access.';
      } else {
        this.errorMessage = err.message || 'Unable to sign in with Google. Please try again.';
      }
    } finally {
      this.isLoggingIn = false;
    }
  }

  quickLogin(role: UserRole) {
    this.auth.loginDemo(role);
    this.tenantService.refreshActiveTenant();
    this.router.navigate(['/dashboard']);
  }

  handleLogin(event: Event) {
    event.preventDefault();
    if (this.email.trim()) {
      const isGoogleMail = /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i.test(this.email.trim());
      if (!isGoogleMail) {
        this.errorMessage = 'PlotFlow requires a Google Mail (@gmail.com) address for all tenant and admin accounts.';
        return;
      }
      if (this.email.trim().toLowerCase() === 'mohamedibrahim040125@gmail.com') {
        this.quickLogin('super_admin');
        return;
      }
    }
    this.quickLogin('agency_admin');
  }

  quickRegister() {
    this.tenantService.registerNewTenant({
      agencyName: 'Sunrise Metro Realty',
      phone: '+91 98888 12345',
      email: 'sunrisemetro.realty@gmail.com',
      address: 'Business Bay, OMR, Chennai'
    });
    this.auth.loginDemo('agency_admin');
    this.router.navigate(['/dashboard']);
  }
}


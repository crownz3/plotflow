import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { SnackbarComponent } from './shared/components/snackbar/snackbar.component';
import { AiPromptDialogComponent } from './shared/components/ai-prompt-dialog/ai-prompt-dialog.component';
import { AuthService } from './core/services/auth.service';
import { TenantService } from './core/services/tenant.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    SidebarComponent,
    LoaderComponent,
    SnackbarComponent,
    AiPromptDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  router = inject(Router);
  sidebarCollapsed = false;
  readonly mobileDrawerOpen = signal(false);

  readonly currentUrl = signal<string>(this.router.url || '');

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentUrl.set(e.urlAfterRedirects || e.url || '');
        this.mobileDrawerOpen.set(false);
      });
  }

  readonly isFullAppShell = computed(() => {
    if (!this.auth.isAuthenticated()) return false;

    const url = this.currentUrl();
    if (url.includes('/login') || url.includes('/onboarding') || url.includes('/pending-approval')) {
      return false;
    }

    if (this.auth.isSuperAdmin()) return true;
    const user = this.auth.currentUser();
    if (!user?.onboardingCompleted) return false;
    const tenant = this.tenantService.getTenantById(user.tenantId);
    return tenant?.status === 'active';
  });

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      this.mobileDrawerOpen.set(!this.mobileDrawerOpen());
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  toggleMobileDrawer(): void {
    this.mobileDrawerOpen.set(!this.mobileDrawerOpen());
  }

  closeMobileDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

  exitSupportContext(): void {
    this.auth.exitSupportContext();
    this.tenantService.refreshActiveTenant();
  }
}

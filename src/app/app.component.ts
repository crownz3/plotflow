import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { BottomTabsComponent } from './shared/components/bottom-tabs/bottom-tabs.component';
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
    BottomTabsComponent,
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
  sidebarCollapsed = false;

  readonly isFullAppShell = computed(() => {
    if (!this.auth.isAuthenticated()) return false;
    if (this.auth.isSuperAdmin()) return true;
    const user = this.auth.currentUser();
    if (!user?.onboardingCompleted) return false;
    const tenant = this.tenantService.getTenantById(user.tenantId);
    return tenant?.status === 'active';
  });

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  exitSupportContext(): void {
    this.auth.exitSupportContext();
    this.tenantService.refreshActiveTenant();
  }
}

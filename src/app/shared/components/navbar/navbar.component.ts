import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  @Output() onToggleSidebar = new EventEmitter<void>();

  auth = inject(AuthService);
  tenantService = inject(TenantService);
  platformConfig = inject(PlatformConfigService);
  router = inject(Router);

  showUserMenu = signal(false);

  get userInitials(): string {
    const name = this.auth.currentUser()?.displayName || 'User';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { UserRole } from '../../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  @Output() onToggleSidebar = new EventEmitter<void>();

  auth = inject(AuthService);
  tenantService = inject(TenantService);
  platformConfig = inject(PlatformConfigService);

  get userInitials(): string {
    const name = this.auth.currentUser()?.displayName || 'User';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  switchRole(role: UserRole) {
    this.auth.loginDemo(role);
  }
}


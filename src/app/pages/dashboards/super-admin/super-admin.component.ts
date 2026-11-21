import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PropertyService } from '../../../core/services/property.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent, StatusPillComponent],
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.scss'
})
export class SuperAdminDashboardComponent {
  auth = inject(AuthService);
  tenantService = inject(TenantService);
  propertyService = inject(PropertyService);
  platformConfig = inject(PlatformConfigService);

  platformNameInput = this.platformConfig.platformName();
  taglineInput = this.platformConfig.tagline();
  emailInput = this.platformConfig.supportEmail();
  saveSuccess = false;

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
}

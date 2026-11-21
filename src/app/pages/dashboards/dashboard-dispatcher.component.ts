import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { SuperAdminDashboardComponent } from './super-admin/super-admin.component';
import { AgencyAdminDashboardComponent } from './agency-admin/agency-admin.component';
import { AgentDashboardComponent } from './agent/agent.component';

@Component({
  selector: 'app-dashboard-dispatcher',
  standalone: true,
  imports: [CommonModule, SuperAdminDashboardComponent, AgencyAdminDashboardComponent, AgentDashboardComponent],
  templateUrl: './dashboard-dispatcher.component.html',
  styleUrl: './dashboard-dispatcher.component.scss'
})
export class DashboardDispatcherComponent {
  auth = inject(AuthService);
}

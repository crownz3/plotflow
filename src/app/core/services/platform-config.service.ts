import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlatformConfigService {
  private readonly STORAGE_KEY = 'plotflow_platform_config';

  readonly platformName = signal<string>('PlotFlow');
  readonly tagline = signal<string>('Multi-Tenant Real Estate Broker CRM & Property SaaS');
  readonly supportEmail = signal<string>('mohamedibrahim040125@gmail.com');

  constructor() {
    this.loadFromStorage();

    // Auto-persist whenever platformName or tagline changes
    effect(() => {
      const config = {
        platformName: this.platformName(),
        tagline: this.tagline(),
        supportEmail: this.supportEmail()
      };
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
        document.title = `${this.platformName()} — Real Estate Broker CRM & SaaS`;
      } catch (e) {
        // Safe fallback in non-browser or sandbox environments
      }
    });
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.platformName) this.platformName.set(parsed.platformName);
        if (parsed.tagline) this.tagline.set(parsed.tagline);
        if (parsed.supportEmail) this.supportEmail.set(parsed.supportEmail);
      }
    } catch (e) {
      // Ignore storage read errors
    }
  }

  updatePlatformBranding(newName: string, newTagline?: string, newEmail?: string): void {
    if (newName?.trim()) {
      this.platformName.set(newName.trim());
    }
    if (newTagline?.trim()) {
      this.tagline.set(newTagline.trim());
    }
    if (newEmail?.trim()) {
      this.supportEmail.set(newEmail.trim());
    }
  }
}


import { Injectable, signal, effect, inject } from '@angular/core';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class PlatformConfigService {
  private readonly STORAGE_KEY = 'plotflow_platform_config';
  private firebase = inject(FirebaseService);

  readonly platformName = signal<string>('PlotFlow');
  readonly tagline = signal<string>('Multi-Tenant Real Estate Broker CRM & Property SaaS');
  readonly supportEmail = signal<string>('mohamedibrahim040125@gmail.com');

  constructor() {
    this.loadFromStorage();
    this.bindFirestoreConfigListener();

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

  private bindFirestoreConfigListener(): void {
    try {
      const docRef = doc(this.firebase.firestore, 'platform_config', 'global');
      onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data?.['platformName']) this.platformName.set(data['platformName']);
            if (data?.['tagline']) this.tagline.set(data['tagline']);
            if (data?.['supportEmail']) this.supportEmail.set(data['supportEmail']);
          }
        },
        (err) => {
          // Graceful fallback for unauthenticated users
          if (err.code !== 'permission-denied') {
            console.warn('Platform config listener running in offline mode:', err.message);
          }
        }
      );
    } catch (e) {
      console.warn('Could not bind platform_config listener:', e);
    }
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
    const finalName = newName?.trim() || this.platformName();
    const finalTagline = newTagline?.trim() || this.tagline();
    const finalEmail = newEmail?.trim() || this.supportEmail();

    if (newName?.trim()) {
      this.platformName.set(finalName);
    }
    if (newTagline?.trim()) {
      this.tagline.set(finalTagline);
    }
    if (newEmail?.trim()) {
      this.supportEmail.set(finalEmail);
    }

    // Persist to Cloud Firestore (/platform_config/global)
    try {
      const docRef = doc(this.firebase.firestore, 'platform_config', 'global');
      setDoc(docRef, {
        id: 'global',
        platformName: finalName,
        tagline: finalTagline,
        supportEmail: finalEmail,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to save platform config to Cloud Firestore:', e);
    }
  }
}


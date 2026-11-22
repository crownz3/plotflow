import { Injectable, signal } from '@angular/core';

export interface LoadingState {
  active: boolean;
  message: string;
  submessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private state = signal<LoadingState>({
    active: false,
    message: 'Loading...',
    submessage: undefined
  });

  // Public readonly signal
  readonly loadingState = this.state.asReadonly();

  private timeoutRef: any = null;

  /**
   * Show the full-screen major action loader.
   * Includes safety auto-timeout to prevent permanently freezing the UI.
   */
  show(message: string = 'Processing...', submessage?: string, timeoutMs: number = 30000) {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }

    this.state.set({
      active: true,
      message,
      submessage
    });

    // Safety fallback: auto-hide after timeoutMs in case of unhandled network drop
    this.timeoutRef = setTimeout(() => {
      if (this.state().active) {
        console.warn('LoadingService: Operation timed out, auto-hiding loader.');
        this.hide();
      }
    }, timeoutMs);
  }

  /**
   * Update the active loader message dynamically (e.g., step 1 -> step 2)
   */
  updateMessage(message: string, submessage?: string) {
    this.state.update(s => ({
      ...s,
      message,
      submessage: submessage !== undefined ? submessage : s.submessage
    }));
  }

  /**
   * Hide the full-screen loader immediately
   */
  hide() {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }
    this.state.set({
      active: false,
      message: 'Loading...',
      submessage: undefined
    });
  }
}


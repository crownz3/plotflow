import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarData {
  id: string;
  type: SnackbarType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private activeToast = signal<SnackbarData | null>(null);

  readonly currentSnackbar = this.activeToast.asReadonly();

  private timerRef: any = null;

  /**
   * Display a notification snackbar
   */
  show(
    type: SnackbarType,
    message: string,
    actionLabel?: string,
    onAction?: () => void,
    durationMs: number = 3500
  ) {
    if (this.timerRef) {
      clearTimeout(this.timerRef);
    }

    const data: SnackbarData = {
      id: 'toast_' + Date.now(),
      type,
      message,
      actionLabel,
      onAction,
      durationMs
    };

    this.activeToast.set(data);

    if (durationMs > 0) {
      this.timerRef = setTimeout(() => {
        this.dismiss();
      }, durationMs);
    }
  }

  success(message: string, actionLabel?: string, onAction?: () => void, durationMs: number = 3500) {
    this.show('success', message, actionLabel, onAction, durationMs);
  }

  error(message: string, actionLabel?: string, onAction?: () => void, durationMs: number = 5000) {
    this.show('error', message, actionLabel, onAction, durationMs);
  }

  info(message: string, actionLabel?: string, onAction?: () => void, durationMs: number = 3500) {
    this.show('info', message, actionLabel, onAction, durationMs);
  }

  warning(message: string, actionLabel?: string, onAction?: () => void, durationMs: number = 4000) {
    this.show('warning', message, actionLabel, onAction, durationMs);
  }

  dismiss() {
    if (this.timerRef) {
      clearTimeout(this.timerRef);
      this.timerRef = null;
    }
    this.activeToast.set(null);
  }
}


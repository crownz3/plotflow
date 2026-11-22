import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AiService } from '../../../core/services/ai.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-ai-prompt-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-prompt-dialog.component.html',
  styleUrl: './ai-prompt-dialog.component.scss'
})
export class AiPromptDialogComponent {
  aiService = inject(AiService);
  snackbar = inject(SnackbarService);
  router = inject(Router);

  generatedOutput = signal<string | null>(null);

  get config() {
    return this.aiService.activePromptDialog();
  }

  close(): void {
    this.generatedOutput.set(null);
    this.aiService.closeAiPromptDialog();
  }

  async runAiGeneration(): Promise<void> {
    const cfg = this.config;
    if (!cfg) return;

    if (cfg.mode === 'objection_handling') {
      const { category, notes, propertyTitle, price, buyerName } = cfg.payload;
      const res = await this.aiService.generateObjectionAdvice(category, notes, propertyTitle, price, buyerName);
      this.generatedOutput.set(res);
    } else if (cfg.mode === 'property_pitch') {
      const { property, tone } = cfg.payload;
      const res = await this.aiService.generatePropertyPitch(property, tone || 'whatsapp');
      this.generatedOutput.set(res);
    } else if (cfg.mode === 'buyer_matching') {
      const { buyerName, concern, budget, locality, properties } = cfg.payload;
      const res = await this.aiService.matchBuyerToInventory(buyerName, concern, budget, locality, properties);
      this.generatedOutput.set(res);
    } else if (cfg.mode === 'expense_audit') {
      const { weeklyData, monthlyData } = cfg.payload;
      const res = await this.aiService.generateExpenseAudit(weeklyData, monthlyData);
      this.generatedOutput.set(res);
    }
  }

  copyOutput(): void {
    const text = this.generatedOutput();
    if (!text) return;

    navigator.clipboard.writeText(text);
    this.snackbar.success('AI generation copied to clipboard!');
  }

  shareWhatsApp(): void {
    const text = this.generatedOutput();
    if (!text) return;

    const encoded = encodeURIComponent(text);
    const phone = this.config?.payload?.buyerPhone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  }

  openFullStudio(): void {
    this.close();
    this.router.navigate(['/ai']);
  }
}


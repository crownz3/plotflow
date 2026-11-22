import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property.service';
import { SiteVisitService } from '../../core/services/site-visit.service';
import { ExpenseService } from '../../core/services/expense.service';
import { DealService } from '../../core/services/deal.service';
import { TenantService } from '../../core/services/tenant.service';
import { AiService } from '../../core/services/ai.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Property, SiteVisit } from '../../core/models/models';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-plotflow-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  templateUrl: './ai.component.html',
  styleUrl: './ai.component.scss'
})
export class PlotflowAiComponent {
  propertyService = inject(PropertyService);
  siteVisitService = inject(SiteVisitService);
  expenseService = inject(ExpenseService);
  dealService = inject(DealService);
  ai = inject(AiService);
  tenantService = inject(TenantService);
  snackbar = inject(SnackbarService);

  // Active AI Tool Tab
  activeTab = signal<'pitch' | 'matchmaker' | 'objections' | 'audit'>('pitch');

  // Shared Language Preference across AI Tools (synced directly from Agency Settings)
  selectedLanguage = computed<string>(() => this.tenantService.activeTenant()?.defaultLanguage || 'English');
  readonly availableLanguages = [
    { code: 'English', label: 'English', flag: '🇬🇧' },
    { code: 'Tamil', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'Tanglish', label: 'Tanglish (Tamil+English)', flag: '💬' },
    { code: 'Hindi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'Hinglish', label: 'Hinglish (Hindi+English)', flag: '💬' },
    { code: 'Telugu', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'Kannada', label: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' }
  ];

  // Clipboard Copied Statuses
  isPitchCopied = signal<boolean>(false);
  isMatchCopied = signal<boolean>(false);
  isBattlecardCopied = signal<boolean>(false);
  isAuditCopied = signal<boolean>(false);

  // ==========================================
  // TAB 1: PITCH & WHATSAPP COPYWRITER
  // ==========================================
  selectedPropertyId = signal<string>('');
  selectedTone = signal<'whatsapp' | 'portal' | 'luxury'>('whatsapp');
  generatedPitch = signal<string | null>(null);

  get selectedProperty(): Property | undefined {
    const id = this.selectedPropertyId();
    const props = this.propertyService.tenantProperties();
    return props.find(p => p.id === id) || props[0];
  }

  async generatePitch(): Promise<void> {
    const prop = this.selectedProperty;
    if (!prop) {
      this.snackbar.error('Please add or select a property listing first.');
      return;
    }

    const res = await this.ai.generatePropertyPitch(prop, this.selectedTone(), this.selectedLanguage());
    this.generatedPitch.set(res);
    this.snackbar.success('AI Pitch generated successfully!');
  }

  copyPitch(): void {
    const text = this.generatedPitch();
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.isPitchCopied.set(true);
    setTimeout(() => this.isPitchCopied.set(false), 2500);
    this.snackbar.success('Marketing pitch copied to clipboard!');
  }

  sharePitchWhatsApp(): void {
    const text = this.generatedPitch();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // ==========================================
  // TAB 2: BUYER MATCHMAKER
  // ==========================================
  selectedBuyerId = signal<string>('');
  generatedMatchOutput = signal<string | null>(null);

  readonly droppedBuyers = computed(() => {
    return this.siteVisitService.tenantVisits().filter(v =>
      !!v.buyerConcernCategory || !!v.interestedInNextProject || v.status === 'completed'
    );
  });

  async runBuyerMatch(visit: SiteVisit): Promise<void> {
    this.selectedBuyerId.set(visit.id);
    const properties = this.propertyService.tenantProperties();
    const res = await this.ai.matchBuyerToInventory(
      visit.leadName,
      visit.buyerConcernNotes || visit.feedback || 'Past budget constraint',
      visit.nextProjectPreferences?.targetBudget || 0,
      visit.nextProjectPreferences?.preferredLocality || visit.propertyLocation,
      properties
    );
    this.generatedMatchOutput.set(res);
  }

  copyMatchAnalysis(): void {
    const text = this.generatedMatchOutput();
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.isMatchCopied.set(true);
    setTimeout(() => this.isMatchCopied.set(false), 2500);
    this.snackbar.success('Matchmaker analysis copied to clipboard!');
  }

  shareMatchToBuyer(phone: string): void {
    const text = this.generatedMatchOutput();
    if (!text) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // ==========================================
  // TAB 3: OBJECTION COACH
  // ==========================================
  objectionCategory = signal<'price_budget' | 'location_connectivity' | 'vastu_facing' | 'bank_loan_legal' | 'size_layout'>('price_budget');
  buyerNameInput = signal<string>('Vikram Sundaram');
  buyerConcernInput = signal<string>('Asking price is too high compared to local unapproved plots');
  generatedObjectionAdvice = signal<string | null>(null);

  async generateObjectionAdvice(): Promise<void> {
    const prop = this.selectedProperty;
    const price = prop ? prop.price : 4500000;
    const title = prop ? prop.title : 'Prime Plot Scheme';

    const res = await this.ai.generateObjectionAdvice(
      this.objectionCategory(),
      this.buyerConcernInput(),
      title,
      price,
      this.buyerNameInput(),
      this.selectedLanguage()
    );

    this.generatedObjectionAdvice.set(res);
    this.snackbar.success('Negotiation strategy & closing battlecard ready!');
  }

  copyBattlecard(): void {
    const text = this.generatedObjectionAdvice();
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.isBattlecardCopied.set(true);
    setTimeout(() => this.isBattlecardCopied.set(false), 2500);
    this.snackbar.success('Negotiation battlecard copied to clipboard!');
  }

  shareBattlecardWhatsApp(): void {
    const text = this.generatedObjectionAdvice();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // ==========================================
  // TAB 4: FINANCIAL AUDITOR
  // ==========================================
  generatedAudit = signal<string | null>(null);

  async runFinancialAudit(): Promise<void> {
    const weeklyData = this.expenseService.weeklyReport();
    const monthlyData = this.expenseService.monthlyReport();

    const res = await this.ai.generateExpenseAudit(weeklyData, monthlyData);
    this.generatedAudit.set(res);
    this.snackbar.success('PlotFlow AI Financial Audit completed!');
  }

  copyAuditReport(): void {
    const text = this.generatedAudit();
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.isAuditCopied.set(true);
    setTimeout(() => this.isAuditCopied.set(false), 2500);
    this.snackbar.success('Financial audit report copied to clipboard!');
  }
}


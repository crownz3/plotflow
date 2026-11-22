import { Injectable, signal, computed, inject } from '@angular/core';
import { Lead, LeadStage, Property } from '../models/models';
import { AuthService } from './auth.service';
import { PropertyService } from './property.service';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private auth = inject(AuthService);
  private propertyService = inject(PropertyService);
  private storageKey = 'pf_leads';

  readonly allLeads = signal<Lead[]>(this.loadInitial());

  // Scoped strictly by active tenant
  readonly tenantLeads = computed(() => {
    const tId = this.auth.activeTenantId();
    if (!tId) return [];
    if (this.auth.isSuperAdmin() && tId === 'platform_global') {
      return this.allLeads();
    }
    return this.allLeads().filter(l => l.tenantId === tId);
  });

  // Pipeline stages groups
  readonly leadsByStage = computed(() => {
    const leads = this.tenantLeads();
    const groups: Record<LeadStage, Lead[]> = {
      new: [],
      contacted: [],
      visit_scheduled: [],
      negotiation: [],
      closed_won: [],
      closed_lost: []
    };
    for (const lead of leads) {
      if (groups[lead.stage]) {
        groups[lead.stage].push(lead);
      }
    }
    return groups;
  });

  // Hot leads count
  readonly hotLeadsCount = computed(() =>
    this.tenantLeads().filter(l => l.priority === 'hot' && l.stage !== 'closed_won' && l.stage !== 'closed_lost').length
  );

  private loadInitial(): Lead[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.allLeads()));
    } catch (e) {
      console.warn('Failed to persist leads:', e);
    }
  }

  addLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'notes'>): Lead {
    const newLead: Lead = {
      ...data,
      id: `lead_${Date.now()}`,
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.allLeads.update(list => [newLead, ...list]);
    this.save();
    return newLead;
  }

  updateStage(leadId: string, newStage: LeadStage): void {
    this.allLeads.update(list =>
      list.map(l => l.id === leadId ? { ...l, stage: newStage, updatedAt: Date.now() } : l)
    );
    this.save();
  }

  addNote(leadId: string, text: string): void {
    const author = this.auth.currentUser()?.displayName || 'Agent';
    this.allLeads.update(list =>
      list.map(l => {
        if (l.id === leadId) {
          return {
            ...l,
            lastContactedAt: Date.now(),
            notes: [
              { id: `note_${Date.now()}`, text, createdAt: Date.now(), authorName: author },
              ...l.notes
            ],
            updatedAt: Date.now()
          };
        }
        return l;
      })
    );
    this.save();
  }

  updateLead(leadId: string, updates: Partial<Lead>): void {
    this.allLeads.update(list =>
      list.map(l => l.id === leadId ? { ...l, ...updates, updatedAt: Date.now() } : l)
    );
    this.save();
  }

  deleteLead(leadId: string): void {
    this.allLeads.update(list => list.filter(l => l.id !== leadId));
    this.save();
  }

  /**
   * Smart Property Matcher Engine
   * Returns properties from inventory matching the lead's budget, location, and type.
   */
  getMatchingProperties(lead: Lead): Property[] {
    const properties = this.propertyService.tenantProperties();
    return properties.filter(prop => {
      // Must be available
      if (prop.status !== 'available' && prop.status !== 'under_offer') return false;

      // Budget check (allows 10% upper negotiation headroom)
      const maxBudget = lead.requirement.budgetMax * 1.1;
      const minBudget = lead.requirement.budgetMin * 0.9;
      const withinBudget = prop.price >= minBudget && prop.price <= maxBudget;

      // Property type check
      const typeMatches = lead.requirement.propertyTypes.length === 0 ||
        lead.requirement.propertyTypes.includes(prop.propertyType);

      // Location match
      const locMatches = lead.requirement.preferredLocations.length === 0 ||
        lead.requirement.preferredLocations.some(loc =>
          prop.location.locality.toLowerCase().includes(loc.toLowerCase()) ||
          prop.location.city.toLowerCase().includes(loc.toLowerCase())
        );

      return (withinBudget && typeMatches) || (typeMatches && locMatches);
    });
  }

  /**
   * Generates a pre-filled WhatsApp click-to-chat URL with property recommendation
   */
  getWhatsAppShareUrl(lead: Lead, property?: Property): string {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const agent = this.auth.currentUser()?.displayName || 'Your Real Estate Advisor';
    const agency = this.auth.currentUser()?.agencyName || 'Prime Properties';

    let text = `Hello ${lead.name}! This is ${agent} from ${agency}.`;
    if (property) {
      text += `\n\nI found a prime verified property matching your exact requirements:\n\n*${property.title}*\nLocation: ${property.location.locality}, ${property.location.city}\nPrice: ₹${(property.price / 100000).toFixed(2)} Lakhs\nArea: ${property.area} ${property.areaUnit}\n\nWould you be free for an inspection visit this week?`;
    } else {
      text += `\n\nFollowing up regarding your property requirement. When would be a good time for a quick 2-minute call?`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
}

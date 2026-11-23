import { Injectable, signal, computed, inject, effect } from '@angular/core';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Lead, LeadStage, Property } from '../models/models';
import { AuthService } from './auth.service';
import { PropertyService } from './property.service';
import { FirebaseService } from './firebase.service';
import { sanitizeForFirestore } from '../utils/firestore.util';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  private propertyService = inject(PropertyService);

  readonly allLeads = signal<Lead[]>([]);
  private unsubscribeSnapshot: Unsubscribe | null = null;

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

  constructor() {
    effect(() => {
      const tenantId = this.auth.activeTenantId();
      this.bindFirestoreListener(tenantId);
    }, { allowSignalWrites: true });
  }

  private bindFirestoreListener(tenantId: string): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    if (!tenantId) {
      this.allLeads.set([]);
      return;
    }

    const path = tenantId === 'platform_global' ? 'tenants/tenant_default/leads' : `tenants/${tenantId}/leads`;
    try {
      const colRef = collection(this.firebase.firestore, path);
      this.unsubscribeSnapshot = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          const remote: Lead[] = [];
          snapshot.forEach(d => {
            remote.push({ id: d.id, ...d.data() } as Lead);
          });
          this.allLeads.set(remote);
        },
        (error) => {
          console.warn(`Firestore real-time sync for ${path} operating in offline cache mode:`, error.message);
        }
      );
    } catch (e) {
      console.warn('Could not attach Firestore onSnapshot for leads:', e);
    }
  }

  async addLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'notes'>): Promise<Lead> {
    const tenantId = data.tenantId || this.auth.activeTenantId() || 'tenant_default';
    const id = `lead_${Date.now()}`;
    const newLead: Lead = {
      ...data,
      id,
      tenantId,
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 1. Optimistic Signal Update
    this.allLeads.update(list => [newLead, ...list]);

    // 2. Cloud Firestore with IndexedDB persistence
    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/leads`, id);
      const payload = sanitizeForFirestore({ ...newLead, _cloudSyncedAt: Date.now() });
      await setDoc(docRef, payload);
    } catch (err) {
      console.warn('Firestore offline write queued for sync:', err);
    }

    return newLead;
  }

  async updateStage(leadId: string, newStage: LeadStage): Promise<void> {
    const current = this.allLeads().find(l => l.id === leadId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allLeads.update(list =>
      list.map(l => l.id === leadId ? { ...l, stage: newStage, updatedAt: Date.now() } : l)
    );

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/leads`, leadId);
      await updateDoc(docRef, { stage: newStage, updatedAt: Date.now() });
    } catch (err) {
      console.warn('Firestore offline update queued:', err);
    }
  }

  async addNote(leadId: string, text: string): Promise<void> {
    const author = this.auth.currentUser()?.displayName || 'Agent';
    const current = this.allLeads().find(l => l.id === leadId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';
    const newNote = { id: `note_${Date.now()}`, text, createdAt: Date.now(), authorName: author };

    this.allLeads.update(list =>
      list.map(l => {
        if (l.id === leadId) {
          return {
            ...l,
            lastContactedAt: Date.now(),
            notes: [newNote, ...l.notes],
            updatedAt: Date.now()
          };
        }
        return l;
      })
    );

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/leads`, leadId);
      const updatedNotes = current ? [newNote, ...current.notes] : [newNote];
      await updateDoc(docRef, {
        notes: updatedNotes,
        lastContactedAt: Date.now(),
        updatedAt: Date.now()
      });
    } catch (err) {
      console.warn('Firestore offline update queued:', err);
    }
  }

  async updateLead(leadId: string, updates: Partial<Lead>): Promise<void> {
    const current = this.allLeads().find(l => l.id === leadId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allLeads.update(list =>
      list.map(l => l.id === leadId ? { ...l, ...updates, updatedAt: Date.now() } : l)
    );

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/leads`, leadId);
      await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch (err) {
      console.warn('Firestore offline update queued:', err);
    }
  }

  async deleteLead(leadId: string): Promise<void> {
    const current = this.allLeads().find(l => l.id === leadId);
    const tenantId = current?.tenantId || this.auth.activeTenantId() || 'tenant_default';

    this.allLeads.update(list => list.filter(l => l.id !== leadId));

    try {
      const docRef = doc(this.firebase.firestore, `tenants/${tenantId}/leads`, leadId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore offline delete queued:', err);
    }
  }

  /**
   * Smart Property Matcher Engine
   */
  getMatchingProperties(lead: Lead): Property[] {
    const properties = this.propertyService.tenantProperties();
    return properties.filter(prop => {
      if (prop.status !== 'available' && prop.status !== 'under_offer') return false;

      const maxBudget = lead.requirement.budgetMax * 1.1;
      const minBudget = lead.requirement.budgetMin * 0.9;
      const withinBudget = prop.price >= minBudget && prop.price <= maxBudget;

      const typeMatches = lead.requirement.propertyTypes.length === 0 ||
        lead.requirement.propertyTypes.includes(prop.propertyType);

      const locMatches = lead.requirement.preferredLocations.length === 0 ||
        lead.requirement.preferredLocations.some(loc =>
          prop.location.locality.toLowerCase().includes(loc.toLowerCase()) ||
          prop.location.city.toLowerCase().includes(loc.toLowerCase())
        );

      return (withinBudget && typeMatches) || (typeMatches && locMatches);
    });
  }

  getWhatsAppShareUrl(lead: Lead, property?: Property): string {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const agent = this.auth.currentUser()?.displayName || 'Your Real Estate Advisor';
    const agency = this.auth.currentUser()?.agencyName || 'PlotFlow Brokerage';

    let text = `Hello ${lead.name}! This is ${agent} from ${agency}.`;
    if (property) {
      text += `\n\nI found a prime verified property matching your exact requirements:\n\n*${property.title}*\nLocation: ${property.location.locality}, ${property.location.city}\nPrice: ₹${(property.price / 100000).toFixed(2)} Lakhs\nArea: ${property.area} ${property.areaUnit}\n\nWould you be free for an inspection visit this week?`;
    } else {
      text += `\n\nFollowing up regarding your property requirement. When would be a good time for a quick 2-minute call?`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }
}

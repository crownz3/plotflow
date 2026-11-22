import { Injectable, inject, computed } from '@angular/core';
import { Property, Lead, SiteVisit, Deal } from '../models/models';
import { PropertyService } from './property.service';
import { LeadService } from './lead.service';
import { SiteVisitService } from './site-visit.service';
import { DealService } from './deal.service';
import { AuthService } from './auth.service';

export interface PropertyFinancials {
  pricePerUnit: number;
  projectedGrossBrokerage: number;
  projectedNetProfit: number;
  realizedDealValue?: number;
  realizedGrossBrokerage?: number;
  realizedAgentCommission?: number;
  realizedNetProfit?: number;
  isClosed: boolean;
}

export interface PropertyIntelligence {
  property: Property;
  financials: PropertyFinancials;
  matchedLeads: Lead[];
  visits: SiteVisit[];
  completedVisitsCount: number;
  scheduledVisitsCount: number;
  deal?: Deal;
}

export interface PortfolioAnalytics {
  totalInventoryValue: number;
  activeInventoryValue: number;
  soldVolume: number;
  totalProjectedBrokerage: number;
  totalProjectedNetProfit: number;
  totalRealizedNetProfit: number;
  totalVisitsCount: number;
  totalPropertiesCount: number;
  activePropertiesCount: number;
  soldPropertiesCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyAnalyticsService {
  private propertyService = inject(PropertyService);
  private leadService = inject(LeadService);
  private siteVisitService = inject(SiteVisitService);
  private dealService = inject(DealService);
  private auth = inject(AuthService);

  // Default brokerage assumption for listed inventory: 2% Buyer + 2% Seller = 4% Gross
  private readonly DEFAULT_BROKERAGE_PCT = 0.04;
  private readonly GST_RATE = 0.18;
  private readonly AVG_AGENT_SPLIT = 0.25;

  /**
   * Portfolio-Wide Macro Financial & Activity Statistics
   */
  readonly portfolioStats = computed<PortfolioAnalytics>(() => {
    const properties = this.propertyService.tenantProperties();
    const deals = this.dealService.tenantDeals();
    const visits = this.siteVisitService.tenantVisits();

    let totalInventoryValue = 0;
    let activeInventoryValue = 0;
    let activeCount = 0;
    let soldCount = 0;

    for (const p of properties) {
      totalInventoryValue += p.price || 0;
      if (p.status === 'available') {
        activeInventoryValue += p.price || 0;
        activeCount++;
      } else if (p.status === 'sold') {
        soldCount++;
      }
    }

    // Closed deals actual volume and realized profit
    const soldVolume = deals.reduce((acc, d) => acc + (d.dealValue || 0), 0);
    const totalRealizedNetProfit = deals.reduce((acc, d) => acc + (d.netAgencyBrokerage || 0), 0);

    // Projected potential brokerage on active listings
    const totalProjectedBrokerage = activeInventoryValue * this.DEFAULT_BROKERAGE_PCT;
    const netAfterGst = totalProjectedBrokerage * (1 - this.GST_RATE);
    const totalProjectedNetProfit = netAfterGst * (1 - this.AVG_AGENT_SPLIT);

    return {
      totalInventoryValue,
      activeInventoryValue,
      soldVolume,
      totalProjectedBrokerage,
      totalProjectedNetProfit,
      totalRealizedNetProfit,
      totalVisitsCount: visits.length,
      totalPropertiesCount: properties.length,
      activePropertiesCount: activeCount,
      soldPropertiesCount: soldCount
    };
  });

  /**
   * Deep-Dive Intelligence for a Specific Property
   */
  getPropertyIntelligence(property: Property): PropertyIntelligence {
    const leads = this.leadService.tenantLeads();
    const visits = this.siteVisitService.tenantVisits().filter(v => v.propertyId === property.id);
    const deals = this.dealService.tenantDeals();
    const deal = deals.find(d => d.propertyId === property.id);

    // Match leads interested in this specific property
    const matchedLeads = leads.filter(l => {
      if (l.stage === 'closed_lost') return false;

      // Price headroom: lead budget within +-15% of property price
      const minB = l.requirement.budgetMin * 0.85;
      const maxB = l.requirement.budgetMax * 1.15;
      const priceMatches = property.price >= minB && property.price <= maxB;

      // Type match
      const typeMatches = l.requirement.propertyTypes.length === 0 ||
        l.requirement.propertyTypes.includes(property.propertyType);

      // Locality match
      const locMatches = l.requirement.preferredLocations.length === 0 ||
        l.requirement.preferredLocations.some(loc =>
          property.location.locality.toLowerCase().includes(loc.toLowerCase()) ||
          property.location.city.toLowerCase().includes(loc.toLowerCase())
        );

      return (priceMatches && typeMatches) || (typeMatches && locMatches);
    });

    const isClosed = property.status === 'sold' || !!deal;
    const pricePerUnit = property.area > 0 ? Math.round(property.price / property.area) : 0;

    // Projected financials
    const projectedGrossBrokerage = Math.round(property.price * this.DEFAULT_BROKERAGE_PCT);
    const projectedNetAfterGst = projectedGrossBrokerage * (1 - this.GST_RATE);
    const projectedNetProfit = Math.round(projectedNetAfterGst * (1 - this.AVG_AGENT_SPLIT));

    const financials: PropertyFinancials = {
      pricePerUnit,
      projectedGrossBrokerage,
      projectedNetProfit,
      isClosed,
      realizedDealValue: deal ? deal.dealValue : undefined,
      realizedGrossBrokerage: deal ? deal.grossBrokerage : undefined,
      realizedAgentCommission: deal ? deal.agentCommissionAmount : undefined,
      realizedNetProfit: deal ? deal.netAgencyBrokerage : undefined
    };

    const completedVisitsCount = visits.filter(v => v.status === 'completed').length;
    const scheduledVisitsCount = visits.filter(v => v.status === 'scheduled').length;

    return {
      property,
      financials,
      matchedLeads,
      visits,
      completedVisitsCount,
      scheduledVisitsCount,
      deal
    };
  }
}


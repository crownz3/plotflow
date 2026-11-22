export type UserRole = 'super_admin' | 'agency_admin' | 'agent';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  tenantId: string;
  agencyName?: string;
  role: UserRole;
  isActive: boolean;
  onboardingCompleted?: boolean;
  assignedPropertyIds?: string[];
  createdAt: number;
}

export type TenantStatus = 'pending_approval' | 'active' | 'suspended' | 'rejected';

export interface Tenant {
  id: string;
  agencyName: string;
  ownerUid: string;
  reraNumber?: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  operatingCity?: string;
  teamSize?: string;
  status: TenantStatus;
  rejectionReason?: string;
  submittedAt?: number;
  approvedAt?: number;
  currency: 'INR' | 'USD' | 'AED' | 'EUR';
  defaultAreaUnit: 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha';
  subscriptionPlan: 'trial' | 'starter' | 'pro' | 'enterprise';
  trialExpiresAt: number;
  totalAgentsCount: number;
  totalListingsCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TenantApprovalNotification {
  id: string;
  tenantId: string;
  agencyName: string;
  applicantEmail: string;
  applicantName: string;
  phone: string;
  reraNumber?: string;
  address: string;
  operatingCity?: string;
  teamSize?: string;
  submittedAt: number;
  read: boolean;
}

export interface Property {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  propertyType: 'apartment' | 'villa' | 'plot' | 'commercial' | 'agricultural' | 'penthouse';
  listingType: 'sale' | 'rent' | 'lease';
  status: 'available' | 'under_offer' | 'sold' | 'rented';
  price: number;
  negotiable: boolean;
  area: number;
  areaUnit: 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha';
  bhk?: string;
  bathrooms?: number;
  facing?: string;
  location: {
    address: string;
    city: string;
    locality: string;
    pincode?: string;
  };
  amenities: string[];
  images: string[];
  ownerDetails: {
    name: string;
    phone: string;
    expectedPrice?: number;
    privateNotes?: string;
  };
  assignedAgentId?: string;
  assignedAgentName?: string;
  featured?: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export type LeadStage = 'new' | 'contacted' | 'visit_scheduled' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  source: 'walk_in' | 'portal_99acres' | 'portal_magicbricks' | 'referral' | 'social_media' | 'direct_call';
  stage: LeadStage;
  priority: 'hot' | 'warm' | 'cold';
  requirement: {
    propertyTypes: string[];
    listingType: 'sale' | 'rent';
    budgetMin: number;
    budgetMax: number;
    preferredLocations: string[];
    minArea?: number;
  };
  assignedAgentId?: string;
  assignedAgentName?: string;
  lastContactedAt?: number;
  nextFollowUpAt?: number;
  notes: {
    id: string;
    text: string;
    createdAt: number;
    authorName: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface SiteVisit {
  id: string;
  tenantId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  agentId: string;
  agentName: string;
  scheduledTime: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: string;
  createdAt: number;
}

export interface Deal {
  id: string;
  tenantId: string;
  dealTitle: string;
  propertyId: string;
  propertyTitle: string;
  leadId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  dealValue: number;
  buyerBrokeragePercent: number;
  sellerBrokeragePercent: number;
  grossBrokerage: number;
  gstPercent: number;
  gstAmount: number;
  agentCommissionPercent: number;
  agentCommissionAmount: number;
  netAgencyBrokerage: number;
  totalReceived: number;
  balanceReceivable: number;
  closingDate: number;
  status: 'closed_won' | 'under_process';
  createdAt: number;
}

export interface Expense {
  id: string;
  tenantId: string;
  title: string;
  category: 'marketing' | 'travel_fuel' | 'office_rent' | 'portal_listing_fee' | 'miscellaneous';
  amount: number;
  date: number;
  loggedBy: string;
  createdAt: number;
}


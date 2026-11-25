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
  defaultLanguage?: 'English' | 'Tamil' | 'Tanglish' | 'Hindi' | 'Hinglish' | 'Telugu' | 'Kannada';
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

export interface PlotDetails {
  dimensions?: string; // e.g. "40 x 60"
  roadWidthFt?: number; // e.g. 30, 40
  approvalStatus?: 'DTCP' | 'CMDA' | 'RERA' | 'Panchayat' | 'Patta' | 'Approved' | 'Other';
  isCornerPlot?: boolean;
  hasBoundaryWall?: boolean;
  isGatedLayout?: boolean;
  soilType?: string;
}

export interface VillaFloorPlan {
  floorLevel: string; // e.g. "Ground Floor", "1st Floor", "2nd Floor", "Terrace Studio"
  builtUpAreaSqFt: number; // e.g. 1400
  bhk: string; // e.g. "2 BHK", "1 BHK", "3 BHK", "Living / Hall"
  bedroomsCount: number; // e.g. 2
  bathroomsCount: number; // e.g. 2
  hasAttachedBath?: boolean; // optional
  attachedBathCount?: number;
  hasBalcony?: boolean;
}

export interface VillaDetails {
  plotArea?: number;
  builtUpArea?: number;
  groundFloorBuiltUpArea?: number;
  firstFloorBuiltUpArea?: number;
  floors?: string; // "Structure / Floors" e.g. "G+1 Duplex", "G+2 Triplex"
  buildingStructure?: 'framed' | 'load_bearing'; // Framed RCC vs Load Bearing
  floorBreakdown?: VillaFloorPlan[];
  bedrooms?: number;
  bathrooms?: number;
  coveredParking?: boolean;
  carParking?: number;
  hasGarden?: boolean;
  facing?: string;
  roadFacing?: string;
  mainEntranceFacing?: string;
  furnishing?: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
}

export interface ApartmentDetails {
  floorNumber?: number;
  totalFloors?: number;
  bhk?: string;
  bathrooms?: number;
  balconies?: number;
  monthlyMaintenance?: number;
  udsSqFt?: number;
  facing?: string;
}

export interface CommercialDetails {
  floorPlate?: number;
  powerBackupKva?: number;
  cafeteria?: boolean;
  passengerLifts?: number;
  fireNoc?: boolean;
}

export interface VicinityCustomPoint {
  landmark: string;
  distance: string;
}

export interface PropertyVicinity {
  metroDistance?: string;
  airportDistance?: string;
  schoolDistance?: string;
  hospitalDistance?: string;
  highwayDistance?: string;
  busStopDistance?: string;
  marketDistance?: string;
  locationMapUrl?: string;
  customPoints?: VicinityCustomPoint[];
}

export interface PropertyMedia {
  photos?: string[];
  layoutPlanUrl?: string;
  videoTourUrl?: string;
}

export interface PlotCoordinate {
  lat: number;
  lng: number;
}

export interface PlotBoundaryPoint extends PlotCoordinate {
  label?: string; // e.g. "Front-Left", "Rear-Right"
  dimensionFt?: number; // edge length in feet to next point
}

export interface Plot3DConfig {
  wallHeightFt?: number; // e.g. 5ft compound wall
  buildingSetbackFt?: { front: number; rear: number; left: number; right: number };
  facingDirection?: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West';
  roadWidthFt?: number;
  cornerPlot?: boolean;
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
    coordinates?: PlotCoordinate;
    plotBoundary?: PlotBoundaryPoint[];
    view3D?: Plot3DConfig;
  };
  mapsUrl?: string;
  amenities: string[];
  infrastructure?: string[];
  images: string[];
  plotDetails?: PlotDetails;
  villaDetails?: VillaDetails;
  apartmentDetails?: ApartmentDetails;
  commercialDetails?: CommercialDetails;
  vicinity?: PropertyVicinity;
  media?: PropertyMedia;
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
  // Buyer Concern & Next Project Retargeting
  buyerConcernCategory?: 'price_budget' | 'location_connectivity' | 'vastu_facing' | 'bank_loan_legal' | 'size_layout' | 'timeline' | 'other';
  buyerConcernNotes?: string;
  interestedInNextProject?: boolean;
  nextProjectPreferences?: {
    targetBudget?: number;
    preferredLocality?: string;
    preferredSize?: string;
  };
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
  category: 'marketing' | 'travel_fuel' | 'office_rent' | 'portal_listing_fee' | 'client_hospitality' | 'legal_documentation' | 'site_maintenance' | 'miscellaneous';
  amount: number;
  date: number;
  propertyId?: string;
  propertyTitle?: string;
  notes?: string;
  loggedBy: string;
  createdAt: number;
}

export interface SecureSharedLink {
  id: string;
  tenantId: string;
  propertyId: string;
  propertyTitle: string;
  
  // Sanitized property snapshot (Owner private notes and contact details are completely stripped)
  propertySnapshot: {
    id: string;
    title: string;
    description: string;
    propertyType: Property['propertyType'];
    listingType: Property['listingType'];
    status: Property['status'];
    price: number | null; // null if includePrice is false
    negotiable: boolean;
    area: number;
    areaUnit: string;
    locality: string;
    city: string;
    address: string;
    images: string[];
    mapsUrl?: string;
    coordinates?: PlotCoordinate;
    plotBoundary?: PlotBoundaryPoint[];
    plotDetails?: PlotDetails;
    villaDetails?: VillaDetails;
    apartmentDetails?: ApartmentDetails;
    infrastructure?: Record<string, any>;
    highlights?: string[];
  };

  agencyName: string;
  agencyPhone: string;
  agencyEmail?: string;
  agencyRera?: string;
  agencyLogo?: string;
  agentName: string;
  agentPhone: string;

  includePrice: boolean; // "Share amount or not?" -> If false, shows "Price on Request"
  includeLocation?: boolean; // "Share exact location & maps pin or not?"
  allowScreenshots: boolean; // Anti-screenshot & content protection
  enableWatermark: boolean; // Forensic tiled watermark
  
  expiresAt: number; // Unix timestamp ms
  durationHours: number; // e.g. 2, 6, 24, 48, 168
  status: 'active' | 'expired' | 'revoked';
  viewCount: number;
  lastViewedAt?: number;

  // Extension request workflow (capturing client Name & Mobile)
  extensionRequest?: {
    clientName: string;
    clientMobile: string;
    clientNotes?: string;
    requestedAt: number;
    status: 'pending' | 'approved' | 'rejected';
    resolvedAt?: number;
    resolvedBy?: string;
    grantedHours?: number;
  };

  createdAt: number;
  createdBy: string;
}

/**
 * Public Site Visit Booking from Shared Links
 * Enables prospective clients to request site visits with preferred timing,
 * and track confirmation/rescheduling in real time via /visit-status/:bookingId.
 */
export interface PublicSiteVisitBooking {
  id: string; // sv_xxxxxx
  tenantId: string;
  shareLinkId?: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyImage?: string;
  clientName: string;
  clientPhone: string;
  preferredDate: string; // e.g. '2026-11-25'
  preferredSlot: string; // e.g. 'Morning (9:00 AM - 12:00 PM)'
  notes?: string;
  agencyName: string;
  agencyPhone: string;
  assignedAgentName?: string;
  assignedAgentPhone?: string;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed';
  scheduledTime?: number;
  rescheduledReason?: string;
  createdAt: number;
  updatedAt: number;
}




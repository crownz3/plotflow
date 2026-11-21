# PlotFlow — Product & Technical Specification (spec.md)

**System Name:** PlotFlow (Multi-Tenant Real Estate Broker CRM & Property Management SaaS)  
**Target Runtimes:** Responsive Web App (PWA) + Native Android App (via Capacitor)  
**Architecture:** Multi-Tenant SaaS with strict subcollection data isolation  
**Stack:** Ionic Framework (v8/v9) + Angular 18/19 (100% Standalone Components) + Capacitor 8 + Firebase Modular SDK (Auth, Firestore, Storage)

---

## 1. Executive Summary & Vision

PlotFlow is an enterprise-grade, mobile-first SaaS platform designed specifically for independent real estate brokers, real estate agencies, and property management brokerages. 

### Core Value Propositions:
1. **True Cross-Platform Native Experience:** Runs from a single TypeScript/SCSS codebase as both a high-performance desktop web application (collapsible navigation drawer, multi-column grids, interactive Kanban board) and a native Android application (bottom navigation tabs, floating action buttons, native camera, and native push notifications).
2. **Ironclad Multi-Tenancy:** Complete physical separation of agency data via Firestore `tenants/{tenantId}` subcollection scoping, ensuring no broker agency can ever see or access another agency's inventory, leads, contacts, or financial books.
3. **Hyper-Local Indian & Global Market Alignment:** Native support for Indian property measurement units (Sq.ft, Cent, Acre, Ground, Guntha) and currency formats (₹ Lakhs & Crores) alongside international formats (USD, AED, EUR).
4. **Smart Property-to-Lead Matching:** Real-time algorithmic matching that pairs newly ingested property inventory with prospective buyer leads based on price tolerance, location proximity, and property typology.
5. **Privacy-Preserving Quick Sharing:** High-resolution branded property brochures generated client-side via `jspdf` + `html2canvas` that showcase agency branding and agent contact details while masking the private direct property owner details.
6. **Deal & Commission Ledger:** Comprehensive financial calculator and payment milestone tracker (Token Advance, Agreement, Registration) with brokerage split breakdown (Buyer %, Seller %, GST deduction, Agent commission payout).

---

## 2. Technical Stack & Architectural Standards

### 2.1 Core Frameworks & Libraries
- **Frontend Core:** Angular 18/19 (Standalone Components, Signals, Reactive RxJS, strictly typed TypeScript 5.5+).
- **Mobile & UI Toolkit:** `@ionic/angular` (Ionic 8/9 UI widgets, adaptive iOS/Material Design components).
- **Native Bridge:** Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/share`, `@capacitor/filesystem`, `@capacitor/camera`, `@capacitor/local-notifications`).
- **Backend & Database:** Firebase Web SDK v11/v12 (Modular tree-shakeable API: `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`).
- **Offline Data Storage:** Firestore `persistentLocalCache` with `persistentMultipleTabManager` (IndexedDB persistence) enabling offline inventory browsing in remote areas with zero cell reception.
- **Client-Side Media & PDF Generation:**
  - `browser-image-compression` (Lossless mobile image compression before cloud upload).
  - `jspdf` & `jspdf-autotable` (Branded tabular ledgers and PDF generation).
  - `html2canvas` (High-fidelity visual card brochure rasterization).
- **Typography & Icons:** Roboto / Plus Jakarta Sans font family; Ionicons v8+.

### 2.2 Design System: Google Material Design 3 (Material You Style)
- **Canvas / Background:** `#F8F9FA` (Clean, modern, airy off-white).
- **Surface Elevation Cards:** `#FFFFFF` with `1px solid #E2E8F0` border and `0 2px 8px -2px rgba(0, 0, 0, 0.04)` soft elevation.
- **Primary Color:** Google Blue `#1A73E8` (Hover `#1765CC`, Active `#1558B0`, Tint `#E8F0FE`).
- **Semantic Status Accents:**
  - **Success (Sold / Closed Won / Available):** `#1E8E3E` (Tint `#E6F4EA`, Border `#CEEAD6`).
  - **Warning (Under Offer / In Negotiation):** `#F9AB00` (Tint `#FEF7E0`, Border `#FEEFC3`).
  - **Danger (Urgent / Overdue / Closed Lost):** `#D93025` (Tint `#FCE8E6`, Border `#FAD2CF`).
  - **Info (Scheduled / Contacted):** `#1A73E8` (Tint `#E8F0FE`, Border `#D2E3FC`).
- **Responsive Navigation Adaptation:**
  - **Desktop / Large Web Viewport (`min-width: 992px`):** Collapsible 260px Left Navigation Drawer + Top Global Search/Action Bar + Multi-column content layouts.
  - **Mobile / Android Viewport (`max-width: 991px`):** 5-destination bottom navigation tab bar (Dashboard, Properties, Leads, Agenda, More) + Floating Action Button (FAB).

---

## 3. Data Architecture & Multi-Tenant Firestore Schema

### 3.1 Hierarchy Overview

```text
/users/{userId}                         (Global user metadata & tenant reference)
/tenants/{tenantId}                     (Agency Organization record)
  ├── properties/{propertyId}          (Agency property inventory)
  ├── leads/{leadId}                   (Buyer & tenant prospects)
  ├── site_visits/{visitId}            (Inspection appointments & reminders)
  ├── deals/{dealId}                   (Closed/Pending transaction ledger)
  ├── expenses/{expenseId}             (Marketing & agency overheads)
  ├── agents/{agentId}                 (Sub-brokers & team members)
  └── settings/agency                  (Branding, logo, RERA, default units)
```

### 3.2 Data Models Specification

#### User Record (`users/{userId}`)
```typescript
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  tenantId: string;
  role: 'super_admin' | 'agency_admin' | 'agent';
  isActive: boolean;
  assignedPropertyIds?: string[];
  createdAt: number;
  lastLoginAt: number;
}
```

#### Tenant Record (`tenants/{tenantId}`)
```typescript
export interface Tenant {
  id: string;
  agencyName: string;
  ownerUid: string;
  reraNumber?: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  currency: 'INR' | 'USD' | 'AED' | 'EUR';
  defaultAreaUnit: 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha';
  subscriptionPlan: 'trial' | 'starter' | 'pro' | 'enterprise';
  trialExpiresAt: number;
  createdAt: number;
  updatedAt: number;
}
```

#### Property Record (`tenants/{tenantId}/properties/{propertyId}`)
```typescript
export interface Property {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  propertyType: 'apartment' | 'villa' | 'plot' | 'commercial' | 'agricultural' | 'penthouse';
  listingType: 'sale' | 'rent' | 'lease';
  status: 'available' | 'under_offer' | 'sold' | 'rented';
  price: number;
  pricePerUnitArea?: number;
  negotiable: boolean;
  maintenanceFee?: number;
  area: number;
  areaUnit: 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha';
  bhk?: '1BHK' | '2BHK' | '3BHK' | '4BHK' | '5BHK+';
  bathrooms?: number;
  facing?: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West';
  furnishingStatus?: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
  location: {
    address: string;
    city: string;
    locality: string;
    landmark?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    mapUrl?: string;
  };
  amenities: string[];
  images: string[];
  floorPlanUrl?: string;
  ownerDetails: {
    name: string;
    phone: string;
    email?: string;
    expectedPrice?: number;
    privateNotes?: string;
  };
  assignedAgentId?: string;
  assignedAgentName?: string;
  tags?: string[];
  featured?: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
```

#### Lead Record (`tenants/{tenantId}/leads/{leadId}`)
```typescript
export type LeadStage = 'new' | 'contacted' | 'visit_scheduled' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  source: 'walk_in' | 'portal_99acres' | 'portal_magicbricks' | 'referral' | 'social_media' | 'direct_call' | 'website';
  stage: LeadStage;
  priority: 'hot' | 'warm' | 'cold';
  requirement: {
    propertyTypes: ('apartment' | 'villa' | 'plot' | 'commercial' | 'agricultural' | 'penthouse')[];
    listingType: 'sale' | 'rent' | 'lease';
    budgetMin: number;
    budgetMax: number;
    preferredLocations: string[];
    minArea?: number;
    bhkPreferences?: string[];
  };
  assignedAgentId?: string;
  assignedAgentName?: string;
  lastContactedAt?: number;
  nextFollowUpAt?: number;
  notes: {
    id: string;
    text: string;
    createdAt: number;
    createdBy: string;
    authorName: string;
  }[];
  matchedPropertyCount?: number;
  createdAt: number;
  updatedAt: number;
}
```

#### Site Visit Record (`tenants/{tenantId}/site_visits/{visitId}`)
```typescript
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
  scheduledTime: number; // Unix timestamp ms
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  feedback?: string;
  clientRating?: number; // 1 to 5
  notificationScheduled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### Deal & Financial Ledger (`tenants/{tenantId}/deals/{dealId}`)
```typescript
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
  paymentMilestones: {
    id: string;
    name: 'token_advance' | 'agreement_signing' | 'registration' | 'possession';
    amount: number;
    dueDate?: number;
    paidDate?: number;
    status: 'pending' | 'received';
    referenceNumber?: string;
  }[];
  totalReceived: number;
  balanceReceivable: number;
  closingDate: number;
  status: 'draft' | 'under_process' | 'closed_paid' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}
```

#### Agency Expense Record (`tenants/{tenantId}/expenses/{expenseId}`)
```typescript
export interface Expense {
  id: string;
  tenantId: string;
  title: string;
  category: 'marketing' | 'travel_fuel' | 'office_rent' | 'portal_listing_fee' | 'legal_documentation' | 'miscellaneous';
  amount: number;
  date: number;
  relatedDealId?: string;
  loggedBy: string;
  receiptUrl?: string;
  createdAt: number;
}
```

---

## 4. Functional Modules & Implementation Details

### Module A: Executive Dashboard & Analytics
- **Live KPI Counter Cards:** Total Active Listings, Hot Leads, Upcoming Site Visits (Today & This Week), Brokerage Earned This Month, Pending Receivables.
- **Visual Lead-to-Deal Conversion Funnel:** Real-time breakdown of prospects moving from *New -> Contacted -> Site Visit -> Negotiation -> Closed Won*.
- **"Today's Agenda" Action Center:** Real-time feed of today's site visits and overdue follow-up calls with instant `tel:` (Call) and `wa.me/` (WhatsApp) triggers.

### Module B: Property & Inventory Management
- **Property Ingestion Wizard:** Clean 3-step wizard with automatic currency/area unit parsing.
- **Image Compression Pipeline:** Compresses multiple high-resolution photos on device down to < 300KB each before sending to Firebase Storage.
- **Privacy-First Brochure Generator (`jspdf` + `html2canvas`):**
  - Renders a branded PDF containing the agency logo, RERA number, property specs, photo gallery, amenities grid, and assigned agent contact.
  - Masks owner contact information completely to protect broker commission bypass.
  - Native Android Share sheet (`@capacitor/share`) allows direct forwarding into client WhatsApp chats.

### Module C: Broker CRM & Lead Management
- **Kanban Board (Desktop):** Drag-and-drop cards between lead stages with instant Firestore status sync.
- **Swipeable Segment List (Mobile):** Filter by stage, priority (Hot, Warm, Cold), and assigned agent.
- **Smart Property Matching Engine:**
  - Evaluates:
    1. `budgetMin <= property.price <= budgetMax` (with 10% flexible negotiation window)
    2. `property.location.locality` matching `lead.preferredLocations`
    3. `property.propertyType` within `lead.propertyTypes`
  - Instantly outputs a scored "Matched Inventory" drawer inside the lead details modal.

### Module D: Site Visits & Push Reminders
- Schedule visit linking Lead, Property, and Agent.
- Integrates with `@capacitor/local-notifications` to schedule an alarm 30 minutes before appointment.
- Mobile push notification provides client name, phone number, and location address with one tap to open Google Maps navigation.

### Module E: Commission, Deal & Expense Ledger
- Interactive deal calculation wizard:
  $$\text{Gross Brokerage} = (\text{Deal Value} \times \text{Buyer \%}) + (\text{Deal Value} \times \text{Seller \%})$$
  $$\text{GST Amount} = \text{Gross Brokerage} \times \text{GST \%}$$
  $$\text{Agent Payout} = (\text{Gross Brokerage} - \text{GST Amount}) \times \text{Agent Commission \%}$$
  $$\text{Net Agency Profit} = \text{Gross Brokerage} - \text{GST Amount} - \text{Agent Payout}$$
- Real-time P&L summary factoring in marketing and portal expenses.

### Module F: Team & Agency Settings
- Sub-agent invitation via email & unique agency join codes.
- Agency custom branding (Logo, RERA Registration, Office Phone, Brokerage Footer).

---

## 5. Security & Multi-Tenancy Rules

Strict Firestore security rules enforce:
- Every query must match the user's authentic `tenantId`.
- Super-Admin internal support impersonation token operates at service level without exposing public flags.
- Agents can never delete properties or view agency-wide profit ledgers.


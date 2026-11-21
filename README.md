# 🏡 PlotFlow — Multi-Tenant Real Estate Broker CRM & SaaS

> **Modern, mobile-first CRM and property management platform designed for independent brokers, agencies, and real estate enterprises.**

![Angular 18](https://img.shields.io/badge/Angular-18-DD0031.svg?style=flat&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?style=flat&logo=typescript)
![Ionic](https://img.shields.io/badge/Ionic-8-3880FF.svg?style=flat&logo=ionic)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF.svg?style=flat&logo=capacitor)
![Firebase](https://img.shields.io/badge/Firebase-v11-FFCA28.svg?style=flat&logo=firebase)
![Playwright](https://img.shields.io/badge/Playwright-32%2F32%20Passing-45ba4b.svg?style=flat&logo=playwright)
![Hosting](https://img.shields.io/badge/Live-plotflow--crm.web.app-blue.svg)

---

## 🌟 Key Features

1. **Full-Stack Multi-Tenancy:**
   - Physical data isolation per tenant with subcollection architecture (`/tenants/{tenantId}/...`).
   - Role-Based Access Control (RBAC): Platform Super Admin, Agency Admin (Principal Broker), and Associate Agent.
   - Direct property owner contact privacy masking for associate brokers.

2. **Core Brokerage Workflows:**
   - **Properties Inventory:** Complete CRUD with filtering by category (Apartments, Villas, Plots, Commercial), area calculations, and high-resolution PDF brochure export.
   - **Leads & Pipeline CRM:** Interactive Kanban pipeline (New, Contacted, Visit Scheduled, Negotiation, Closed Won/Lost), Smart Property-to-Lead Matcher, and click-to-WhatsApp direct pitch.
   - **Site Visits & Appointments:** Inspection scheduler, calendar tracking, status updates, and client feedback logging.
   - **Deals & Commission Ledger:** Interactive financial calculator (deal value, buyer/seller splits, GST deduction, agent commission payout), payment milestone tracking, and celebration effects.
   - **Settings & Agency Team Management:** White-label customization, team member invites restricted to verified Google Mail accounts (`@gmail.com`).

3. **Super Admin White-Label Branding:**
   - Real-time global brand name and tagline customization.
   - Live preview and instant persistence across all pages and exported brochures.

4. **Production Cloud Backend:**
   - **Database:** Google Cloud Firestore with native composite indexing and production-grade security rules.
   - **Authentication:** Google Authentication with domain verification hint and Google Mail restriction.
   - **Hosting:** Firebase Hosting with global CDN.

---

## 📱 Architecture & Tech Stack

- **Frontend Core:** Angular 18 (Standalone Components, Signals, strictly typed TypeScript 5.5+)
- **Cross-Platform:** Ionic 8 + Capacitor 8 (Responsive Desktop Workspace + Mobile Android PWA/Native)
- **Backend:** Firebase Web SDK v11 (Firestore, Auth, Hosting)
- **Document Generation:** `jspdf` + `html2canvas` client-side brochure rasterization
- **Testing:** Playwright E2E test suite (100% pass across Desktop Chromium & Mobile Pixel 7)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
# Clone the repository
git clone https://github.com/crownz3/plotflow.git
cd plotflow

# Install dependencies
npm install

# Start development server
npm start
```
Navigate to `http://localhost:4200` in your browser.

### Running End-to-End Tests

```bash
npx playwright test
```

### Production Build & Deploy

```bash
# Build production bundle
npm run build:prod

# Deploy to Firebase
firebase deploy --project plotflow-crm
```

---

## 🔒 Security & Guardrails

- Cloud Firestore security rules strictly enforce tenant isolation and role permissions.
- Direct property owner personal contact info is visible only to Principal Brokers.
- All tenant registrations and team invites require verified `@gmail.com` addresses.
- Super Admin operations restricted to designated platform owner (`mohamedibrahim040125@gmail.com`).

---

## 📄 License
Private & Proprietary — All Rights Reserved.

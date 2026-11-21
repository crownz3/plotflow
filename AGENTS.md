# Agent Context & Engineering Guidelines: PlotFlow

This document sets the operational constraints, architectural standards, and development rules for any AI agent or software engineer contributing to the **PlotFlow (Multi-Tenant Real Estate Broker CRM)** codebase.

---

## 1. Technology Stack Constraints

- **Framework:** Angular 18+ and Ionic Framework 8+.
- **Component Architecture:** Every Angular component MUST be a **100% Standalone Component** (`standalone: true`). Under no circumstances should Angular `NgModule`s be created or imported.
- **State Management:** Prioritize **Angular Signals** (`signal`, `computed`, `effect`) for synchronous and local component state, combined with **RxJS Observables** for asynchronous Firebase real-time listeners (`collectionData`, `docData`).
- **File Structure:** Enforce strict file separation. Every component and page MUST have its own `.ts`, `.html`, and `.scss` files. **Never inline templates or styles** into the `@Component` decorator.
- **Strict Typing:** TypeScript strict mode is enabled. Do not use `any` unless interacting with untyped 3rd-party binary buffers. All entities must adhere strictly to `spec.md` interfaces.

---

## 2. Multi-Tenancy & Data Isolation Rules

- **Zero Cross-Tenant Leakage:** Every Firestore read, write, query, and listener MUST be scoped to the active tenant path:
  ```text
  /tenants/{tenantId}/{collectionName}
  ```
- **Tenant Context Service:** Every data service must inject `TenantService` to retrieve the current reactive `tenantId`. Never hardcode or assume a default tenant ID.
- **Data Integrity:** When creating records, always stamp `tenantId`, `createdBy`, `createdAt: Date.now()`, and `updatedAt: Date.now()`.
- **Support Impersonation Guardrail:**
  The platform includes an internal support mechanism allowing authorized support administrators to inspect a tenant context for technical assistance. **Do not mention, advertise, or display "Impersonate" labels in customer-facing UI, marketing copies, or public user manuals.** Implement this silently within `TenantService` / `AuthService` state management.

---

## 3. UI/UX & Google Material You Standards

- **Visual Aesthetic:** Strictly follow Google Material Design 3 / Material You styling (matching `bayt-al-mal`):
  - Canvas background: `#F8F9FA`
  - Elevated surface cards: `#FFFFFF` with `1px solid #E2E8F0` and subtle elevation
  - Primary Action / Accent: Google Blue `#1A73E8`
  - Soft Hover / Selected State: `#E8F0FE`
- **Typography:** Force `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` globally.
- **Semantic Status Pills:** Always use consistent semantic color tokens:
  - Available / Closed Won: Green (`#1E8E3E` on `#E6F4EA`)
  - Negotiation / Under Offer: Amber (`#F9AB00` on `#FEF7E0`)
  - Urgent / Overdue / Lost: Red (`#D93025` on `#FCE8E6`)
- **Responsive Layout Adaptation:**
  - On desktop (`min-width: 992px`): Left collapsible drawer + top bar + multi-column grid / Kanban.
  - On mobile (`max-width: 991px`): Fixed bottom tab bar (5 destinations) + prominent Floating Action Button (FAB).
- **Safe Area Padding:** Always include `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to prevent content clipping behind native Android notches and navigation bars.

---

## 4. Native & Web Parity (Capacitor Guidelines)

- **Universal Device Handling:** Never assume native device hardware exists. Always check `Capacitor.isNativePlatform()`:
  - If Native (Android): Use `@capacitor/share`, `@capacitor/filesystem`, `@capacitor/camera`, and `@capacitor/local-notifications`.
  - If Web Browser: Provide seamless web fallbacks (HTML5 File picker, direct PDF download, Web Share API or clipboard copy, browser notifications).
- **Client-Side Image Optimization:** Real estate brokers upload raw 10MB+ phone camera photos. Always compress images on device using `browser-image-compression` (< 300KB, max 1600px width) before transmitting to Firebase Storage.
- **Brochure Exporting:** Always utilize the client-side `jspdf` + `html2canvas` pipeline to generate brochures and deal receipts locally without requiring server-side headless browsers.

---

## 5. Offline Resilience & Caching

- Cloud Firestore MUST be initialized with IndexedDB offline persistence:
  ```typescript
  initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  ```
- Brokers visiting remote plots or basement construction sites frequently lose cellular reception. The app must allow uninterrupted inventory reading and lead viewing when offline.

---

## 6. Code Quality & Modularity

- Services belong in `core/services/` and must be singletons (`providedIn: 'root'`).
- Shared UI components belong in `shared/components/`.
- Currency and Area formatters MUST be encapsulated inside Angular Pipes (`currencyFormatPipe`, `areaUnitPipe`).
- Avoid giant 1,000-line monolithic files; split complex forms into sub-steps or reusable modal components.


# PlotFlow End-to-End Manual Testing Checklist & Dummy Dataset

This document provides a **step-by-step testing roadmap** for verifying all core capabilities of **PlotFlow (Multi-Tenant Real Estate Broker CRM)**. 

Each test case contains pre-formatted, realistic dummy data ready to copy and paste. As you complete each verification step, mark the checkbox from `[ ]` to `[x]`.

---

## Quick Navigation
- [Module 1: Agency Onboarding & Approval](#module-1-agency-onboarding--super-admin-approval)
- [Module 2: Property Inventory & 2D/3D Plot Mapping](#module-2-property-inventory--2d3d-plot-mapping)
- [Module 3: PDF Brochure & Client Share](#module-3-pdf-brochure--client-pitch)
- [Module 4: Leads CRM & Buyer Pipeline](#module-4-leads-crm--buyer-pipeline)
- [Module 5: Site Visits & Buyer Concern Retargeting](#module-5-site-visits--buyer-concerns)
- [Module 6: Deals Ledger & Commission Splits](#module-6-deals-ledger--commission-splits)
- [Module 7: Agency Financials & Expense Tracking](#module-7-agency-financials--expense-tracking)
- [Module 8: Super Admin Console & Subscription Management](#module-8-super-admin-console--plan-management)

---

## Module 1: Agency Onboarding & Super Admin Approval

### 1.1 New Agency Registration
- [ ] Navigate to `/onboarding` in your browser.
- [ ] Fill in the registration form with the following dummy data:
  ```text
  Agency Organization Name: Royal Crest Realty
  Admin Work Email: royalcrest.broker@gmail.com
  Phone Number: +91 98401 23456
  RERA Registration Number: TN/01/AGENT/2026/8899
  Operating Territory / City: Tirunelveli
  Office Address: 45 South Bypass Road, Vannarpettai, Tirunelveli - 627003
  Team Size: 5-10 Agents
  Subscription Tier: Pro Agency
  ```
- [ ] Click **"Complete Onboarding & Submit License"**.
- [ ] Verify you are routed to `/pending-approval`.
- [ ] Confirm the screen displays:
  - *"Brokerage Verification In Progress"*
  - The submitted agency credentials card with RERA Number `TN/01/AGENT/2026/8899`.
  - Reviewer note showing Super Admin review queue.
  - No empty or blank cards.

### 1.2 Super Admin Review & Approval
- [ ] Log in or switch to the **Super Admin** console (`super_admin` role).
- [ ] Navigate to `/dashboard` (Super Admin Console).
- [ ] Verify that **Royal Crest Realty** appears in the **Pending Brokerage Onboarding Approvals** priority card.
- [ ] Click **"✓ Accept & Activate Brokerage"** (or **"✓ Accept"** in the table).
- [ ] Confirm the **Material You Confirmation Dialog** opens:
  - Title: *Approve Agency Onboarding*
  - Message: *"Are you sure you want to approve and activate Royal Crest Realty?..."*
  - Action button: *Approve & Activate* (Green).
- [ ] Click **"Approve & Activate"**.
- [ ] Confirm a success toast appears and the pending count decrements.
- [ ] Switch back to the agency window or inspect the agency context:
  - Confirm the waiting room automatically detects approval, fires celebratory confetti, and routes to `/dashboard`.
  - Confirm the sidebar displays **Royal Crest Realty**.

---

## Module 2: Property Inventory & 2D/3D Plot Mapping

### 2.1 Add New Residential Plot Listing
- [ ] Navigate to **Properties** (`/properties`).
- [ ] Click **"+ Add New Property"**.
- [ ] Paste the following dummy property information:
  ```text
  Property Title: Green Valley Premium Villa Plots
  Property Type: Plot
  Listing Type: Sale
  Price: 1800000 (₹18 Lakhs)
  Negotiable: Checked [x]
  Area: 2400
  Area Unit: sqft (Automatically displays dynamic conversion hint: "≈ 5.51 Cents (approx. 1.00 Ground / 0.055 Acres)")
  Locality: Palayamkottai
  City: Tirunelveli
  Address: Near High Ground Water Tank, Palayamkottai
  ```
- [ ] **Plot Specific Details**:
  ```text
  Plot Dimensions: 40 x 60
  Frontage Road Width: 30
  Approval Authority: DTCP Approved, RERA Registered (Multi-Select)
  Corner Plot: Checked [x]
  Boundary Wall Constructed: Checked [x]
  Inside Gated Layout: Checked [x]
  Soil / Ground Type: Red Loamy Soil
  ```
- [ ] **On-Site Infrastructure & Amenities (Multi-Select)**:
  - Select: `24/7 Gated Security & CCTV`
  - Select: `30ft/40ft Wide Blacktop Road`
  - Select: `Underground Sewage Drainage`
  - Select: `Copious Borewell Water`
  - Select: `Solar Street Lighting`
- [ ] **Owner Details (Privacy Guarded)**:
  ```text
  Owner Name: Sundaram Pillai
  Owner Phone: +91 94431 55667
  Owner Expected Price: 1750000
  Private Confidential Notes: Direct owner mandate, documents verified with VAO.
  ```

### 2.2 Interactive 2D Map & Boundary Polygon Marking
- [ ] In the property creation form, locate the **Interactive Plot Location & 2D/3D Boundary** map viewer.
- [ ] Click **"Center on City"** or drag to prime land.
- [ ] Click the **"Mark Plot Boundary"** tool button.
- [ ] Click 4 or 5 points on the satellite map to draw the plot perimeter.
- [ ] Verify that:
  - A blue polygon fills the marked plot area.
  - Edge dimension badges appear (e.g., `40 ft`, `60 ft`) along the perimeter.
  - The bottom pill displays real-time calculated area: `Marked: ~2,400 sq.ft (~5.51 cents)`.
  - The corner counter pill updates (e.g., `✓ 4-Corner Mapped`).
- [ ] Click **"Save & Publish Property"**.
- [ ] Confirm property appears in the inventory grid with:
  - `Available` pill with green background.
  - `PLOT • SALE` badge.
  - `2D/3D Mapped` icon badge.
  - `DTCP Approved` and `40 x 60 ft` pills.

### 2.3 Saved Property Boundary Auto-Centering
- [ ] Click on the newly created **Green Valley Premium Villa Plots** card.
- [ ] The Property Dossier modal opens.
- [ ] Scroll to **"Site Boundary & Spatial Layout (2D & 3D)"**.
- [ ] **Verification**: Confirm the map **automatically centers** on the marked boundary polygon without requiring you to drag or hunt for the land.
- [ ] Toggle **"Hide Labels"** / **"Show Labels"** to verify edge distance tooltips toggle on/off cleanly.
- [ ] Toggle **"3D Layout"** to verify perspective preview mode.
- [ ] **Confidential Broker Notes (Dialog Bottom)**:
  - Scroll to the bottom of the Property Dossier dialog.
  - Verify the **"Confidential Agency & Negotiation Notes"** card appears at the end.
  - Confirm private notes (`Direct owner mandate, documents verified with VAO.`) are displayed with owner contact and expected price.
  - Confirm it is marked `Internal Only • Hidden from Public`.

---

## Module 3: PDF Brochure & Client Pitch

### 3.1 Brochure Generation
- [ ] In the property card or detail modal, click the **"PDF"** / **"Share"** button.
- [ ] Select **"Download Official PDF Brochure"**.
- [ ] Open the downloaded PDF file.
- [ ] **Verify PDF Visual Layout**:
  - [ ] Header banner displays agency name: `Royal Crest Realty`.
  - [ ] Price displays clean currency: `Price: Rs. 18.00 Lakhs (Negotiable)` without broken characters (no `1 18.00 Lakhs`).
  - [ ] Specifications table has 4 organized columns (Property Type, Area, Road Width, Approvals).
  - [ ] Dual-unit area format: `2,400 Sq.ft (5.51 Cents)`.
  - [ ] Verified on-site infrastructure bullet points appear.
  - [ ] No overlapping text between headings and description.
  - [ ] Agent relationship contact footer card is cleanly positioned at the bottom.

### 3.2 Instant WhatsApp Pitch
- [ ] In the Share dialog, click **"Copy WhatsApp Pitch"**.
- [ ] Paste into a text editor or chat and verify:
  - Formatted bold title, price, DTCP approvals, and Google Maps pin link.
  - Professional real estate broker pitch ready to send to prospective buyers.

---

## Module 4: Leads CRM & Buyer Pipeline

### 4.1 Add Prospective Buyer Leads
- [ ] Navigate to **Leads CRM** (`/leads`).
- [ ] Click **"+ Add New Lead"**.
- [ ] Enter Dummy Lead 1:
  ```text
  Client Full Name: Dr. Rajesh Kumar
  Phone Number: +91 98940 11223
  Email: rajesh.k@gmail.com
  Budget: 2000000 (₹20 Lakhs)
  Preferred Location: Palayamkottai / High Ground
  Interested Property: Green Valley Premium Villa Plots
  Pipeline Stage: New Lead
  Source: WhatsApp Campaign
  Notes: Looking for east-facing plot for immediate villa construction.
  ```
- [ ] Click **"Save Lead"**.
- [ ] Add Dummy Lead 2:
  ```text
  Client Full Name: Anitha Balaji
  Phone Number: +91 97890 44556
  Budget: 1500000 (₹15 Lakhs)
  Preferred Location: Melapalayam / Bypass
  Pipeline Stage: Contacted
  Source: Referral
  Notes: Investment buyer seeking good capital appreciation.
  ```
- [ ] Click **"Save Lead"**.

### 4.2 Pipeline Drag & Drop / Stage Advancement
- [ ] In the Leads Kanban board, drag **Dr. Rajesh Kumar** from `New Lead` to `Site Visit Scheduled`.
- [ ] Confirm the stage pill updates with warning color (`Site Visit Scheduled`).
- [ ] Click the lead card to view quick details and verify matched properties.

### 4.3 AI Client Objection Handling
- [ ] Open **Dr. Rajesh Kumar**'s lead card.
- [ ] Click **"AI Objection Advisor"**.
- [ ] Enter a common buyer concern:
  - Objection Category: `Price / Budget Negotiation`
  - Buyer statement: *"Client is asking for 15% discount claiming another layout 1km away is cheaper."*
- [ ] Click **"Generate AI Strategy"**.
- [ ] Verify AI output generates structured counter-points highlighting:
  - DTCP & RERA legal safety vs unapproved layouts.
  - Gated blacktop road and underground drainage value proposition.
  - Ready-to-send WhatsApp reply script.

---

## Module 5: Site Visits & Buyer Concerns

### 5.1 Schedule an Inspection Visit
- [ ] Navigate to **Site Visits** (`/site-visits`).
- [ ] Click **"+ Schedule Site Visit"**.
- [ ] Fill in dummy inspection details:
  ```text
  Client Name: Dr. Rajesh Kumar
  Client Phone: +91 98940 11223
  Selected Property: Green Valley Premium Villa Plots
  Visit Date: Select Tomorrow
  Visit Time: 10:30 AM
  Meeting Point: Palayamkottai High Ground Signal
  Assigned Broker: Senior Advisor
  Notes: Client family visiting together, bring physical blueprint layout.
  ```
- [ ] Click **"Schedule Inspection"**.
- [ ] Confirm visit appears in **Today's / Upcoming Site Visits**.

### 5.2 Record Buyer Feedback & Categorized Concern
- [ ] On the scheduled visit card, click **"Log Feedback & Concerns"**.
- [ ] Select:
  - Visit Outcome: `Completed`
  - Buyer Concern Category: `Price / Budget`
  - Client Feedback: *"Family loved the red soil and 30ft road, but budget ceiling is ₹17 Lakhs."*
  - Mark: `Interested in Upcoming Nearby Projects` [x]
- [ ] Click **"Save Feedback"**.
- [ ] Navigate to **Dashboard** -> **Visitors & Concerns Hub** tab.
- [ ] Verify **Dr. Rajesh Kumar** appears under the filtered list with category badge `Price / Budget`.

---

## Module 6: Deals Ledger & Commission Splits

### 6.1 Create Closed Brokerage Deal
- [ ] Navigate to **Deals Ledger** (`/deals`).
- [ ] Click **"New Deal Calculator"**.
- [ ] Fill in the deal closing parameters:
  ```text
  Deal Title: Green Valley Plot #12 Sale Closing
  Property: Green Valley Premium Villa Plots
  Client: Dr. Rajesh Kumar
  Closing Transaction Value: 1750000 (₹17.5 Lakhs agreed final price)
  Buyer Brokerage: 2% (₹35,000)
  Seller Brokerage: 1% (₹17,500)
  GST Applicable: 18% (Checked [x])
  Agent Payout Split: 30% to associate broker
  Total Payment Received to date: 25000 (Token advance)
  Closing Date: Select Today
  Deal Status: Closed Won
  ```
- [ ] Click **"Record Deal in Ledger"**.
- [ ] **Verify Calculations in Financial Totals**:
  - [ ] Gross Brokerage: ₹52,500 (3% of ₹17.5L).
  - [ ] Net Agency Brokerage: Retained agency profit after 30% associate split.
  - [ ] Balance Receivable: Total brokerage minus ₹25,000 token received.
- [ ] Confirm the property **Green Valley Premium Villa Plots** now reflects `Sold` status.

---

## Module 7: Agency Financials & Expense Tracking

### 7.1 Record Operating & Property Marketing Expenses
- [ ] Navigate to **Dashboard** -> **Expenses & Net Profit** tab.
- [ ] Click **"+ Log New Expense"**.
- [ ] Add Dummy Expense 1:
  ```text
  Expense Title: Meta & Instagram Ads for Green Valley
  Category: Marketing & Ads
  Amount: 8500
  Associated Property: Green Valley Premium Villa Plots
  Notes: Targeted Palayamkottai doctors and NRI buyers.
  ```
- [ ] Click **"Record Expense"**.
- [ ] Add Dummy Expense 2:
  ```text
  Expense Title: Site Visit Fuel & Client Refreshments
  Category: Travel & Fuel
  Amount: 1800
  Associated Property: Green Valley Premium Villa Plots
  ```
- [ ] Click **"Record Expense"**.

### 7.2 Verify Agency P&L & Net Cash Flow
- [ ] Verify the KPI cards update dynamically:
  - **This Week's Property Expenses**: ₹10,300.
  - **Net Agency Profit**: Deal brokerage earnings minus recorded operating expenses.
  - **Receivable Balance**: Outstanding brokerage tokens.
- [ ] Confirm equal height across all KPI cards, 24px bottom space inside cards, and 32px bottom grid separation.

---

## Module 8: Super Admin Console & Plan Management

### 8.1 Plan Change Flow (Modal + Confirm Dialog)
- [ ] Switch to **Super Admin** view (`/dashboard`).
- [ ] Under **Registered Real Estate Agencies (Tenants)**, find **Royal Crest Realty**.
- [ ] In the **PLAN** column, click the **"Change"** button.
- [ ] The **Change Subscription Plan Modal** appears.
- [ ] Select **Enterprise Brokerage** (`₹24,999/mo`).
- [ ] Click **"Review & Confirm Plan"**.
- [ ] Confirm the **Material You Confirmation Dialog** opens:
  - Title: *Confirm Subscription Plan Change*
  - Message: *"Are you sure you want to change the subscription tier for Royal Crest Realty from PRO to ENTERPRISE?"*
  - Confirm Button: *Switch to ENTERPRISE* (Blue).
- [ ] Click **"Switch to ENTERPRISE"**.
- [ ] Confirm plan pill updates immediately to **`ENTERPRISE`** and syncs to Firestore.

### 8.2 Confirmation Dialog on Every Action
- [ ] **Inspect Action**:
  - Click **"Inspect"** -> Confirm dialog prompts: *"Are you sure you want to inspect Royal Crest Realty?..."* -> Cancel or Confirm.
- [ ] **+30d Extend Action**:
  - Click **"+30d Extend"** -> Confirm dialog prompts: *"Are you sure you want to grant a +30 days extension to Royal Crest Realty?..."* -> Confirm -> Verify validity increases.
- [ ] **Cancel Subscription Action**:
  - Click **"Cancel"** -> Confirm dialog prompts: *"Are you sure you want to cancel the subscription for Royal Crest Realty?..."* -> Confirm -> Verify badge changes to Amber/Red `Cancelled`.
- [ ] **Reactivate Action**:
  - Click **"Reactivate (+30d)"** -> Confirm dialog prompts: *"Are you sure you want to reactivate Royal Crest Realty with 30 days?..."* -> Confirm -> Verify restored to `Active & Approved`.
- [ ] **Delete Action**:
  - Click **"Delete"** -> Confirm dialog prompts: Red danger warning *"Are you sure you want to permanently DELETE Royal Crest Realty?..."* -> Test Cancel (modal closes without deletion).

---

## Testing Sign-Off Checklist

| Test Phase | Tested By | Date | Result (Pass / Fail) |
| :--- | :--- | :--- | :--- |
| **Module 1: Agency Onboarding & Approval** | | | [ ] PASS |
| **Module 2: 2D/3D Plot Mapping & Inventory** | | | [ ] PASS |
| **Module 3: PDF Brochure & WhatsApp Pitch** | | | [ ] PASS |
| **Module 4: Leads CRM & AI Objection Handling** | | | [ ] PASS |
| **Module 5: Site Visits & Buyer Retargeting** | | | [ ] PASS |
| **Module 6: Deals Ledger & Commission Splits** | | | [ ] PASS |
| **Module 7: Agency Financials & Expense Audit** | | | [ ] PASS |
| **Module 8: Super Admin Plan & Confirm Dialogs** | | | [ ] PASS |

---
*Created for PlotFlow Real Estate CRM Quality Assurance.*


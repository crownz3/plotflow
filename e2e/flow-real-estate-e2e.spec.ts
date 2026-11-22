import { test, expect } from '@playwright/test';

test.describe('Flow Real Estate (crowwzz3@gmail.com) — Complete Brokerage Lifecycle', () => {

  test('Step 1: Register New Brokerage Agency: Flow Real Estate (crowwzz3@gmail.com)', async ({ page }) => {
    await page.goto('/login');

    // Switch to Register Agency tab
    await page.click('button.auth-tab-btn:has-text("Register Agency")');
    await expect(page.locator('.step-badge')).toHaveText('Step 1 of 3');

    // Step 1: Agency Identity
    await page.fill('input[name="regAgencyName"]', 'Flow Real Estate');
    await page.fill('input[name="regBrokerName"]', 'Crowwzz Director');
    await page.click('button.stepper-next-btn:has-text("Continue")');

    // Step 2: Contact Information
    await expect(page.locator('.step-badge')).toHaveText('Step 2 of 3');
    await page.fill('input[name="regEmail"]', 'crowwzz3@gmail.com');
    await page.fill('input[name="regPhone"]', '+91 98765 43210');
    await page.click('button.stepper-next-btn:has-text("Continue")');

    // Step 3: Verification & Security
    await expect(page.locator('.step-badge')).toHaveText('Step 3 of 3');
    await page.fill('input[name="regReraNumber"]', 'TN/Agent/2026/001');
    await page.fill('input[name="regCity"]', 'Chennai');

    // Submit Application
    await page.click('button.submit-btn:has-text("Submit Application")');

    // Verify redirect to Pending Approval page with agency details
    await page.waitForURL('/pending-approval');
    await expect(page.locator('h1')).toContainText('Brokerage Verification');
    await expect(page.locator('.val').filter({ hasText: 'Flow Real Estate' })).toBeVisible();
    await expect(page.locator('text=crowwzz3@gmail.com')).toBeVisible();
  });

  test('Step 2: Platform Super Admin Review & Approval for Flow Real Estate', async ({ page }) => {
    // Seed pending Flow Real Estate tenant if not already present
    await page.addInitScript(() => {
      const existing = localStorage.getItem('pf_tenants');
      const list = existing ? JSON.parse(existing) : [];
      if (!list.some((t: any) => t.id === 'tenant_crowwzz3')) {
        list.push({
          id: 'tenant_crowwzz3',
          agencyName: 'Flow Real Estate',
          ownerUid: 'owner_crowwzz3',
          email: 'crowwzz3@gmail.com',
          phone: '+91 98765 43210',
          reraNumber: 'TN/Agent/2026/001',
          operatingCity: 'Chennai',
          address: 'Chennai Business Center',
          currency: 'INR',
          defaultAreaUnit: 'sqft',
          subscriptionPlan: 'pro',
          status: 'pending_approval',
          trialExpiresAt: Date.now() + 86400000 * 30,
          createdAt: Date.now()
        });
        localStorage.setItem('pf_tenants', JSON.stringify(list));
      }
    });

    await page.goto('/login');

    // Sign in as Platform Super Admin
    await page.fill('input[name="email"]', 'mohamedibrahim010425@gmail.com');
    await page.fill('input[name="password"]', 'SuperSecretPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');
    await expect(page.locator('.role-badge')).toHaveText('Super Admin Console');

    // Verify Flow Real Estate is in the approval cards or table and click approve
    const flowPendingCard = page.locator('.approval-card:has-text("Flow Real Estate")');
    if (await flowPendingCard.isVisible()) {
      await flowPendingCard.locator('button.approve-btn').click();
    } else {
      const approveBtn = page.locator('tr:has-text("Flow Real Estate") button:has-text("Accept")');
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
      }
    }

    // Verify Flow Real Estate is now marked Active & Approved in the directory
    await expect(page.locator('tr:has-text("Flow Real Estate")')).toContainText('Active & Approved');
  });

  test('Step 3: Sign In as Flow Real Estate Principal Broker (crowwzz3@gmail.com)', async ({ page }) => {
    // Seed approved active tenant so sign in succeeds regardless of test order
    await page.addInitScript(() => {
      const existing = localStorage.getItem('pf_tenants');
      const list = existing ? JSON.parse(existing) : [];
      const updated = list.filter((t: any) => t.id !== 'tenant_crowwzz3');
      updated.push({
        id: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        ownerUid: 'owner_crowwzz3',
        email: 'crowwzz3@gmail.com',
        phone: '+91 98765 43210',
        reraNumber: 'TN/Agent/2026/001',
        operatingCity: 'Chennai',
        address: 'Chennai Business Center',
        currency: 'INR',
        defaultAreaUnit: 'sqft',
        subscriptionPlan: 'pro',
        status: 'active',
        trialExpiresAt: Date.now() + 86400000 * 30,
        createdAt: Date.now()
      });
      localStorage.setItem('pf_tenants', JSON.stringify(updated));
    });

    await page.goto('/login');

    // Sign in using registered work email
    await page.fill('input[name="email"]', 'crowwzz3@gmail.com');
    await page.fill('input[name="password"]', 'FlowSecure2026!');
    await page.click('button[type="submit"]');

    // Verify successful authentication and redirection to Flow Real Estate Agency Admin Dashboard
    await page.waitForURL('/dashboard');
    await expect(page.locator('.tenant-name')).toHaveText('Flow Real Estate');
    await expect(page.locator('h1')).toHaveText('Flow Real Estate');
  });

  test('Step 4: Ingest and Manage Property Inventory (Flow Elite Enclave)', async ({ page }) => {
    // Seed approved tenant session for isolated fast execution
    await page.addInitScript(() => {
      const tenant = {
        id: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        ownerUid: 'owner_crowwzz3',
        phone: '+91 98765 43210',
        email: 'crowwzz3@gmail.com',
        address: 'Chennai Business Center',
        currency: 'INR',
        defaultAreaUnit: 'sqft',
        subscriptionPlan: 'pro',
        status: 'active',
        trialExpiresAt: Date.now() + 86400000 * 30,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const user = {
        uid: 'owner_crowwzz3',
        email: 'crowwzz3@gmail.com',
        displayName: 'Crowwzz Director',
        role: 'agency_admin',
        tenantId: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        isActive: true,
        onboardingCompleted: true,
        createdAt: Date.now()
      };
      localStorage.setItem('pf_user_session', JSON.stringify(user));
      localStorage.setItem('pf_tenants', JSON.stringify([tenant]));
      localStorage.setItem('pf_active_tenant_id', 'tenant_crowwzz3');
    });

    await page.goto('/properties');
    await expect(page.locator('.tenant-name')).toHaveText('Flow Real Estate');

    // Click Ingest New Property (use .first() to handle both header and empty state buttons)
    await page.locator('button:has-text("Ingest")').first().click();
    await expect(page.locator('h2:has-text("Ingest Verified Property Listing")')).toBeVisible();

    // Fill Property Details
    await page.fill('input[placeholder*="2400 Sq.ft"]', 'Flow Elite Enclave - Phase 1');
    await page.fill('input[placeholder="e.g. 18000000"]', '6500000');
    await page.fill('input[placeholder="e.g. 2400"]', '2400');
    await page.fill('input[placeholder*="Panaiyur, ECR"]', 'OMR Sholinganallur');
    await page.fill('input[placeholder="Owner Name"]', 'Karthik Subramanian');
    await page.fill('input[placeholder="+91 98..."]', '+91 98401 22334');

    // Publish listing
    await page.click('button:has-text("Publish Verified Listing")');

    // Verify property appears in inventory
    await expect(page.locator('h3.property-title:has-text("Flow Elite Enclave - Phase 1")').first()).toBeVisible();
  });

  test('Step 5: Capture Buyer Prospect Lead (Vikram Sundaram)', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        uid: 'owner_crowwzz3',
        email: 'crowwzz3@gmail.com',
        displayName: 'Crowwzz Director',
        role: 'agency_admin',
        tenantId: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        isActive: true,
        onboardingCompleted: true,
        createdAt: Date.now()
      };
      const tenant = {
        id: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        ownerUid: 'owner_crowwzz3',
        email: 'crowwzz3@gmail.com',
        status: 'active',
        trialExpiresAt: Date.now() + 86400000 * 30
      };
      localStorage.setItem('pf_user_session', JSON.stringify(user));
      localStorage.setItem('pf_tenants', JSON.stringify([tenant]));
      localStorage.setItem('pf_active_tenant_id', 'tenant_crowwzz3');
    });

    await page.goto('/leads');
    await page.locator('button:has-text("Lead"), button:has-text("Prospect")').first().click();
    await expect(page.locator('h2:has-text("Add New Buyer Prospect")')).toBeVisible();

    // Fill Prospect Details
    await page.fill('input[placeholder="e.g. Vikram Malhotra"]', 'Vikram Sundaram');
    await page.fill('input[placeholder="+91 98765 00000"]', '+91 98402 33445');
    await page.locator('.ef-form-group:has-text("Minimum Budget") input').fill('5000000');
    await page.locator('.ef-form-group:has-text("Maximum Budget") input').fill('7500000');
    await page.fill('input[placeholder="e.g. Adyar, Besant Nagar, ECR"]', 'OMR, Sholinganallur, ECR');

    await page.click('button:has-text("Save Prospect")');
    await expect(page.locator('text=Vikram Sundaram').first()).toBeVisible();
  });

  test('Step 6: Schedule Site Inspection Visit with Buyer Objection', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        uid: 'owner_crowwzz3',
        email: 'crowwzz3@gmail.com',
        displayName: 'Crowwzz Director',
        role: 'agency_admin',
        tenantId: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        isActive: true,
        onboardingCompleted: true
      };
      const tenant = {
        id: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        defaultLanguage: 'Tanglish',
        status: 'active',
        trialExpiresAt: Date.now() + 86400000 * 30
      };
      const lead = {
        id: 'lead_vs_01',
        tenantId: 'tenant_crowwzz3',
        name: 'Vikram Sundaram',
        phone: '+91 98402 33445',
        budget: 7000000,
        status: 'site_visit_scheduled',
        createdAt: Date.now()
      };
      const prop = {
        id: 'prop_flow_01',
        tenantId: 'tenant_crowwzz3',
        title: 'Flow Elite Enclave - Phase 1',
        price: 6500000,
        area: 2400,
        areaUnit: 'sqft',
        status: 'available',
        location: { locality: 'OMR Sholinganallur', city: 'Chennai' },
        createdAt: Date.now()
      };
      localStorage.setItem('pf_user_session', JSON.stringify(user));
      localStorage.setItem('pf_tenants', JSON.stringify([tenant]));
      localStorage.setItem('pf_active_tenant_id', 'tenant_crowwzz3');
      localStorage.setItem('pf_leads', JSON.stringify([lead]));
      localStorage.setItem('pf_properties', JSON.stringify([prop]));
    });

    await page.goto('/site-visits');
    await page.click('button:has-text("+ Schedule Site Visit")');
    await expect(page.locator('h2:has-text("Schedule New Site Visit")')).toBeVisible();

    // Confirm schedule
    await page.click('button:has-text("Confirm & Schedule")');
    await expect(page.locator('text=Vikram Sundaram')).toBeVisible();
  });

  test('Step 7: PlotFlow AI Studio — Multilingual WhatsApp Pitch, Matchmaker & Deal Coach', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        uid: 'owner_crowwzz3',
        email: 'crowwzz3@gmail.com',
        displayName: 'Crowwzz Director',
        role: 'agency_admin',
        tenantId: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        isActive: true,
        onboardingCompleted: true
      };
      const tenant = {
        id: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        defaultLanguage: 'Tanglish',
        status: 'active',
        trialExpiresAt: Date.now() + 86400000 * 30
      };
      const prop = {
        id: 'prop_flow_01',
        tenantId: 'tenant_crowwzz3',
        title: 'Flow Elite Enclave - Phase 1',
        propertyType: 'plot',
        price: 6500000,
        area: 2400,
        areaUnit: 'sqft',
        facing: 'East',
        status: 'available',
        location: { locality: 'OMR Sholinganallur', city: 'Chennai' },
        amenities: ['40ft Blacktop Roads', 'Underground Drainage', 'DTCP & RERA Approved']
      };
      const visit = {
        id: 'visit_01',
        tenantId: 'tenant_crowwzz3',
        leadName: 'Vikram Sundaram',
        leadPhone: '+91 98402 33445',
        propertyTitle: 'Flow Elite Enclave - Phase 1',
        propertyPrice: 6500000,
        propertyLocation: 'OMR Sholinganallur',
        status: 'completed',
        buyerConcernCategory: 'price_budget',
        buyerConcernNotes: 'Asking price is high compared to unapproved layouts',
        interestedInNextProject: true,
        nextProjectPreferences: { targetBudget: 6000000, preferredLocality: 'OMR' }
      };
      localStorage.setItem('pf_user_session', JSON.stringify(user));
      localStorage.setItem('pf_tenants', JSON.stringify([tenant]));
      localStorage.setItem('pf_active_tenant_id', 'tenant_crowwzz3');
      localStorage.setItem('pf_properties', JSON.stringify([prop]));
      localStorage.setItem('pf_visits', JSON.stringify([visit]));
    });

    await page.goto('/ai');

    // 1. WhatsApp Pitch Studio (uses agency default language)
    await expect(page.locator('h1')).toHaveText('Intelligent Real Estate Broker Assistant');
    await page.click('button.generate-ai-btn:has-text("Generate Pitch with PlotFlow AI")');

    // Verify marketing output with copy & WhatsApp buttons
    const pitchOutput = page.locator('.output-content-area pre');
    await expect(pitchOutput).toBeVisible({ timeout: 10000 });
    await expect(pitchOutput).toContainText('Flow Elite Enclave');

    const copyBtn = page.locator('.output-actions button.tool-btn:has-text("Copy")');
    await expect(copyBtn).toBeVisible();
    await expect(page.locator('.output-actions button.tool-btn.wa:has-text("Share on WhatsApp")')).toBeVisible();

    // 2. Buyer Matchmaker Tab
    await page.click('button.ai-tab-btn:has-text("Buyer Matchmaker")');
    const buyerItem = page.locator('.buyer-match-item:has-text("Vikram Sundaram")');
    await expect(buyerItem).toBeVisible();
    await buyerItem.click();

    const matchOutput = page.locator('.output-content-area pre');
    await expect(matchOutput).toBeVisible({ timeout: 10000 });
    await expect(matchOutput).toContainText('VIKRAM SUNDARAM');

    // 3. Objection Negotiation Coach Tab (uses configured agency language)
    await page.click('button.ai-tab-btn:has-text("Objection Negotiation Coach")');
    await page.click('button.generate-ai-btn:has-text("Generate Closing Battlecard")');

    const battlecardOutput = page.locator('.output-content-area pre');
    await expect(battlecardOutput).toBeVisible({ timeout: 10000 });
    await expect(battlecardOutput).toContainText('Psychological Validation & Reframe');
    await expect(battlecardOutput).toContainText('Word-for-Word Closing Script');
    await expect(page.locator('.output-actions button.tool-btn:has-text("Copy Battlecard")')).toBeVisible();
  });

  test('Step 8: Close Deal and Calculate Brokerage Commission in Deals Ledger', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        uid: 'owner_crowwzz3',
        email: 'crowwzz3@gmail.com',
        displayName: 'Crowwzz Director',
        role: 'agency_admin',
        tenantId: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        isActive: true,
        onboardingCompleted: true
      };
      const tenant = {
        id: 'tenant_crowwzz3',
        agencyName: 'Flow Real Estate',
        defaultLanguage: 'Tanglish',
        status: 'active',
        trialExpiresAt: Date.now() + 86400000 * 30
      };
      const prop = {
        id: 'prop_01',
        tenantId: 'tenant_crowwzz3',
        title: 'Flow Elite Enclave - Phase 1',
        price: 6500000,
        status: 'available',
        location: { locality: 'OMR Sholinganallur', city: 'Chennai' }
      };
      const lead = {
        id: 'lead_01',
        tenantId: 'tenant_crowwzz3',
        name: 'Vikram Sundaram',
        phone: '+91 98402 33445',
        budget: 7000000
      };
      localStorage.setItem('pf_user_session', JSON.stringify(user));
      localStorage.setItem('pf_tenants', JSON.stringify([tenant]));
      localStorage.setItem('pf_active_tenant_id', 'tenant_crowwzz3');
      localStorage.setItem('pf_properties', JSON.stringify([prop]));
      localStorage.setItem('pf_leads', JSON.stringify([lead]));
    });

    await page.goto('/deals');
    await page.locator('button:has-text("Close"), button:has-text("Deal")').first().click();

    // Fill Deal Form
    await page.fill('input[placeholder="e.g. 24500000"]', '6500000');

    // Verify calculated gross brokerage is shown in calculation card
    await expect(page.locator('.calculation-summary-card')).toBeVisible();

    // Close Deal
    await page.click('button:has-text("Finalize & Close Deal")');

    // Verify deal recorded in ledger (handles both desktop table and mobile card views)
    await expect(page.locator('.deal-item-card, .deals-table, .deals-card').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Property Deal Closing').first()).toBeVisible({ timeout: 10000 });
  });

});

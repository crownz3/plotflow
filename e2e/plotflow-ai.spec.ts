import { test, expect } from '@playwright/test';

test.describe('PlotFlow AI Studio & Contextual Assistance Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Inject active broker session and test tenant into localStorage
    await page.addInitScript(() => {
      const tenant = {
        id: 'tenant_prime',
        agencyName: 'Prime Realty & Brokerage',
        email: 'broker@primerealty.com',
        phone: '+91 98765 43210',
        status: 'active',
        subscriptionPlan: 'pro',
        trialExpiresAt: Date.now() + 30 * 86400000,
        createdAt: Date.now()
      };

      const user = {
        uid: 'user_broker_prime',
        email: 'broker@primerealty.com',
        displayName: 'Ahmad Broker',
        role: 'agency_admin',
        tenantId: 'tenant_prime',
        agencyName: 'Prime Realty & Brokerage',
        isActive: true,
        onboardingCompleted: true,
        createdAt: Date.now()
      };

      const properties = [
        {
          id: 'prop_test_01',
          tenantId: 'tenant_prime',
          title: 'Prime 1200 sqft Plot in OMR Corridor',
          propertyType: 'plot',
          price: 4500000,
          area: 1200,
          areaUnit: 'sqft',
          facing: 'East',
          negotiable: true,
          location: { locality: 'Thoraipakkam', city: 'Chennai' },
          amenities: ['40ft Blacktop Roads', 'Underground Drainage', 'Gated Layout'],
          createdBy: 'user_broker_prime',
          createdAt: Date.now()
        }
      ];

      const siteVisits = [
        {
          id: 'visit_test_01',
          tenantId: 'tenant_prime',
          leadId: 'lead_vikram',
          leadName: 'Vikram Sundaram',
          leadPhone: '+91 98888 77777',
          propertyId: 'prop_test_01',
          propertyTitle: 'Prime 1200 sqft Plot in OMR Corridor',
          propertyLocation: 'Thoraipakkam, Chennai',
          agentId: 'user_broker_prime',
          agentName: 'Ahmad Broker',
          scheduledTime: Date.now() - 86400000,
          status: 'completed',
          buyerConcernCategory: 'price_budget',
          buyerConcernNotes: 'Budget is strictly 40 Lakhs, refused to proceed at 45 Lakhs',
          interestedInNextProject: true,
          nextProjectPreferences: {
            targetBudget: 4000000,
            preferredLocality: 'OMR'
          },
          createdAt: Date.now() - 86400000
        }
      ];

      localStorage.setItem('pf_tenants', JSON.stringify([tenant]));
      localStorage.setItem('pf_user_session', JSON.stringify(user));
      localStorage.setItem('pf_active_tenant_id', 'tenant_prime');
      localStorage.setItem('pf_properties', JSON.stringify(properties));
      localStorage.setItem('pf_visits', JSON.stringify(siteVisits));
    });
  });

  test('should navigate to PlotFlow AI Studio from sidebar navigation or dashboard quick launcher', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.tenant-name')).toHaveText('Prime Realty & Brokerage');

    // Check viewport width (Mobile Android < 992px uses dashboard launcher; Desktop >= 992px uses sidebar)
    const isMobile = (page.viewportSize()?.width || 1280) < 992;
    if (isMobile) {
      const aiLauncher = page.locator('a.ai-sparkle-btn');
      await expect(aiLauncher).toBeVisible();
      await aiLauncher.click();
    } else {
      const aiNav = page.locator('a.ai-nav-item');
      await expect(aiNav).toBeVisible();
      await expect(aiNav).toContainText('PlotFlow AI');
      await expect(aiNav.locator('.ai-nav-pill')).toHaveText('PRO');
      await aiNav.click();
    }
    await page.waitForURL('/ai');

    // Verify AI Studio Header & Security Badge
    await expect(page.locator('h1')).toHaveText('Intelligent Real Estate Broker Assistant');
    await expect(page.locator('.ai-security-indicator')).toContainText('Zero Key Leakage');
  });

  test('should generate high-converting WhatsApp pitch from active property', async ({ page }) => {
    await page.goto('/ai');

    // Verify property preview summary renders
    await expect(page.locator('.property-preview-summary')).toBeVisible();
    await expect(page.locator('.property-preview-summary')).toContainText('45 L');
    await expect(page.locator('.property-preview-summary')).toContainText('1200 sqft');

    // Click "Generate Pitch with PlotFlow AI"
    const generateBtn = page.locator('button.generate-ai-btn');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify output area contains generated pitch
    const outputArea = page.locator('.output-content-area pre');
    await expect(outputArea).toBeVisible();
    await expect(outputArea).toContainText('EXCLUSIVE BROKERAGE LISTING');
    await expect(outputArea).toContainText('45,00,000');
    await expect(outputArea).toContainText('1200 sqft');

    // Verify action buttons (Copy and WhatsApp)
    await expect(page.locator('button.tool-btn:has-text("Copy")')).toBeVisible();
    await expect(page.locator('button.tool-btn.wa:has-text("Share on WhatsApp")')).toBeVisible();
  });

  test('should match dropped buyers to inventory in Buyer Matchmaker tab', async ({ page }) => {
    await page.goto('/ai');

    // Switch to Buyer Matchmaker tab
    await page.click('button.ai-tab-btn:has-text("Buyer Matchmaker")');

    // Verify dropped buyer appears in list
    const buyerCard = page.locator('.buyer-match-item:has-text("Vikram Sundaram")');
    await expect(buyerCard).toBeVisible();
    await expect(buyerCard).toContainText('price_budget');

    // Click to run AI match
    await buyerCard.click();

    // Verify match recommendations
    const outputArea = page.locator('.output-content-area pre');
    await expect(outputArea).toBeVisible();
    await expect(outputArea).toContainText('VIKRAM SUNDARAM');
    await expect(outputArea).toContainText('Compatibility Score');
  });

  test('should generate negotiation battlecard and provide styled copy button', async ({ page }) => {
    await page.goto('/ai');

    // Switch to Objection Coach tab
    await page.click('button.ai-tab-btn:has-text("Objection Negotiation Coach")');

    // Click Generate Battlecard
    const generateBtn = page.locator('button.generate-ai-btn:has-text("Generate Closing Battlecard")');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify battlecard output contains tactical closing sections in requested language
    const outputArea = page.locator('.output-content-area pre');
    await expect(outputArea).toBeVisible();
    await expect(outputArea).toContainText('Psychological Validation & Reframe');
    await expect(outputArea).toContainText('Word-for-Word Closing Script');

    // Verify styled copy button and WhatsApp button are visible with SVG icons
    const copyBtn = page.locator('.output-actions button.tool-btn:has-text("Copy Battlecard")');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn.locator('svg')).toBeVisible();

    const waBtn = page.locator('.output-actions button.tool-btn.wa:has-text("Share on WhatsApp")');
    await expect(waBtn).toBeVisible();
    await expect(waBtn.locator('svg')).toBeVisible();
  });

  test('should run live financial ROI audit in Financial Auditor tab', async ({ page }) => {
    await page.goto('/ai');

    // Switch to Financial Auditor tab
    await page.click('button.ai-tab-btn:has-text("Financial ROI Auditor")');

    // Click Run Live Audit
    await page.click('button:has-text("Run Live Audit")');

    // Verify executive audit recommendations render
    const outputArea = page.locator('.output-content-area pre');
    await expect(outputArea).toBeVisible();
    await expect(outputArea).toContainText('EXECUTIVE FINANCIAL & EXPENSE AUDIT');
    await expect(outputArea).toContainText('Actionable Broker Recommendations');
  });

  test('should trigger Contextual "Do you want to use AI?" Assistance Dialog from Dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify Dashboard AI Launcher Banner
    const aiBanner = page.locator('.ai-launcher-banner-card');
    await expect(aiBanner).toBeVisible();
    await expect(aiBanner).toContainText('PlotFlow AI Studio');

    // Click "Ask AI Deal Coach" on Dashboard
    await page.click('button:has-text("Ask AI Deal Coach")');

    // Verify Contextual AI Dialog pops up with sparkles icon
    const aiDialog = page.locator('.ai-dialog-card');
    await expect(aiDialog).toBeVisible();
    await expect(aiDialog.locator('h2')).toContainText('AI Deal Coach');
    await expect(aiDialog.locator('.prompt-question')).toContainText('Would you like PlotFlow AI to process this request');

    // Click "Yes, Generate with AI"
    await page.click('button.ai-sparkle-btn:has-text("Yes, Generate with AI")');

    // Verify result is generated directly inside the dialog
    const resultPre = page.locator('.ai-result-box pre');
    await expect(resultPre).toBeVisible();
    await expect(resultPre).toContainText('NEGOTIATION STRATEGY');

    // Verify copy & WhatsApp actions inside dialog
    await expect(page.locator('.ai-result-box button:has-text("Copy")')).toBeVisible();
    await expect(page.locator('.ai-result-box button:has-text("WhatsApp")')).toBeVisible();

    // Close dialog
    await page.click('button.close-btn');
    await expect(aiDialog).not.toBeVisible();
  });
});

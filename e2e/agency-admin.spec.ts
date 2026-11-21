import { test, expect } from '@playwright/test';

test.describe('Role: Agency Admin (Principal Broker)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Login as Agency Admin
    await page.click('button.demo-btn.agency-admin');
    await page.waitForURL('/dashboard');
  });

  test('should display executive KPI cards and Today Agenda', async ({ page }) => {
    await expect(page.locator('.role-badge')).toHaveText('Principal Broker Dashboard');
    await expect(page.locator('h1')).toContainText('Prime Properties & Realty');

    // Verify Executive KPI cards
    await expect(page.locator('text=Active Listings')).toBeVisible();
    await expect(page.locator('text=Hot Prospects')).toBeVisible();
    await expect(page.locator('text=Site Visits Scheduled')).toBeVisible();
    await expect(page.locator('text=Gross Brokerage Earned')).toBeVisible();
    await expect(page.locator('text=Net Agency Profit')).toBeVisible();

    // Verify Today's Agenda list
    await expect(page.locator("text=Today's Site Visits & Agenda")).toBeVisible();
    await expect(page.locator('a[title="Call Prospect"]').first()).toBeVisible();
    await expect(page.locator('a[title="Chat on WhatsApp"]').first()).toBeVisible();
  });

  test('should manage property inventory and trigger brochure export', async ({ page }) => {
    await page.click('a[routerLink="/properties"]:visible');
    await page.waitForURL('/properties');

    await expect(page.locator('h1')).toHaveText('Property Inventory');

    // Filter by Villas
    await page.click('button.filter-chip:has-text("Villas")');
    await expect(page.locator('text=Modern Gated Community Villa')).toBeVisible();

    // Add a new property
    await page.click('button:has-text("+ Add New Property")');
    await expect(page.locator('h2:has-text("Ingest New Property Listing")')).toBeVisible();

    await page.fill('input[placeholder*="Lake-View Apartment"]', 'Sea-Breeze Penthouse Besant Nagar');
    await page.fill('input[placeholder="e.g. 15000000"]', '21000000');
    await page.fill('input[placeholder="e.g. Adyar"]', 'Besant Nagar');
    await page.fill('input[placeholder="Owner Name"]', 'Captain Rajeshwar');

    await page.click('button:has-text("Publish Listing")');

    // Verify property appears in list
    await page.click('button.filter-chip:has-text("All")');
    await expect(page.locator('text=Sea-Breeze Penthouse Besant Nagar')).toBeVisible();

    // Trigger brochure generation
    const brochureBtn = page.locator('button:has-text("Brochure")').first();
    await expect(brochureBtn).toBeVisible();
    await brochureBtn.click();
  });

  test('should manage lead pipeline and close deal with confetti celebration', async ({ page }) => {
    await page.click('a[routerLink="/leads"]:visible');
    await page.waitForURL('/leads');

    await expect(page.locator('h1')).toHaveText('Broker CRM & Lead Pipeline');

    // Verify Kanban stage columns exist
    await expect(page.locator('.column-title:has-text("New Leads")')).toBeVisible();
    await expect(page.locator('.column-title:has-text("Contacted")')).toBeVisible();
    await expect(page.locator('.column-title:has-text("Visit Scheduled")')).toBeVisible();
    await expect(page.locator('.column-title:has-text("Negotiation")')).toBeVisible();

    // Open Deal Closing Calculator Modal
    await page.goto('/dashboard');
    await page.click('button:has-text("Close Deal & Calculator")');

    await expect(page.locator('h2:has-text("Deal Closing & Commission Calculator")')).toBeVisible();

    // Fill deal terms
    await page.fill('input[placeholder*="ECR Penthouse"]', 'Besant Nagar Sea-Breeze Closing');
    await page.fill('input[placeholder="e.g. 24500000"]', '21000000');

    // Verify calculation live updates
    await expect(page.locator('.calc-row.net-row')).toBeVisible();

    // Finalize deal & fire confetti!
    await page.click('button:has-text("Finalize & Close Deal")');

    // Verify confetti canvas was injected
    const confettiCanvas = page.locator('.confetti-canvas-overlay');
    await expect(confettiCanvas).toBeAttached();
  });
});

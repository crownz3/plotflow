import { test, expect } from '@playwright/test';

test.describe('Role: Agent (Associate Broker)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Login as Associate Agent
    await page.click('button.demo-btn.agent');
    await page.waitForURL('/dashboard');
  });

  test('should display agent personal KPIs and action queue', async ({ page }) => {
    await expect(page.locator('.role-badge')).toHaveText('Associate Broker Workspace');
    await expect(page.locator('h1')).toContainText('Arun Kumar');

    // Verify Agent Personal KPI cards
    await expect(page.locator('text=My Assigned Leads')).toBeVisible();
    await expect(page.locator('text=My Site Visits Today')).toBeVisible();
    await expect(page.locator('text=My Closed Deals')).toBeVisible();
    await expect(page.locator('text=My Commission Payout')).toBeVisible();

    // Verify Priority Call & Follow-up Queue
    await expect(page.locator('text=My Priority Call & Follow-up Queue')).toBeVisible();
    await expect(page.locator('a:has-text("📞 Call")').first()).toBeVisible();
    await expect(page.locator('a:has-text("💬 WhatsApp")').first()).toBeVisible();
  });

  test('should run smart property matching and suggest inventory for lead', async ({ page }) => {
    await page.click('a[routerLink="/leads"]:visible');
    await page.waitForURL('/leads');

    // Click Match button on first lead
    const matchBtn = page.locator('button.action-btn.match').first();
    await expect(matchBtn).toBeVisible();
    await matchBtn.click();

    // Verify Smart Matcher modal appears
    await expect(page.locator('h2:has-text("Smart Property Matcher")')).toBeVisible();
    await expect(page.locator('h3:has-text("Matching Inventory Suggestions")')).toBeVisible();

    // Pitch on WhatsApp button should be available
    const pitchBtn = page.locator('a:has-text("Pitch on WhatsApp")').first();
    await expect(pitchBtn).toBeVisible();
  });

  test('should schedule an inspection site visit and mark done', async ({ page }) => {
    await page.goto('/site-visits');
    await page.waitForURL('/site-visits');

    await expect(page.locator('h1')).toHaveText('Site Visits & Appointments');

    // Verify table of visits
    await expect(page.locator('text=Karthik Narayanan')).toBeVisible();

    // Mark Done
    const doneBtn = page.locator('button:has-text("✔ Mark Done")').first();
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();

    // Status pill should change to completed
    await expect(page.locator('app-status-pill:has-text("completed")').first()).toBeVisible();
  });
});

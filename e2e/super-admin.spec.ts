import { test, expect } from '@playwright/test';

test.describe('Role: Super Admin (Platform Owner)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'mohamedibrahim010425@gmail.com');
    await page.fill('input[name="password"]', 'SuperSecretPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display platform-wide SaaS metrics and tenant agencies', async ({ page }) => {
    // Verify Super Admin header
    await expect(page.locator('.role-badge')).toHaveText('Super Admin Console');
    await expect(page.locator('h1')).toHaveText('SaaS Platform Overview');

    // Verify Platform KPI cards
    await expect(page.locator('text=Total Brokerage Agencies')).toBeVisible();
    await expect(page.locator('text=Total Platform Listings')).toBeVisible();
    await expect(page.locator('text=Active Broker Agents')).toBeVisible();
    await expect(page.locator('text=System Health & Storage')).toBeVisible();

    // Verify Tenant Directory table contains registered brokerages
    await expect(page.locator('table').locator('text=Prime Properties & Realty')).toBeVisible();
    await expect(page.locator('table').locator('text=Apex Metro Realtors')).toBeVisible();
  });

  test('should allow silent support context switching to any tenant', async ({ page }) => {
    // Click "Switch Context" for Prime Properties
    const switchBtn = page.locator('button:has-text("Switch Context")').first();
    await expect(switchBtn).toBeVisible();
    await switchBtn.click();

    // Navbar should reflect active agency context
    const tenantBadge = page.locator('.tenant-badge');
    await expect(tenantBadge).toContainText('Prime Properties');
  });

  test('should allow Super Admin to change platform name globally in real-time', async ({ page }) => {
    // 1. Initial brand name check in navbar
    const brandName = page.locator('.brand-name');
    await expect(brandName).toBeVisible();

    // 2. Locate White-Label Platform Customization Card
    const brandingCard = page.locator('.branding-customizer-card');
    await expect(brandingCard).toBeVisible();
    await expect(brandingCard.locator('h2')).toContainText('White-Label Platform Customization');

    // 3. Update the Platform Name
    const nameInput = brandingCard.locator('input[name="platformNameInput"]');
    await nameInput.fill('PlotFlow Omni');
    const updateBtn = brandingCard.locator('button.save-brand-btn');
    await updateBtn.click();

    // 4. Verify immediate real-time update in navbar
    await expect(brandName).toHaveText('PlotFlow Omni');

    // 5. Verify live preview pill updates
    await expect(brandingCard.locator('.live-preview-pill')).toContainText('PlotFlow Omni');
    await expect(brandingCard.locator('.brand-alert.success')).toBeVisible();

    // 6. Reset back to clean 'PlotFlow'
    await nameInput.fill('PlotFlow');
    await updateBtn.click();
    await expect(brandName).toHaveText('PlotFlow');
  });
});

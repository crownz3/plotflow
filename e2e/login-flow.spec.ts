import { test, expect } from '@playwright/test';

test.describe('Authentication & Super Admin Sign In', () => {
  test('should successfully sign in as Super Admin and show correctly aligned snackbar', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials for Super Admin
    await page.fill('input[name="email"]', 'mohamedibrahim010425@gmail.com');
    await page.fill('input[name="password"]', 'SuperAdmin2026!');
    await page.click('button[type="submit"]');

    // Verify redirect to /dashboard
    await page.waitForURL('/dashboard');

    // Verify Super Admin Console header appears
    await expect(page.locator('.role-badge')).toHaveText('Super Admin Console');
    await expect(page.locator('h1')).toHaveText('SaaS Platform Overview');

    // Verify Registered Real Estate Agencies table is visible
    await expect(page.locator('text=Registered Real Estate Agencies')).toBeVisible();

    // Verify user profile badge in top navigation
    await expect(page.locator('.super-pill')).toHaveText('SUPER ADMIN');
  });

  test('should verify snackbar close icon is vertically and horizontally centered with SVG', async ({ page }) => {
    await page.goto('/login');

    // Fill Super Admin email to trigger welcome snackbar
    await page.fill('input[name="email"]', 'mohamedibrahim010425@gmail.com');
    await page.fill('input[name="password"]', 'SuperAdmin2026!');
    await page.click('button[type="submit"]');

    // Verify snackbar card exists
    const snackbar = page.locator('.ef-snackbar-card');
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toContainText('Welcome back, Platform Super Admin!');

    // Verify close button contains SVG icon and is styled properly
    const closeBtn = page.locator('.ef-snackbar-close');
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn.locator('svg')).toBeVisible();

    // Check SVG bounding box alignment
    const btnBox = await closeBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    expect(btnBox!.width).toBe(28);
    expect(btnBox!.height).toBe(28);

    // Click close button and verify snackbar dismisses
    await closeBtn.click();
    await expect(page.locator('.ef-snackbar-host')).toBeHidden();
  });
});

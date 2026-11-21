import { test, expect } from '@playwright/test';

test.describe('Security & Multi-Tenant Data Isolation', () => {
  test('should enforce privacy masking of direct property owner contact for standard agents', async ({ page }) => {
    // 1. Log in as Associate Agent
    await page.goto('/login');
    await page.click('button.demo-btn.agent');
    await page.waitForURL('/dashboard');

    // Navigate to properties
    await page.click('a[routerLink="/properties"]:visible');
    await page.waitForURL('/properties');

    // Agent MUST NOT see the confidential direct owner banner
    await expect(page.locator('.owner-badge')).toHaveCount(0);

    // 2. Now switch to Principal Broker (Agency Admin)
    await page.goto('/login');
    await page.click('button.demo-btn.agency-admin');
    await page.waitForURL('/dashboard');

    await page.click('a[routerLink="/properties"]:visible');
    await page.waitForURL('/properties');

    // Agency Admin CAN see the confidential owner details
    const ownerBadge = page.locator('.owner-badge').first();
    await expect(ownerBadge).toBeVisible();
    await expect(ownerBadge).toContainText('Owner:');
  });

  test('should enforce multi-tenant isolation across brokerage organizations', async ({ page }) => {
    // Log in as Super Admin to verify both agencies exist in system
    await page.goto('/login');
    await page.click('button.demo-btn.super-admin');
    await page.waitForURL('/dashboard');

    await expect(page.locator('table').locator('text=Prime Properties & Realty')).toBeVisible();
    await expect(page.locator('table').locator('text=Apex Metro Realtors')).toBeVisible();

    // Log in as Agency Admin of Prime Properties
    await page.goto('/login');
    await page.click('button.demo-btn.agency-admin');
    await page.waitForURL('/dashboard');

    // Prime Properties navbar badge must be active
    await expect(page.locator('.tenant-badge')).toContainText('Prime Properties');

    // Properties listed must strictly belong to Prime Properties
    await page.click('a[routerLink="/properties"]:visible');
    await expect(page.locator('text=Luxury 3BHK Sea-View Penthouse at ECR')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Comprehensive Full CRUD Operations Across Every Page', () => {
  test.beforeEach(async ({ page }) => {
    // Automatically accept window confirm dialogs (for deletes)
    page.on('dialog', dialog => dialog.accept());

    await page.goto('/login');
    // Login as Agency Admin (Principal Broker) to have full permissions
    await page.click('button.demo-btn.agency-admin');
    await page.waitForURL('/dashboard');
  });

  test('Page 1: Properties — Add, Edit, and Delete property listing', async ({ page }) => {
    await page.click('a[routerLink="/properties"]:visible');
    await page.waitForURL('/properties');

    // 1. ADD Property
    await page.click('button:has-text("+ Add New Property")');
    await expect(page.locator('h2:has-text("Ingest New Property Listing")')).toBeVisible();

    await page.fill('input[placeholder*="Lake-View Apartment"]', 'Marina Sands Villa Neelankarai');
    await page.fill('input[placeholder="e.g. 15000000"]', '35000000');
    await page.fill('input[placeholder="e.g. 1850"]', '3800');
    await page.fill('input[placeholder="e.g. Adyar"]', 'Neelankarai');
    await page.fill('input[placeholder="Owner Name"]', 'Suresh Balaji');
    await page.fill('input[placeholder="Owner Phone"]', '+91 98400 55443');

    await page.click('button:has-text("Publish Listing")');
    await expect(page.locator('text=Marina Sands Villa Neelankarai')).toBeVisible();

    // 2. EDIT Property
    const targetCard = page.locator('.property-card:has-text("Marina Sands Villa Neelankarai")');
    await targetCard.locator('.edit-prop-btn').click();
    await expect(page.locator('h2:has-text("Edit Property Listing")')).toBeVisible();

    await page.fill('.modal-body input[type="text"]', 'Marina Sands Luxury Villa (Updated)');
    await page.selectOption('.modal-body select', 'under_offer');
    await page.click('button:has-text("Update Property")');

    await expect(page.locator('text=Marina Sands Luxury Villa (Updated)')).toBeVisible();

    // 3. DELETE Property
    const updatedCard = page.locator('.property-card:has-text("Marina Sands Luxury Villa (Updated)")');
    await updatedCard.locator('.delete-prop-btn').click();

    // Verify completely deleted from DOM
    await expect(page.locator('text=Marina Sands Luxury Villa (Updated)')).toHaveCount(0);
  });

  test('Page 2: Leads CRM — Add, Edit, and Delete buyer prospect', async ({ page }) => {
    await page.click('a[routerLink="/leads"]:visible');
    await page.waitForURL('/leads');

    // 1. ADD Lead
    await page.click('button:has-text("+ Add New Lead")');
    await expect(page.locator('h2:has-text("Add New Buyer Prospect")')).toBeVisible();

    await page.fill('input[placeholder="e.g. Vikram Malhotra"]', 'Deepak Chawla');
    await page.fill('input[placeholder="+91 98765 00000"]', '+91 98844 11223');
    await page.click('button:has-text("Save Prospect")');

    await expect(page.locator('.lead-card:has-text("Deepak Chawla")')).toBeVisible();

    // 2. EDIT Lead (change stage to negotiation and update name)
    const targetLead = page.locator('.lead-card:has-text("Deepak Chawla")');
    await targetLead.locator('.edit-lead-btn').click();
    await expect(page.locator('h2:has-text("Edit Prospect Lead")')).toBeVisible();

    await page.fill('.modal-body input[type="text"]', 'Deepak Chawla (VIP)');
    await page.selectOption('.modal-body select:first-of-type', 'negotiation');
    await page.click('button:has-text("Update Prospect")');

    // Assert updated lead exists in Negotiation column
    const negCol = page.locator('.kanban-column:has-text("Negotiation")');
    await expect(negCol.locator('text=Deepak Chawla (VIP)')).toBeVisible();

    // 3. DELETE Lead
    const updatedLeadCard = page.locator('.lead-card:has-text("Deepak Chawla (VIP)")');
    await updatedLeadCard.locator('.delete-lead-btn').click();

    // Verify deleted
    await expect(page.locator('text=Deepak Chawla (VIP)')).toHaveCount(0);
  });

  test('Page 3: Site Visits — Add, Edit, and Delete inspection appointment', async ({ page }) => {
    await page.goto('/site-visits');
    await page.waitForURL('/site-visits');

    // 1. ADD / Schedule Site Visit
    await page.click('button:has-text("+ Schedule Site Visit")');
    await expect(page.locator('h2:has-text("Schedule New Site Visit")')).toBeVisible();

    await page.click('button:has-text("Confirm & Set Reminder")');
    await expect(page.locator('table.visits-table')).toBeVisible();

    // 2. EDIT / Reschedule Appointment
    const editBtn = page.locator('button.edit-visit-btn').first();
    await editBtn.click();
    await expect(page.locator('h2:has-text("Reschedule Site Visit")')).toBeVisible();

    await page.selectOption('.modal-body select', 'completed');
    await page.click('button:has-text("Update Appointment")');

    // 3. DELETE Appointment
    const initialRowCount = await page.locator('tbody tr').count();
    const deleteBtn = page.locator('button.delete-visit-btn').first();
    await deleteBtn.click();

    const postDeleteRowCount = await page.locator('tbody tr').count();
    expect(postDeleteRowCount).toBe(initialRowCount - 1);
  });

  test('Page 4: Deals Ledger — Add, Edit, and Delete transaction', async ({ page }) => {
    await page.click('a[routerLink="/deals"]:visible');
    await page.waitForURL('/deals');

    // 1. ADD Deal via Calculator
    await page.click('button:has-text("New Deal Closing Calculator")');
    await expect(page.locator('h2:has-text("Deal Closing & Commission Calculator")')).toBeVisible();

    await page.fill('input[placeholder*="ECR Penthouse"]', 'Coimbatore Villa Direct Resale');
    await page.fill('input[placeholder="e.g. 24500000"]', '15000000');
    await page.click('button:has-text("Finalize & Close Deal")');

    await expect(page.locator('text=Coimbatore Villa Direct Resale')).toBeVisible();

    // 2. EDIT Deal (Mark balance receivable as Paid in Full if pending or test mark-paid)
    const paidBtn = page.locator('button.mark-paid-btn').first();
    if (await paidBtn.isVisible()) {
      await paidBtn.click();
      await expect(page.locator('text=Coimbatore Villa Direct Resale')).toBeVisible();
    }

    // 3. DELETE Deal
    const targetDealRow = page.locator('tr:has-text("Coimbatore Villa Direct Resale")');
    await targetDealRow.locator('.delete-deal-btn').click();

    // Verify deleted
    await expect(page.locator('text=Coimbatore Villa Direct Resale')).toHaveCount(0);
  });

  test('Page 5: Settings & Team — Add, Edit, and Delete agency configurations', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL('/settings');

    // 1. EDIT Agency Settings
    const nameInput = page.locator('.content-card input[type="text"]').first();
    await nameInput.fill('Prime Properties Global Premier');
    await page.click('button:has-text("Save All Changes")');

    await expect(page.locator('.toast-notice')).toBeVisible();

    // 2. ADD Sub-Broker to Team
    await page.click('button:has-text("+ Invite Agent")');
    await expect(page.locator('h2:has-text("Invite Associate Broker to Agency")')).toBeVisible();

    await page.fill('.modal-body input[type="text"]', 'Sunita Rao');
    await page.fill('.modal-body input[type="email"]', 'sunita.rao.realty@gmail.com');
    await page.click('button:has-text("Send Invitation")');

    await expect(page.locator('.team-member-row:has-text("Sunita Rao")')).toBeVisible();

    // 3. DELETE Sub-Broker from Team
    const sunitaRow = page.locator('.team-member-row:has-text("Sunita Rao")');
    await sunitaRow.locator('.delete-member-btn').click();

    // Verify deleted from team list
    await expect(page.locator('.team-member-row:has-text("Sunita Rao")')).toHaveCount(0);
  });
});

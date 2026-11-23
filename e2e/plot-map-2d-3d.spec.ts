import { test, expect } from '@playwright/test';

test.describe('PlotFlow — Interactive 2D & 3D Plot Mapping & Mobile Responsiveness', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('framenavigated', frame => console.log('NAVIGATED:', frame.url()));

    // Seed authenticated agency admin session for Flow Real Estate
    await page.addInitScript(() => {
      const tenant = {
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

      const samplePlot = {
        id: 'prop_crowwzz_mapped',
        tenantId: 'tenant_crowwzz3',
        title: 'Flow Elite Enclave - Phase 1',
        propertyType: 'plot',
        price: 6500000,
        area: 2400,
        areaUnit: 'sqft',
        status: 'available',
        location: {
          locality: 'OMR Sholinganallur',
          city: 'Chennai',
          coordinates: { lat: 12.9010, lng: 80.2279 },
          plotBoundary: [
            { lat: 12.9012, lng: 80.2277, label: 'NW' },
            { lat: 12.9012, lng: 80.2281, label: 'NE' },
            { lat: 12.9008, lng: 80.2281, label: 'SE' },
            { lat: 12.9008, lng: 80.2277, label: 'SW' }
          ],
          view3D: {
            dimensions: { width: 40, length: 60, unit: 'ft' },
            boundaryWall: true,
            wallHeight: 5,
            roadFacing: 'north',
            roadWidth: 30,
            compassBearing: 0
          }
        },
        ownerName: 'Karthik Subramanian',
        ownerContact: '+91 98401 22334',
        plotDetails: {
          dimensions: '40x60',
          facing: 'north',
          roadWidth: 30,
          approvalStatus: 'DTCP'
        },
        images: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      localStorage.setItem('pf_user_session', JSON.stringify(user));
      localStorage.setItem('pf_tenants', JSON.stringify([tenant]));
      localStorage.setItem('pf_active_tenant_id', 'tenant_crowwzz3');

      const existingProps = localStorage.getItem('pf_properties');
      const propsList = existingProps ? JSON.parse(existingProps) : [];
      if (!propsList.some((p: any) => p.id === 'prop_crowwzz_mapped')) {
        propsList.push(samplePlot);
        localStorage.setItem('pf_properties', JSON.stringify(propsList));
      }
    });

    await page.goto('/properties');
    await page.waitForSelector('.properties-page', { timeout: 10000 });
    // Allow Vite initial HMR connection / reload to complete if occurring
    await page.waitForTimeout(2000);
  });

  test('should render 2D & 3D Plot Map Viewer in Add Property form with auto-boundary', async ({ page }) => {
    // 1. Open Ingest / Add Property Modal
    const addBtn = page.locator('button:has-text("Ingest")').first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await expect(page.locator('h2:has-text("Ingest Verified Property Listing")')).toBeVisible();

    // 2. Select Residential Plot
    const typeSelect = page.locator('.ef-form-group select').first();
    await typeSelect.selectOption('plot');

    // 3. Verify PlotMapViewerComponent is rendered
    const mapViewer = page.locator('app-plot-map-viewer');
    await expect(mapViewer).toBeVisible({ timeout: 5000 });

    // 4. Verify 2D Map mode buttons & tools
    const mode2dBtn = mapViewer.locator('button.mode-btn:has-text("2D Map")');
    const mode3dBtn = mapViewer.locator('button.mode-btn:has-text("3D Layout")');
    await expect(mode2dBtn).toBeVisible();
    await expect(mode3dBtn).toBeVisible();
    await expect(mode2dBtn).toHaveClass(/active/);

    // 5. Test Draw Boundary mode & pencil cursor
    const mapViewport = mapViewer.locator('.map-viewport');
    await mapViewport.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Scroll modal-body so app-plot-map-viewer is in view
    await page.evaluate(() => {
      const el = document.querySelector('app-plot-map-viewer');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    const drawBtnInfo = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('app-plot-map-viewer button')).find(b => b.textContent?.includes('Draw Boundary')) as HTMLButtonElement;
      if (btn) {
        const info = { text: btn.textContent, tag: btn.tagName, type: btn.type, html: btn.outerHTML };
        btn.click();
        return info;
      }
      return null;
    });
    console.log('DRAW BTN INFO & CLICKED:', JSON.stringify(drawBtnInfo));
    await page.waitForTimeout(300);

    const isAddModalAfter = await page.evaluate(() => document.querySelector('.modal-card') !== null);
    console.log('AFTER DRAW BTN EVAL: isAddModal?', isAddModalAfter);

    // Verify map viewport receives drawing-mode pencil class
    await expect(mapViewport).toHaveClass(/drawing-mode/);

    // Click 4 points on map to create boundary polygon via native mouse clicks
    const box = await mapViewport.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + 100, box!.y + 80);
    await page.waitForTimeout(250);
    await page.mouse.click(box!.x + box!.width - 100, box!.y + 80);
    await page.waitForTimeout(250);
    await page.mouse.click(box!.x + box!.width - 100, box!.y + box!.height - 80);
    await page.waitForTimeout(250);
    await page.mouse.click(box!.x + 100, box!.y + box!.height - 80);
    await page.waitForTimeout(400);

    // Verify 4-corner boundary badge & marked area pill are displayed
    const boundaryBadge = mapViewer.locator('.boundary-badge');
    await expect(boundaryBadge).toBeVisible();
    await expect(boundaryBadge).toContainText('4-Corner');

    const markedAreaPill = mapViewer.locator('.marked-area-pill');
    await expect(markedAreaPill).toBeVisible();
    await expect(markedAreaPill).toContainText('sq.ft');

    // Test Hide / Show Labels button
    const hideLabelsBtn = mapViewer.locator('button:has-text("Hide Labels")');
    await expect(hideLabelsBtn).toBeVisible();
    await hideLabelsBtn.click();
    await page.waitForTimeout(250);
    await expect(mapViewer.locator('button:has-text("Show Labels")')).toBeVisible();

    // Test Undo button
    const undoBtn = mapViewer.locator('button:has-text("Undo")').first();
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();
    await page.waitForTimeout(250);
    await expect(boundaryBadge).toContainText('3-Corner');

    // Re-add 4th corner to complete polygon
    await page.mouse.click(box!.x + 100, box!.y + box!.height - 80);
    await page.waitForTimeout(300);
    await expect(boundaryBadge).toContainText('4-Corner');

    // 6. Toggle to 3D Layout View
    await mode3dBtn.click({ force: true });
    await page.waitForTimeout(400);
    await expect(mode3dBtn).toHaveClass(/active/);

    // Verify 3D canvas is visible
    const canvas3D = mapViewer.locator('canvas.canvas-element');
    await expect(canvas3D).toBeVisible();

    // Verify 3D toolbar controls (Walls toggle, Reset)
    const wallsBtn = mapViewer.locator('button:has-text("Walls")');
    const resetBtn = mapViewer.locator('button:has-text("Reset")');
    await expect(wallsBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();

    // 7. Fill required property fields and publish
    await page.fill('input[placeholder*="2400 Sq.ft"]', 'Flow Oceanview Plot #42');
    await page.fill('input[placeholder="e.g. 18000000"]', '6800000');
    await page.fill('input[placeholder="e.g. 2400"]', '2400');
    await page.fill('input[placeholder*="Panaiyur, ECR"]', 'OMR Sholinganallur');
    await page.fill('input[placeholder="Owner Name"]', 'Karthik Subramanian');
    await page.fill('input[placeholder="+91 98..."]', '+91 98401 22334');

    // Save Property
    await page.click('button:has-text("Publish Verified Listing")');
    await page.waitForTimeout(1000);

    // 8. Verify property card displays "2D/3D Mapped" pill
    const mappedCardPill = page.locator('.property-card:has-text("Flow Oceanview Plot #42") .media-pill.map').first();
    await expect(mappedCardPill).toBeVisible({ timeout: 5000 });
  });

  test('should inspect interactive 2D & 3D view in Property Details Dossier', async ({ page }) => {
    // Click on property title to open the Dossier Modal
    const propCard = page.locator('.property-card').first();
    await expect(propCard).toBeVisible({ timeout: 5000 });
    await propCard.locator('.property-title').click();
    await page.waitForTimeout(500);

    // Verify Dossier Modal is open
    const dossierModal = page.locator('.dossier-modal');
    await expect(dossierModal).toBeVisible({ timeout: 5000 });

    // Verify Site Boundary & 3D Spatial Layout section
    const spatialSection = dossierModal.locator('.plot-map-dossier-section');
    await expect(spatialSection).toBeVisible();

    const dossierViewer = spatialSection.locator('app-plot-map-viewer');
    await expect(dossierViewer).toBeVisible();

    // Verify 2D and 3D toggle in Dossier
    const mode3dBtn = dossierViewer.locator('button.mode-btn:has-text("3D Layout")');
    await expect(mode3dBtn).toBeVisible();
    await mode3dBtn.click({ force: true });
    await page.waitForTimeout(400);

    const canvas3D = dossierViewer.locator('canvas.canvas-element');
    await expect(canvas3D).toBeVisible();

    // Close Dossier
    const closeBtn = dossierModal.locator('.close-btn').first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(300);
    await expect(dossierModal).not.toBeVisible();
  });

  test('should be 100% mobile responsive on small phone viewport (375x812)', async ({ page }) => {
    // Set iPhone / Android viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/properties');
    await page.waitForSelector('.properties-page', { timeout: 10000 });
    // Allow Vite initial HMR connection / reload to complete if occurring
    await page.waitForTimeout(2000);

    // Open Add Property modal
    const addBtn = page.locator('button:has-text("Ingest")').first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await expect(page.locator('h2:has-text("Ingest Verified Property Listing")')).toBeVisible({ timeout: 5000 });

    // Select Residential Plot to display map viewer
    const typeSelect = page.locator('.ef-form-group select').first();
    await typeSelect.selectOption('plot');
    await page.waitForTimeout(400);

    // Check Map Viewer card doesn't overflow mobile screen
    const mapViewerCard = page.locator('app-plot-map-viewer .plot-viewer-card');
    await expect(mapViewerCard).toBeVisible({ timeout: 5000 });

    const box = await mapViewerCard.boundingBox();
    expect(box).not.toBeNull();
    // Width should fit neatly within the mobile viewport
    expect(box!.width).toBeLessThanOrEqual(375);

    // Toggle 3D view on mobile
    const mode3dBtn = mapViewerCard.locator('button.mode-btn:has-text("3D Layout")');
    await mode3dBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Verify 3D canvas and under-development spatial badge are present
    const canvas = mapViewerCard.locator('canvas.canvas-element');
    await expect(canvas).toBeVisible();

    const devBadge = mapViewerCard.locator('.under-dev-center-overlay');
    await expect(devBadge).toBeVisible();

    // Close modal
    const cancelBtn = page.locator('.modal-backdrop .close-btn, .modal-backdrop button:has-text("Cancel")').first();
    await cancelBtn.click({ force: true });
  });
});

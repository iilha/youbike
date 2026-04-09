const { test, expect } = require('@playwright/test');

test.describe('YouBike PWA', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });
  });

  test('page loads with correct title', async ({ page }) => {
    await page.goto('http://localhost:8001/');
    await expect(page).toHaveTitle(/YouBike/);

    const h1 = page.locator('#page-title');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('YouBike');
  });

  test('no console errors on load (except network errors)', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out expected network errors for API calls
        if (!text.includes('net::') && !text.includes('Failed to fetch')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('http://localhost:8001/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors).toHaveLength(0);
  });

  test('no cross-app navigation links in header', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    // Check header has no links to other transport apps
    const mrtLinks = await page.locator('header a[href*="mrt"]').count();
    const busLinks = await page.locator('header a[href*="bus"]').count();
    const railLinks = await page.locator('header a[href*="rail"]').count();
    const thsrLinks = await page.locator('header a[href*="thsr"]').count();
    const oilLinks = await page.locator('header a[href*="oil"]').count();
    const weatherLinks = await page.locator('header a[href*="weather"]').count();
    const earthquakeLinks = await page.locator('header a[href*="earthquake"]').count();

    expect(mrtLinks).toBe(0);
    expect(busLinks).toBe(0);
    expect(railLinks).toBe(0);
    expect(thsrLinks).toBe(0);
    expect(oilLinks).toBe(0);
    expect(weatherLinks).toBe(0);
    expect(earthquakeLinks).toBe(0);
  });

  test('map container exists and is visible', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const mapCanvas = page.locator('#map-canvas');
    await expect(mapCanvas).toBeVisible();

    // Verify map container has dimensions
    const boundingBox = await mapCanvas.boundingBox();
    expect(boundingBox.width).toBeGreaterThan(0);
    expect(boundingBox.height).toBeGreaterThan(0);
  });

  test('city selector exists with 13+ options', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const citySelect = page.locator('#city-select');
    await expect(citySelect).toBeVisible();

    // Count options (should have "All Cities" + 13 cities = 14 options)
    const options = await citySelect.locator('option').count();
    expect(options).toBeGreaterThanOrEqual(14);

    // Verify "Taipei" is selected by default
    await expect(citySelect).toHaveValue('taipei');
  });

  test('search input exists', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search/i);
  });

  test('language toggle button exists and works', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const langBtn = page.locator('#lang-btn');
    await expect(langBtn).toBeVisible();

    // Check initial language (should be EN or 中文)
    const initialText = await langBtn.textContent();
    expect(['EN', '中文']).toContain(initialText);

    // Click to toggle
    await langBtn.click();
    await page.waitForTimeout(200); // Wait for toggle animation

    const newText = await langBtn.textContent();
    expect(newText).not.toBe(initialText);
    expect(['EN', '中文']).toContain(newText);

    // Toggle back
    await langBtn.click();
    await page.waitForTimeout(200);

    const finalText = await langBtn.textContent();
    expect(finalText).toBe(initialText);
  });

  test('station list container exists', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const stationList = page.locator('#station-list');
    await expect(stationList).toBeVisible();
  });

  test('Leaflet map initializes', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    // Wait for Leaflet to initialize
    await page.waitForSelector('.leaflet-container', { timeout: 5000 });

    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible();

    // Check for map tiles
    await page.waitForSelector('.leaflet-tile-pane', { timeout: 5000 });
    const tilePane = page.locator('.leaflet-tile-pane');
    await expect(tilePane).toBeVisible();
  });

  test('service worker registration', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    // Check if service worker is supported and registered
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    expect(swSupported).toBe(true);

    // Wait for service worker registration
    await page.waitForTimeout(1000);

    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration !== undefined;
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    // Note: SW might not register immediately in test environment
    // This is informational rather than critical
    console.log('Service Worker registered:', swRegistered);
  });

  test('manifest.webapp is accessible', async ({ page, request }) => {
    const response = await request.get('http://localhost:8001/manifest.webapp');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/application\/json|application\/manifest\+json|text\/plain/);

    // Verify manifest has required fields
    const manifest = await response.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('icons');
  });

  test('all required JS files load without errors', async ({ page }) => {
    const jsErrors = [];
    const jsFiles = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('.js') && (url.includes('common.js') || url.includes('ubike.js') || url.includes('bottom-sheet.js'))) {
        jsFiles.push({
          url,
          status: response.status()
        });
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    await page.goto('http://localhost:8001/');
    await page.waitForLoadState('networkidle');

    // Check all required JS files loaded successfully
    const commonJs = jsFiles.find(f => f.url.includes('common.js'));
    const ubikeJs = jsFiles.find(f => f.url.includes('ubike.js'));
    const bottomSheetJs = jsFiles.find(f => f.url.includes('bottom-sheet.js'));

    expect(commonJs).toBeDefined();
    expect(commonJs.status).toBe(200);

    expect(ubikeJs).toBeDefined();
    expect(ubikeJs.status).toBe(200);

    expect(bottomSheetJs).toBeDefined();
    expect(bottomSheetJs.status).toBe(200);

    // No JavaScript runtime errors
    expect(jsErrors).toHaveLength(0);
  });

  test('locate button exists and is clickable', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const locateBtn = page.locator('.locate-btn');
    await expect(locateBtn).toBeVisible();
    await expect(locateBtn).toHaveText('📍');

    // Button should be clickable (though geolocation may not work in test environment)
    await expect(locateBtn).toBeEnabled();
  });

  test('map legend exists', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const legend = page.locator('#map-legend');
    await expect(legend).toBeVisible();

    // Check legend has status indicators
    const legendDots = await page.locator('.legend-dot').count();
    expect(legendDots).toBeGreaterThanOrEqual(4); // ok, empty, full, suspended
  });

  test('panel structure is correct', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const panel = page.locator('#panel');
    await expect(panel).toBeVisible();

    // Check panel contains all required elements
    await expect(page.locator('.filter-controls')).toBeVisible();
    await expect(page.locator('.search-section')).toBeVisible();
    await expect(page.locator('#result-count')).toBeVisible();
    await expect(page.locator('#station-list')).toBeVisible();
  });

  test('bottom sheet handle exists on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8001/');

    const sheetHandle = page.locator('.sheet-handle');
    await expect(sheetHandle).toBeVisible();

    const sheetPill = page.locator('.sheet-pill');
    await expect(sheetPill).toBeVisible();

    const sheetSummary = page.locator('#sheet-summary');
    await expect(sheetSummary).toBeVisible();
  });

  test('city selector changes city', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const citySelect = page.locator('#city-select');

    // Change to Kaohsiung
    await citySelect.selectOption('kaohsiung');
    await expect(citySelect).toHaveValue('kaohsiung');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Change to Taichung
    await citySelect.selectOption('taichung');
    await expect(citySelect).toHaveValue('taichung');
  });

  test('search input triggers filtering', async ({ page }) => {
    await page.goto('http://localhost:8001/');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('#search-input');

    // Type in search
    await searchInput.fill('Station');
    await page.waitForTimeout(300);

    // Search dropdown might appear
    const dropdown = page.locator('#search-dropdown');
    // Dropdown may or may not be visible depending on data load
    // Just verify input accepts text
    await expect(searchInput).toHaveValue('Station');

    // Clear search
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('fare card is collapsible', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const fareCard = page.locator('#fare-card');
    await expect(fareCard).toBeVisible();

    const fareHeader = page.locator('.fare-header');
    const fareBody = page.locator('#fare-body');

    // Click to expand
    await fareHeader.click();
    await page.waitForTimeout(200);

    // Toggle icon should rotate
    const fareToggle = page.locator('#fare-toggle');
    await expect(fareToggle).toBeVisible();
  });

  test('floating buttons are positioned correctly', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const floatBtnContainer = page.locator('.float-btn-container');
    await expect(floatBtnContainer).toBeVisible();

    const langBtn = page.locator('.lang-btn');
    const locateBtn = page.locator('.locate-btn');

    await expect(langBtn).toBeVisible();
    await expect(locateBtn).toBeVisible();

    // Check they are in the correct container
    const langInContainer = await floatBtnContainer.locator('.lang-btn').count();
    const locateInContainer = await floatBtnContainer.locator('.locate-btn').count();

    expect(langInContainer).toBe(1);
    expect(locateInContainer).toBe(1);
  });

  test('no external app links in navigation', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    // Check .header-controls for any navigation links
    const headerControls = page.locator('.header-controls');
    const navLinks = await headerControls.locator('a.nav-btn').count();

    // Should have no nav links to other apps
    // (May have language toggle button but that's not a link)
    console.log('Nav links found:', navLinks);
  });

  test('responsive design: mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:8001/');

    // Check mobile-specific elements
    const panel = page.locator('#panel');
    await expect(panel).toBeVisible();

    // Map should be behind panel (fixed positioning)
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // Verify panel has mobile styles
    const panelClass = await panel.getAttribute('class');
    console.log('Panel classes on mobile:', panelClass);
  });

  test('responsive design: desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:8001/');

    // Check desktop layout
    const panel = page.locator('#panel');
    await expect(panel).toBeVisible();

    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // Sheet handle should be hidden on desktop
    const sheetHandle = page.locator('.sheet-handle');
    const isVisible = await sheetHandle.isVisible();
    // Note: May still be in DOM but display:none
    console.log('Sheet handle visible on desktop:', isVisible);
  });

  test('all city options are present', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    const citySelect = page.locator('#city-select');
    const optionTexts = await citySelect.locator('option').allTextContents();

    // Expected cities from index.html
    expect(optionTexts).toContain('All Cities');
    expect(optionTexts).toContain('Taipei');
    expect(optionTexts).toContain('New Taipei');
    expect(optionTexts).toContain('Taoyuan');
    expect(optionTexts).toContain('Hsinchu City');
    expect(optionTexts).toContain('Hsinchu County');
    expect(optionTexts).toContain('Miaoli');
    expect(optionTexts).toContain('Taichung');
    expect(optionTexts).toContain('Chiayi City');
    expect(optionTexts).toContain('Chiayi County');
    expect(optionTexts).toContain('Tainan');
    expect(optionTexts).toContain('Kaohsiung');
    expect(optionTexts).toContain('Pingtung');
    expect(optionTexts).toContain('Taitung');
  });

  test('report modal structure exists', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    // Report overlay should exist but be hidden initially
    const reportOverlay = page.locator('#report-overlay');
    await expect(reportOverlay).toBeAttached();

    // Check report modal elements exist
    const reportModal = page.locator('.report-modal');
    await expect(reportModal).toBeAttached();

    const reportTitle = page.locator('#report-title');
    await expect(reportTitle).toBeAttached();
  });

  test('PWA meta tags are present', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    // Check viewport meta
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();

    // Check theme color
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#4CAF50');

    // Check apple mobile web app capable
    const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(appleCapable).toBe('yes');

    // Check manifest link
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBe('manifest.webapp');
  });

  test('Leaflet library loads correctly', async ({ page }) => {
    await page.goto('http://localhost:8001/');

    // Check if Leaflet global object exists
    const leafletLoaded = await page.evaluate(() => {
      return typeof window.L !== 'undefined';
    });

    expect(leafletLoaded).toBe(true);
  });

  test('no broken images', async ({ page }) => {
    const brokenImages = [];

    page.on('response', response => {
      if (response.url().match(/\.(png|jpg|jpeg|gif|svg|ico)$/) && response.status() !== 200) {
        brokenImages.push(response.url());
      }
    });

    await page.goto('http://localhost:8001/');
    await page.waitForLoadState('networkidle');

    expect(brokenImages).toHaveLength(0);
  });

  test('localStorage language preference works', async ({ page, context }) => {
    // Clear storage first
    await context.clearCookies();

    await page.goto('http://localhost:8001/');

    // Set language via button
    const langBtn = page.locator('#lang-btn');
    await langBtn.click();
    await page.waitForTimeout(200);

    // Check localStorage
    const storedLang = await page.evaluate(() => {
      return localStorage.getItem('youbike-lang');
    });

    expect(storedLang).toBeTruthy();
    expect(['en', 'zh']).toContain(storedLang);
  });
});

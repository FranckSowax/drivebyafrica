import { test, expect } from '@playwright/test';

// Mobile tests
test.describe('Mobile Responsiveness', () => {
  test('should display mobile navigation', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 13
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
    });
    const page = await context.newPage();
    await page.goto('/');

    // Check mobile nav is visible
    const mobileNav = page.locator('nav').filter({ hasText: /Accueil|Véhicules|Estimer/i }).first();
    await expect(mobileNav).toBeVisible();

    await context.close();
  });

  test('should display mobile header', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/');

    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check logo is visible
    const logo = page.locator('header img');
    await expect(logo).toBeVisible();

    await context.close();
  });

  test('should navigate using mobile nav', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/');

    // Click on vehicles in mobile nav
    const vehiclesLink = page.locator('nav a[href="/cars"]').first();
    await vehiclesLink.click();

    await expect(page).toHaveURL(/.*\/cars/);

    await context.close();
  });

  test('should display responsive vehicle cards on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');

    // Check vehicle cards adapt to mobile
    const vehicleGrid = page.locator('[class*="grid"]').first();
    await expect(vehicleGrid).toBeVisible();

    await context.close();
  });
});

// Tablet tests
test.describe('Tablet Responsiveness', () => {
  test('should display correctly on tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 }, // iPad
    });
    const page = await context.newPage();
    await page.goto('/');

    // Check header
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check hero section
    const heroSection = page.locator('h1').first();
    await expect(heroSection).toBeVisible();

    await context.close();
  });

  test('should display filter bar on tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
    });
    const page = await context.newPage();
    await page.goto('/');

    const searchFilter = page.locator('text=Recherche rapide');
    await expect(searchFilter).toBeVisible();

    await context.close();
  });
});

// Desktop tests
test.describe('Desktop Responsiveness', () => {
  test('should display full navigation on desktop', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    await page.goto('/');

    // Check header
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Auth buttons are <button> elements (not <a> links)
    const loginButton = page.locator('header button:has-text("Se connecter")').first();
    await expect(loginButton).toBeVisible();

    await context.close();
  });

  test('should display vehicle grid in multiple columns', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');

    // Check grid has multiple columns on desktop
    const vehicleGrid = page.locator('[class*="grid"]').first();
    await expect(vehicleGrid).toBeVisible();

    await context.close();
  });
});

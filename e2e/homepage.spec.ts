import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the header with logo', async ({ page }) => {
    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check logo is visible
    const logo = page.locator('header img[alt="Driveby Africa"]');
    await expect(logo).toBeVisible();
  });

  test('should display the hero section', async ({ page }) => {
    // Check hero title
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();
  });

  test('should display the search filter bar', async ({ page }) => {
    // Check search filter is visible
    const searchFilter = page.locator('text=Recherche rapide');
    await expect(searchFilter).toBeVisible();
  });

  test('should display vehicle cards', async ({ page }) => {
    // Wait for vehicles to load
    await page.waitForLoadState('networkidle');

    // Check if vehicle grid with cards exists (don't assume specific brands)
    const vehicleGrid = page.locator('[class*="grid"]').first();
    await expect(vehicleGrid).toBeVisible({ timeout: 10000 });
  });

  test('should have working navigation links', async ({ page }) => {
    // Check "Voir tous les véhicules" button/link
    const viewAllLink = page.locator('a[href="/cars"]').first();
    await expect(viewAllLink).toBeVisible();
  });

  test('should display auth buttons when not logged in', async ({ page }) => {
    // Auth buttons are <button> elements (not <a> links), using text matching
    const loginButton = page.locator('header button:has-text("Se connecter")').first();
    await expect(loginButton).toBeVisible();
  });
});

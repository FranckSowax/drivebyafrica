import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to vehicles page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/cars"]');
    await expect(page).toHaveURL(/.*\/cars/);

    // Check page title
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveURL(/.*\/about/);

    // Check page title is in orange (mandarin)
    const title = page.locator('h1.text-mandarin');
    await expect(title).toBeVisible();
    await expect(title).toContainText('importation automobile');
  });

  test('should navigate to how it works page', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page).toHaveURL(/.*\/how-it-works/);

    // Check page title
    const title = page.locator('h1.text-mandarin');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Comment ça marche');
  });

  test('should navigate to contact page', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveURL(/.*\/contact/);

    // Check page title
    const title = page.locator('h1.text-mandarin');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Contactez notre équipe');
  });

  test('should navigate to careers page', async ({ page }) => {
    await page.goto('/careers');
    await expect(page).toHaveURL(/.*\/careers/);

    // Check page title
    const title = page.locator('h1.text-mandarin');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Driveby Africa');
  });

  test('should navigate to calculator page', async ({ page }) => {
    await page.goto('/calculator');
    await expect(page).toHaveURL(/.*\/calculator/);

    // Check calculator form exists
    const calculatorForm = page.locator('form, [class*="calculator"]').first();
    await expect(calculatorForm).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/.*\/login/);

    // Check login form
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/.*\/register/);

    // Check registration form
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});

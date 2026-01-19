import { test, expect } from '@playwright/test';

test.describe('Contact Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('should display contact form', async ({ page }) => {
    // Check form fields
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const messageTextarea = page.locator('textarea[name="message"]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(messageTextarea).toBeVisible();
  });

  test('should display contact methods', async ({ page }) => {
    // Check WhatsApp contact
    const whatsappLink = page.locator('a[href*="wa.me"]').first();
    await expect(whatsappLink).toBeVisible();

    // Check email contact - use first() since there may be multiple
    const emailLink = page.locator('a[href*="mailto:"]').first();
    await expect(emailLink).toBeVisible();
  });

  test('should display working hours', async ({ page }) => {
    // Check working hours section
    const workingHours = page.locator('text=Heures d\'ouverture');
    await expect(workingHours).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check that form validation prevents submission
    // (HTML5 validation should kick in)
    const nameInput = page.locator('input[name="name"]:invalid');
    await expect(nameInput).toBeVisible();
  });

  test('should fill and submit contact form', async ({ page }) => {
    // Fill form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '+241 77 00 00 00');

    // Select subject
    const subjectSelect = page.locator('select[name="subject"]');
    await subjectSelect.selectOption('general');

    // Fill message
    await page.fill('textarea[name="message"]', 'This is a test message from Playwright E2E tests.');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for success message (the form shows a success state)
    const successMessage = page.locator('text=/Message envoyé|Merci/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});

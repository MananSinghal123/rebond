import { expect, test } from '@playwright/test';

test.describe('only signed-in members reach the app', () => {
  test('a visitor opening the marketplace is sent to sign in', async ({ page }) => {
    await page.goto('/bonds');
    await expect(page).toHaveURL(/\/login\?next=%2Fbonds$/);
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
  });

  test('"Open the app" takes a visitor to sign in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Open the app' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('continuing with Google (demo) creates an account with an embedded wallet and starts onboarding', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Continue with Google' }).click();
    await page.getByLabel('Name').fill('Lee Park');
    await page.getByLabel('Google email').fill(`lee+${Date.now()}@e2e.test`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toHaveCount(0);
  });
});

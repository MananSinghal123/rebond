import { expect, test } from '@playwright/test';

test.describe('the assistant answers questions about ReBond', () => {
  test('a visitor asks a starter question and reads the answer', async ({ page }) => {
    let sent: { messages: { role: string; content: string }[]; path: string } | null = null;
    await page.route('/api/chat', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ contentType: 'text/plain; charset=utf-8', body: 'The minimum investment is $100.' });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Ask ReBond' }).click();
    const panel = page.getByRole('dialog', { name: 'ReBond assistant' });
    await expect(panel.getByLabel('Your question')).toBeFocused();

    await panel.getByRole('button', { name: "What's the minimum investment?" }).click();
    await expect(panel.getByText('The minimum investment is $100.')).toBeVisible();
    expect(sent).toEqual({ messages: [{ role: 'user', content: "What's the minimum investment?" }], path: '/' });

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ask ReBond' })).toBeFocused();
  });

  test('a rate-limited question shows a message and can be retried', async ({ page }) => {
    let calls = 0;
    await page.route('/api/chat', async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({ status: 429, json: { error: 'Too many questions. Please wait a moment.' } });
      } else {
        await route.fulfill({ contentType: 'text/plain', body: 'Curators vet each application.' });
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Ask ReBond' }).click();
    const panel = page.getByRole('dialog', { name: 'ReBond assistant' });
    await panel.getByLabel('Your question').fill('What do curators do?');
    await panel.getByLabel('Your question').press('Enter');

    await expect(panel.getByRole('alert')).toContainText('Too many questions');
    await panel.getByRole('button', { name: 'Retry' }).click();
    await expect(panel.getByText('Curators vet each application.')).toBeVisible();
  });
});

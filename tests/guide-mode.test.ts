import { test, expect } from '@playwright/test';

/**
 * E2E: Guide Me header toggle persists per chat via localStorage
 */

test.describe('Guide Me toggle persistence', () => {
  test('toggle persists across reloads for the same chat', async ({ page }) => {
    // Start a new chat and send a message to get a chat id in URL
    await page.goto('/');

    // Type a short message and send
    const input = page.getByTestId('multimodal-input');
    await input.click();
    await input.fill('Help me troubleshoot my Wi-Fi');
    await page.getByTestId('send-button').click();

    // Wait for chat API to be called so we get redirected to /chat/:id
    await page.waitForResponse((res) => res.url().includes('/api/chat'));
    await expect(page).toHaveURL(
      /\/chat\/[0-9a-f\-]{36}$/
    );

    // Click Guide Me toggle to enable
    const toggle = page.getByTestId('guide-mode-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Reload page and ensure toggle remains enabled (localStorage-based)
    await page.reload();
    await expect(page.getByTestId('guide-mode-toggle')).toHaveAttribute('aria-pressed', 'true');

    // Disable and verify state flips
    await page.getByTestId('guide-mode-toggle').click();
    await expect(page.getByTestId('guide-mode-toggle')).toHaveAttribute('aria-pressed', 'false');

    // Reload again and verify it remains disabled
    await page.reload();
    await expect(page.getByTestId('guide-mode-toggle')).toHaveAttribute('aria-pressed', 'false');
  });
});

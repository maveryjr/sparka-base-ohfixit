import { test, expect } from '@playwright/test';
import { ChatPage } from './pages/chat';

// Note: Browser screen capture picker cannot be automated directly.
// This E2E focuses on the UI presence, gating, and fallback behavior for the screen capture button.

test.describe('screen capture integration', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test('screen capture button is visible when ready', async ({ page }) => {
    await expect(page.getByTestId('screen-capture-button')).toBeVisible();
  });

  test('anonymous user sees login prompt on capture', async ({ page }) => {
    // This test assumes anonymous by default unless auth setup is used.
    await page.getByTestId('screen-capture-button').click();
    await expect(page.getByText('Sign in to capture screenshots')).toBeVisible();
  });
});

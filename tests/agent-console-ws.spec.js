const { test, expect } = require('@playwright/test');

test('Agent Console WebSocket connection and message loop', async ({ page }) => {
  const testEmail = `test-agent-ws-${Date.now()}@example.com`;
  const testPassword = 'password123';

  // 1. Navigate to login and sign up
  await page.goto('/jobboard/login.html');
  await page.click('#toggleMode');
  await page.fill('#email', testEmail);
  await page.fill('#password', testPassword);
  await page.click('#submitBtn');

  // 2. Wait for redirect to Dashboard
  await page.waitForURL('**/index.html');
  await expect(page.locator('#welcomeTitle')).toContainText('Welcome back');

  // 3. Verify Agent toggle is visible and click it
  const toggleBtn = page.locator('.agent-toggle-btn');
  await expect(toggleBtn).toBeVisible();
  await toggleBtn.click();

  // 4. Verify panel opens
  const panel = page.locator('.agent-panel');
  await expect(panel).toHaveClass(/open/);

  // 5. CRITICAL VERIFICATION: Check if WebSocket connected successfully and header is Online
  const headerStatus = panel.locator('.agent-header-status');
  await expect(headerStatus).toContainText('Online', { timeout: 10000 });

  // 6. Verify that initial welcome onboarding prompt was loaded from PostgreSQL history
  const initMsg = panel.locator('.agent-msg.role-agent').first();
  await expect(initMsg).toBeVisible();
  await expect(initMsg).toContainText('Zenith Agent');

  // 7. Write a message and send it
  const inputField = panel.locator('.agent-input-field');
  const sendBtn = panel.locator('.agent-send-btn');
  
  await inputField.fill('Hola agente');
  await sendBtn.click();

  // 8. Verify the user message is appended to the chat
  const userMsg = panel.locator('.agent-msg.role-user').last();
  await expect(userMsg).toContainText('Hola agente');

  // 9. Verify the agent processes it (either thinking or replies)
  // We wait for the temporary thinking block to render or the agent message to arrive
  await page.waitForTimeout(1000);
  
  const lastMsg = panel.locator('.agent-msg').last();
  // It should not be the user message anymore
  await expect(lastMsg).not.toHaveClass(/role-user/);
});

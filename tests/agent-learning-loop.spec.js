const { test, expect } = require('@playwright/test');

test('Agent Learning Loop - Explicit and dynamic user preference learning', async ({ page }) => {
  test.setTimeout(45000);
  
  const testEmail = `learning-loop-${Date.now()}@example.com`;
  const testPassword = 'password123';

  // 1. Navigate to login and sign up to get a clean dashboard
  await page.goto('/jobboard/login.html');
  await page.click('#toggleMode');
  await page.fill('#email', testEmail);
  await page.fill('#password', testPassword);
  await page.click('#submitBtn');

  // 2. Wait for redirect to Dashboard
  await page.waitForURL('**/index.html');
  await expect(page.locator('#welcomeTitle')).toContainText('Welcome back');

  // 3. Open Agent Panel
  const toggleBtn = page.locator('.agent-toggle-btn');
  await expect(toggleBtn).toBeVisible();
  await toggleBtn.click();

  const panel = page.locator('.agent-panel');
  await expect(panel).toHaveClass(/open/);

  const headerStatus = panel.locator('.agent-header-status');
  await expect(headerStatus).toContainText('Online', { timeout: 10000 });

  // 4. Send message to save a preference explicitly
  const inputField = panel.locator('.agent-input-field');
  const sendBtn = panel.locator('.agent-send-btn');

  // Request the agent to learn a rule
  await inputField.fill('Por favor, guarda la siguiente regla: Prefiero ofertas ubicadas únicamente en España.');
  await sendBtn.click();

  // Wait for the thinking indicator to be removed from the DOM
  await expect(panel.locator('.agent-msg.type-thinking')).toHaveCount(0, { timeout: 20000 });
  
  // Verify that the last message is from the agent (not user)
  const agentResponse = panel.locator('.agent-msg').last();
  await expect(agentResponse).not.toHaveClass(/role-user/);
  
  // 5. Send a new query to verify that the agent reloads and respects this preference in the system prompt
  await inputField.fill('¿Qué ubicación prefiero según mis preferencias guardadas?');
  await sendBtn.click();

  // Wait for the second response to finish processing
  await expect(panel.locator('.agent-msg.type-thinking')).toHaveCount(0, { timeout: 20000 });

  const finalResponse = panel.locator('.agent-msg').last();
  await expect(finalResponse).not.toHaveClass(/role-user/);
  
  // The LLM response should mention "España" since it was injected in the system prompt
  const textContent = await finalResponse.textContent();
  console.log('AGENT PREFERENCE REPLY:', textContent);
  expect(textContent.toLowerCase()).toContain('españa');
});

const { test, expect } = require('@playwright/test');

test('Agent Console UI and Onboarding flow E2E', async ({ page }) => {
  const testEmail = `test-agent-ui-${Date.now()}@example.com`;
  const testPassword = 'password123';

  // 1. Log in / Sign up
  await page.goto('/jobboard/login.html');
  await page.click('#toggleMode');
  await page.fill('#email', testEmail);
  await page.fill('#password', testPassword);
  await page.click('#submitBtn');

  // 2. Wait for Dashboard load
  await page.waitForURL('**/index.html');
  await expect(page.locator('#welcomeTitle')).toContainText('Welcome back');

  // 3. Verify Agent toggle button is visible
  const toggleBtn = page.locator('.agent-toggle-btn');
  await expect(toggleBtn).toBeVisible();
  await expect(toggleBtn.locator('.toggle-label')).toContainText('Agent');

  // 4. Open the Agent Console panel
  await toggleBtn.click();
  const panel = page.locator('.agent-panel');
  await expect(panel).toHaveClass(/open/);

  // 5. Verify onboarding invitation message & buttons
  const initMsg = panel.locator('.agent-msg.role-agent.type-action').first();
  await expect(initMsg).toBeVisible();
  await expect(initMsg).toContainText('Zenith Agent');
  await expect(initMsg).toContainText('investigue tu LinkedIn');

  const acceptBtn = initMsg.locator('button.variant-primary');
  await expect(acceptBtn).toContainText('Sí, investiga mi LinkedIn');

  // 6. Click "Sí, investiga" and verify running state
  await acceptBtn.click();

  // Bottom global status bar should appear
  const statusBar = page.locator('.agent-status-bar');
  await expect(statusBar).toBeVisible();
  await expect(statusBar).toContainText('Agent: Investigando LinkedIn');

  // Message for tool call should render
  const toolCall = panel.locator('.agent-msg.role-tool.type-tool_call');
  await expect(toolCall).toBeVisible();
  await expect(toolCall).toContainText('linkedin_profile_scraper');

  // Progress component should start counting
  const progressBlock = panel.locator('.agent-progress');
  await expect(progressBlock).toBeVisible();
  await expect(progressBlock.locator('.agent-progress-title')).toContainText('Investigación de perfil LinkedIn');

  // 7. Wait for full LinkedIn investigation simulation to finish (up to 20s)
  await expect(progressBlock.locator('.agent-progress-pct')).toContainText('100%', { timeout: 25000 });

  // Verification step: last checklist step should be completed
  const finalStep = progressBlock.locator('.agent-progress-step').last();
  await expect(finalStep).toHaveClass(/completed/);

  // Status bar should disappear when run finishes
  await expect(statusBar).not.toBeVisible();

  // Summary message with "Iniciar entrevista" button should show up
  const summaryMsg = panel.locator('.agent-msg.role-agent.type-chat').last();
  await expect(summaryMsg).toContainText('Investigación completada');
  await expect(summaryMsg).toContainText('Top Skills: Python, PyTorch');

  const startInterviewBtn = summaryMsg.locator('button.variant-primary');
  await expect(startInterviewBtn).toContainText('Iniciar entrevista');

  // 8. Start interactive interview
  await startInterviewBtn.click();

  // Question 1 should be displayed
  const q1 = panel.locator('.agent-msg.role-agent.type-chat').last();
  await expect(q1).toContainText('¿Qué tipo de rol estás buscando activamente?');

  // Send a response
  await panel.locator('.agent-input-field').fill('Individual Contributor / Senior Engineer');
  await panel.locator('.agent-send-btn').click();

  // Verification: user message added to list
  const userResp = panel.locator('.agent-msg.role-user').last();
  await expect(userResp).toContainText('Individual Contributor / Senior Engineer');

  // Agent should think and respond with Question 2
  const thinkingBlock = panel.locator('.agent-msg.role-agent.type-thinking');
  await expect(thinkingBlock).toBeVisible();

  const q2 = panel.locator('.agent-msg.role-agent.type-chat').last();
  await expect(q2).toContainText('rango salarial esperado', { timeout: 8000 });

  // 9. Close panel and verify state persists
  await panel.locator('.agent-close-btn').click();
  await expect(panel).not.toHaveClass(/open/);

  // Reload page and check if panel can be toggled open again and history remains
  await page.reload();
  await expect(toggleBtn).toBeVisible();
  await toggleBtn.click();
  await expect(panel).toHaveClass(/open/);
  await expect(panel.locator('.agent-msg.role-user').last()).toContainText('Individual Contributor');
});

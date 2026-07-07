const { test, expect } = require('@playwright/test');

test('Agent Onboarding and Profile Form E2E', async ({ page }) => {
  // Capture browser console logs
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  const testEmail = `test-onboarding-${Date.now()}@example.com`;
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

  // 3. Open the Agent Console panel
  const toggleBtn = page.locator('.agent-toggle-btn');
  await expect(toggleBtn).toBeVisible();
  await toggleBtn.click();

  const panel = page.locator('.agent-panel');
  await expect(panel).toHaveClass(/open/);

  // 4. Verify initial onboarding prompt and click "📋 Completar mi perfil profesional"
  const acceptBtn = panel.locator('button:has-text("Completar mi perfil profesional")');
  await expect(acceptBtn).toBeVisible();
  await acceptBtn.click();

  // 5. Verify it navigates to profile.html
  await page.waitForURL('**/profile.html');

  // Close the agent panel so it doesn't overlap the form
  await panel.locator('.agent-close-btn').click();
  await expect(panel).not.toHaveClass(/open/);

  // 6. Fill in the profile form
  await page.fill('#profile-full-name', 'Francisco Camacho');
  await page.fill('#profile-headline', 'Senior Software Architect');
  await page.fill('#profile-linkedin-url', 'https://www.linkedin.com/in/francisco-camacho');
  await page.fill('#profile-location', 'Madrid, España');
  await page.fill('#profile-summary', 'Experienced architect specializing in distributed systems and agentic AI.');

  // Submit the form
  await page.click('#profile-save-btn');

  // 7. Verify redirect back to Dashboard
  await page.waitForURL('**/index.html');

  // 8. Re-open Agent Console panel (which might have closed/reloaded on page transition)
  const classValue = await panel.getAttribute('class') || '';
  if (!classValue.includes('open')) {
    await toggleBtn.click();
  }
  await expect(panel).toHaveClass(/open/);

  // 9. Verify the agent detects the saved profile and shows interview prompt
  const finalWelcomeMsg = panel.locator('.agent-msg.role-agent.type-action', { hasText: 'Ya tengo tu perfil profesional cargado' });
  await expect(finalWelcomeMsg).toBeVisible({ timeout: 10000 });

  // 10. Click "Sí, empecemos" to start the interview
  const startInterviewBtn = finalWelcomeMsg.locator('button:has-text("Sí, empecemos")');
  await expect(startInterviewBtn).toBeVisible();
  await startInterviewBtn.click();

  // Verify transition to interviewing state
  const firstQuestion = panel.locator('.agent-msg.role-agent').last();
  await expect(firstQuestion).toContainText('¿Qué tipo de rol estás buscando');
});

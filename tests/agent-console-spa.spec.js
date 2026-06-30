const { test, expect } = require('@playwright/test');

test('Agent Console remains persistent across SPA page navigations without reload', async ({ page }) => {
  const testEmail = `test-agent-spa-${Date.now()}@example.com`;
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

  // 4. Click "Job Board" link in the sidebar
  const jobBoardLink = page.locator('.app-sidebar .nav-item', { hasText: 'Job Board' });
  await jobBoardLink.click();

  // Verify URL changes client-side
  await page.waitForURL('**/jobs.html');

  // Verify the page title updates to Jobs Board
  await expect(page.locator('.page-title')).toContainText('Job Applications');

  // CRITICAL VERIFICATION: The Agent Console panel MUST still be open (it did not close or re-initialize)
  await expect(panel).toHaveClass(/open/);

  // 5. Click "Business Board" link in the sidebar
  const bizBoardLink = page.locator('.app-sidebar .nav-item', { hasText: 'Business Board' });
  await bizBoardLink.click();

  // Verify URL changes client-side
  await page.waitForURL('**/business.html');

  // Verify page title updates to Business Connections
  await expect(page.locator('.page-title')).toContainText('Business Connections');

  // CRITICAL VERIFICATION: The Agent Console panel MUST still be open
  await expect(panel).toHaveClass(/open/);

  // 6. Close the panel, navigate back to Dashboard, verify it remains closed
  await panel.locator('.agent-close-btn').click();
  await expect(panel).not.toHaveClass(/open/);

  const dashLink = page.locator('.app-sidebar .nav-item', { hasText: 'Dashboard' });
  await dashLink.click();
  await page.waitForURL('**/index.html');
  await expect(panel).not.toHaveClass(/open/);
});

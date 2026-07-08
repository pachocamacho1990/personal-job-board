const { test, expect } = require('@playwright/test');

test('Agent Onboarding and Profile Form E2E', async ({ page }) => {
  // Grant clipboard permissions
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

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

  // 11. Play the interactive interview (TEST_MODE = true makes it deterministic)
  // Input: Question 1 Answer -> "Busco Senior Software Engineer"
  const chatInput = panel.locator('.agent-input-field');
  const sendBtn = panel.locator('.agent-send-btn');
  
  await chatInput.fill('Busco Senior Software Engineer');
  await sendBtn.click();

  // Wait for Question 2
  const secondQuestion = panel.locator('.agent-msg.role-agent.type-chat').last();
  await expect(secondQuestion).toContainText('¿Cuál es tu rango salarial objetivo', { timeout: 10000 });

  // Input: Question 2 Answer -> "Mi rango es 100k y remoto"
  await chatInput.fill('Mi rango es 100k y remoto');
  await sendBtn.click();

  // Wait for Question 3
  const thirdQuestion = panel.locator('.agent-msg.role-agent.type-chat').last();
  await expect(thirdQuestion).toContainText('¿Tienes alguna empresa o industria', { timeout: 10000 });

  // Input: Question 3 Answer -> "Excluir Acme Corp"
  await chatInput.fill('Excluir Acme Corp');
  await sendBtn.click();

  // 12. Verify Strategy Panel/Dashboard Tab is generated and visible
  await panel.locator('.agent-close-btn').click(); // Close agent panel to avoid overlay

  const searchTabBtn = page.locator('#searchPromptTabBtn');
  await expect(searchTabBtn).toBeVisible({ timeout: 15000 });
  await searchTabBtn.click();

  // Verify elements inside the search prompt tab
  const selectElement = page.locator('#dashboard-board-select');
  await expect(selectElement).toBeVisible();
  const boardIdStr = await selectElement.inputValue();
  const boardId = Number(boardIdStr);
  expect(boardId).toBeGreaterThan(0);

  const promptEditor = page.locator('#dashboard-prompt-editor');
  await expect(promptEditor).toBeVisible();
  const promptText = await promptEditor.inputValue();
  expect(promptText).toContain('Claude for Chrome');

  // Verify copy button
  const copyBtn = page.locator('#dashboard-copy-prompt-btn');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(copyBtn).toContainText('¡Prompt Copiado!');

  // Navigate to Strategy Tab to verify strategy summaries
  const strategyTabBtn = page.locator('#strategyTabBtn');
  await expect(strategyTabBtn).toBeVisible();
  await strategyTabBtn.click();

  const summaryBox = page.locator('#strategySummaryVal');
  await expect(summaryBox).toContainText('Senior Software Architect');

  const anchorBadge = page.locator('text=Competencia Técnico-Funcional');
  await expect(anchorBadge).toBeVisible();

  // Call the POST /api/jobs endpoint as if we are the extension
  await page.evaluate(async (bid) => {
    const token = localStorage.getItem('authToken');
    await fetch('/jobboard/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        boardId: bid,
        status: 'interested',
        origin: 'agent',
        company: 'Acme Corp Mocked',
        position: 'Senior Engineer Mocked',
        location: 'Remote',
        salary: '$100k',
        comments: 'Prueba de importación'
      })
    });
  }, boardId);

  // 14. Navigate to Job Board UI and verify card is visible
  await page.click('text=Job Board');
  await page.waitForURL('**/jobs.html');
  await page.waitForSelector('#appLoading', { state: 'hidden' });

  // Verify card exists on the board
  const jobCard = page.locator('.job-card', { hasText: 'Acme Corp Mocked' });
  await expect(jobCard).toBeVisible({ timeout: 10000 });
  await expect(jobCard.locator('h3')).toContainText('Senior Engineer Mocked');
});

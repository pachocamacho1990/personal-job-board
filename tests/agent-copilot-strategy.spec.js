const { test, expect } = require('@playwright/test');

test('Agent Copilot & Strategy Dashboard E2E', async ({ page }) => {
  test.setTimeout(60000);
  
  // Grant clipboard permissions
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  // Capture browser console logs
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  const testEmail = `copilot-e2e-${Date.now()}@example.com`;
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

  // 3. Open the Agent Console panel & Complete profile first
  const toggleBtn = page.locator('.agent-toggle-btn');
  await expect(toggleBtn).toBeVisible();
  await toggleBtn.click();

  const panel = page.locator('.agent-panel');
  await expect(panel).toHaveClass(/open/);

  const acceptBtn = panel.locator('button:has-text("Completar mi perfil profesional")');
  await expect(acceptBtn).toBeVisible();
  await acceptBtn.click();

  // Navigate and save profile details
  await page.waitForURL('**/profile.html');
  await panel.locator('.agent-close-btn').click(); // Close panel to avoid overlay
  
  await page.fill('#profile-full-name', 'Francisco Camacho');
  await page.fill('#profile-headline', 'Senior Software Architect');
  await page.fill('#profile-linkedin-url', 'https://www.linkedin.com/in/francisco-camacho');
  await page.fill('#profile-location', 'Madrid, España');
  await page.fill('#profile-summary', 'Experienced architect specializing in distributed systems and agentic AI.');
  await page.click('#profile-save-btn');

  // 4. Return to Dashboard and run interactive onboarding interview
  await page.waitForURL('**/index.html');
  await toggleBtn.click();
  await expect(panel).toHaveClass(/open/);

  const finalWelcomeMsg = panel.locator('.agent-msg.role-agent.type-action', { hasText: 'Ya tengo tu perfil profesional cargado' });
  await expect(finalWelcomeMsg).toBeVisible({ timeout: 10000 });

  const startInterviewBtn = finalWelcomeMsg.locator('button:has-text("Sí, empecemos")');
  await expect(startInterviewBtn).toBeVisible();
  await startInterviewBtn.click();

  // Answer 1: Target role
  const chatInput = panel.locator('.agent-input-field');
  const sendBtn = panel.locator('.agent-send-btn');
  
  await chatInput.fill('Busco Senior Software Engineer');
  await sendBtn.click();

  // Answer 2: Salary & remote
  await expect(panel.locator('.agent-msg.role-agent.type-chat').last()).toContainText('¿Cuál es tu rango salarial objetivo', { timeout: 10000 });
  await chatInput.fill('Mi rango es 100k y remoto');
  await sendBtn.click();

  // Answer 3: Exclusions
  await expect(panel.locator('.agent-msg.role-agent.type-chat').last()).toContainText('¿Tienes alguna empresa o industria', { timeout: 10000 });
  await chatInput.fill('Excluir Acme Corp');
  await sendBtn.click();

  // Onboarding ready message appears
  await expect(panel.locator('.agent-msg.role-agent.type-chat').last()).toContainText('He analizado tu perfil y he estructurado tu estrategia', { timeout: 15000 });

  // Close agent panel
  await panel.locator('.agent-close-btn').click();

  // 5. Navigate to Search Prompt Tab in Dashboard
  const searchTabBtn = page.locator('#searchPromptTabBtn');
  await expect(searchTabBtn).toBeVisible({ timeout: 5000 });
  await searchTabBtn.click();

  // Verify elements in Search Prompt tab
  await expect(page.locator('#dashboard-board-select')).toBeVisible();
  const promptEditor = page.locator('#dashboard-prompt-editor');
  await expect(promptEditor).toBeVisible();
  await expect(promptEditor).toContainText('Eres un agente de búsqueda de empleo');

  // Edit and save search prompt
  await promptEditor.fill('Eres un agente de búsqueda de empleo automatizado. Guardar en boardId: {board_id}');
  await page.click('#dashboard-save-prompt-btn');
  await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });

  // Test Copy Prompt
  await page.click('#dashboard-copy-prompt-btn');
  await expect(page.locator('#dashboard-copy-prompt-btn')).toContainText('¡Prompt Copiado!');

  // Navigate to Strategy Tab in Dashboard
  const strategyTabBtn = page.locator('#strategyTabBtn');
  await expect(strategyTabBtn).toBeVisible();
  await strategyTabBtn.click();

  // Verify elements in strategy view
  await expect(page.locator('#strategyCardGrid')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#strategySummaryVal')).toContainText('enfocado en');
  await expect(page.locator('text=Estilo de Vida (Lifestyle)')).toBeVisible();

  // 6. Test Memory deletion
  // Let's verify our memory is loaded
  await expect(page.locator('#memoriesList')).toBeVisible();
  const memoryItemsCount = await page.locator('#memoriesList .memory-item').count();
  
  // Since this is a fresh user, there should be at least one learned memory rule
  if (memoryItemsCount > 0) {
    const firstMemory = page.locator('#memoriesList .memory-item').first();
    const deleteBtn = firstMemory.locator('.memory-delete-btn');
    
    // Accept dialog confirm
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('¿Estás seguro de que quieres eliminar esta preferencia?');
      await dialog.accept();
    });
    
    await deleteBtn.click();
    
    // Memory item should disappear or count should decrease
    await expect(page.locator('#memoriesList .memory-item')).toHaveCount(memoryItemsCount - 1, { timeout: 5000 });
  }

  // 7. Get board select value to add card
  await page.click('text=Job Board');
  await page.waitForURL('**/jobs.html');
  await page.waitForSelector('#appLoading', { state: 'hidden' });

  // Add a new job card manually
  await page.click('#addJobBtn');
  await page.fill('#company', 'Google');
  await page.fill('#position', 'Staff Agentic Engineer');
  await page.fill('#location', 'Mountain View, CA');
  await page.fill('#salary', '$250,000');
  
  // Fill description comments
  const commentsArea = page.locator('#comments');
  await commentsArea.fill('We are seeking an agentic engineering lead to design large language models workflows and tools.');
  
  await page.click('button[type="submit"]');

  // Open the newly created Google job card
  const newCard = page.locator('.job-card', { hasText: 'Google' });
  await expect(newCard).toBeVisible({ timeout: 8000 });
  await newCard.click();

  // Click "Edit Details" button inside CenterPeek to open DetailPanel sidebar
  const editBtn = page.locator('#editJobFromPeek');
  await expect(editBtn).toBeVisible({ timeout: 5000 });
  await editBtn.click();

  // Verify details panel is open and click AI Copilot accordion
  const detailPanel = page.locator('#detailPanel');
  await expect(detailPanel).toHaveClass(/open/);


  const copilotHeader = page.locator('#copilotAccordionHeader');
  await expect(copilotHeader).toBeVisible();
  await copilotHeader.click();

  // Check generated button is visible
  const generateBtn = page.locator('#generateCopilotBtn');
  await expect(generateBtn).toBeVisible();
  await generateBtn.click();

  // Wait for LLM generation response
  await expect(page.locator('#copilotDocResult')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#copilotDocResult')).not.toContainText('Generando');

  // Verify copy button
  const copyDocBtn = page.locator('#copyCopilotDocBtn');
  await expect(copyDocBtn).toBeVisible();
  await copyDocBtn.click();
  await expect(copyDocBtn).toContainText('¡Copiado!');
  
  // Clean up: Close panel and delete job
  await page.locator('#deleteBtn').click();
  await page.click('#confirmDelete');
  await expect(newCard).not.toBeVisible();
});

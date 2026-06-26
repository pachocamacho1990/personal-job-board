const { test, expect } = require('@playwright/test');

test('should support creating multiple isolated boards', async ({ page }) => {
    // Generate unique email to prevent database conflicts
    const testEmail = `test-playwright-${Date.now()}@example.com`;
    const testPassword = 'password123';

    // 1. Navigate to Login Page
    await page.goto('/jobboard/login.html');
    
    // Toggle to Sign Up form
    await page.click('#toggleMode');
    await expect(page.locator('#formTitle')).toContainText('Create Account');

    // 2. Register new user
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('#submitBtn');

    // 3. Wait for redirect to Dashboard
    await page.waitForURL('**/index.html');
    await expect(page.locator('#welcomeTitle')).toContainText('Welcome back');

    // 4. Navigate to Job Board
    await page.click('text=Job Board');
    await page.waitForURL('**/jobs.html');
    
    // Wait for the loading overlay to hide
    await page.waitForSelector('#appLoading', { state: 'hidden' });

    // Verify default board "Mi Tablero" is loaded and visible
    await expect(page.locator('.page-title')).toContainText('Job Applications - Mi Tablero');
    await expect(page.locator('.board-nav-item.active')).toContainText('Mi Tablero');

    // 5. Create first board "Nuevo Tablero UI"
    let dialogText = 'Nuevo Tablero UI';
    page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept(dialogText);
    });
    
    await page.click('#newBoardBtn');
    
    // Verify "Nuevo Tablero UI" is active and page title is updated
    await expect(page.locator('.page-title')).toContainText('Job Applications - Nuevo Tablero UI');
    await expect(page.locator('.board-nav-item.active')).toContainText('Nuevo Tablero UI');

    // 6. Add a card to "Nuevo Tablero UI"
    await page.click('#addJobBtn');
    
    // Wait for right sidebar panel to open
    const detailPanel = page.locator('#detailPanel');
    await expect(detailPanel).toHaveClass(/open/);
    
    await page.fill('#company', 'UI Test Company');
    await page.fill('#position', 'QA Automation Engineer');
    await page.selectOption('#status', 'interested');
    await page.click('#jobForm button[type="submit"]');

    // Wait for panel to close and verify the card appears in "Interested" column
    await expect(detailPanel).not.toHaveClass(/open/);
    const firstBoardCard = page.locator('.column[data-status="interested"] .job-card');
    await expect(firstBoardCard).toBeVisible();
    await expect(firstBoardCard.locator('.company')).toContainText('UI Test Company');

    // 7. Create second board "Tablero Anterior"
    dialogText = 'Tablero Anterior';
    page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept(dialogText);
    });

    await page.click('#newBoardBtn');

    // Verify it switches active board to "Tablero Anterior"
    await expect(page.locator('.page-title')).toContainText('Job Applications - Tablero Anterior');
    await expect(page.locator('.board-nav-item.active')).toContainText('Tablero Anterior');

    // Verify board is EMPTY (data isolation check)
    const secondBoardCard = page.locator('.column[data-status="interested"] .job-card');
    await expect(secondBoardCard).not.toBeVisible();

    // 8. Switch back to "Nuevo Tablero UI" and verify card is visible again
    await page.locator('.board-nav-item', { hasText: 'Nuevo Tablero UI' }).click();
    await expect(page.locator('.page-title')).toContainText('Job Applications - Nuevo Tablero UI');
    await expect(page.locator('.board-nav-item.active')).toContainText('Nuevo Tablero UI');
    await expect(firstBoardCard).toBeVisible();

    // 9. Switch back to "Tablero Anterior" and verify it remains empty
    await page.locator('.board-nav-item', { hasText: 'Tablero Anterior' }).click();
    await expect(page.locator('.page-title')).toContainText('Job Applications - Tablero Anterior');
    await expect(secondBoardCard).not.toBeVisible();
});

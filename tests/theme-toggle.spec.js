const { test, expect } = require('@playwright/test');

const THEME_ATTR = 'data-carbon-theme';

// The Carbon greys the two themes paint the page with (--cds-gray-10 / -100).
// Asserted as computed values so the test fails if the attribute flips but no
// styling follows it.
const LIGHT_BG = 'rgb(244, 244, 244)';
const DARK_BG = 'rgb(22, 22, 22)';

const bodyBackground = (page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const storedTheme = (page) =>
    page.evaluate(() => localStorage.getItem('carbonTheme'));

/**
 * Registers a throwaway user and lands on the Dashboard, which is the first
 * page that renders the Sidebar (and therefore the theme toggle).
 */
async function signUpAndLand(page, label) {
    const testEmail = `test-playwright-${label}-${Date.now()}@example.com`;
    const testPassword = 'password123';

    await page.goto('/jobboard/login.html');

    await page.click('#toggleMode');
    await expect(page.locator('#formTitle')).toContainText('Create Account');

    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('#submitBtn');

    await page.waitForURL('**/index.html');
    await expect(page.locator('#welcomeTitle')).toContainText('Welcome back');
}

test.describe('Theme toggle', () => {
    // No system preference in play: these tests are about the explicit choice.
    test.use({ colorScheme: 'light' });

    test('defaults to g10 on <html> and stores nothing until the user chooses', async ({ page }) => {
        await signUpAndLand(page, 'theme-default');

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g10');
        expect(await bodyBackground(page)).toBe(LIGHT_BG);

        // Resolving a theme at startup must not be recorded as a preference.
        expect(await storedTheme(page)).toBeNull();
    });

    test('flips the attribute, aria-pressed, the label and the painted background', async ({ page }) => {
        await signUpAndLand(page, 'theme-flip');

        const toggle = page.locator('.theme-toggle');
        await expect(toggle).toBeVisible();

        // The label reports the theme that is currently active, while the
        // tooltip describes the action the click would perform.
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(toggle).toContainText('Tema claro');
        await expect(toggle).toHaveAttribute('title', 'Cambiar a tema oscuro');

        await toggle.click();

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await expect(toggle).toContainText('Tema oscuro');
        await expect(toggle).toHaveAttribute('title', 'Cambiar a tema claro');
        expect(await bodyBackground(page)).toBe(DARK_BG);

        // And back again, so the toggle is proven to be a toggle.
        await toggle.click();

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g10');
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(toggle).toContainText('Tema claro');
        expect(await bodyBackground(page)).toBe(LIGHT_BG);
    });

    test('persists the choice to localStorage and survives a reload', async ({ page }) => {
        await signUpAndLand(page, 'theme-persist');

        await page.locator('.theme-toggle').click();
        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');
        expect(await storedTheme(page)).toBe('g100');

        await page.reload();
        await expect(page.locator('#welcomeTitle')).toContainText('Welcome back');

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');
        await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-pressed', 'true');
        expect(await bodyBackground(page)).toBe(DARK_BG);
    });

    test('carries the stored theme to a hard load of another board page', async ({ page }) => {
        await signUpAndLand(page, 'theme-crosspage');

        await page.locator('.theme-toggle').click();
        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');

        // Full navigation, not SPA routing: the theme has to be re-resolved
        // from storage by the fresh bundle.
        await page.goto('/jobboard/jobs.html');
        await page.waitForSelector('#appLoading', { state: 'hidden' });

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');
        await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-pressed', 'true');
        expect(await bodyBackground(page)).toBe(DARK_BG);
    });

    test('honours the stored theme on docs.html, which renders no toggle of its own', async ({ page }) => {
        await signUpAndLand(page, 'theme-docs');

        // Baseline: docs under the default light theme.
        await page.goto('/jobboard/docs.html');
        await expect(page.locator('.docs-sidebar')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g10');
        expect(await bodyBackground(page)).toBe(LIGHT_BG);

        // The docs page has no Sidebar, so there is nothing to toggle here.
        await expect(page.locator('.theme-toggle')).toHaveCount(0);

        // Choose dark elsewhere, then come back with a full page load.
        await page.goto('/jobboard/index.html');
        await page.locator('.theme-toggle').click();
        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');

        await page.goto('/jobboard/docs.html');
        await expect(page.locator('.docs-sidebar')).toBeVisible();

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');
        await expect(page.locator('.theme-toggle')).toHaveCount(0);
        expect(await bodyBackground(page)).toBe(DARK_BG);
    });
});

test.describe('Theme toggle with a dark system preference', () => {
    test.use({ colorScheme: 'dark' });

    test('resolves to g100 without writing a preference', async ({ page }) => {
        await signUpAndLand(page, 'theme-sys-dark');

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');
        await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-pressed', 'true');
        expect(await bodyBackground(page)).toBe(DARK_BG);

        // Following the OS is not a decision the user made, so nothing is stored.
        expect(await storedTheme(page)).toBeNull();
    });

    test('a stored light choice outranks the dark system setting', async ({ page }) => {
        await signUpAndLand(page, 'theme-sys-override');

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g100');

        // Explicitly pick light while the OS still says dark.
        await page.locator('.theme-toggle').click();
        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g10');
        expect(await storedTheme(page)).toBe('g10');

        await page.reload();
        await expect(page.locator('#welcomeTitle')).toContainText('Welcome back');

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g10');
        await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-pressed', 'false');
        expect(await bodyBackground(page)).toBe(LIGHT_BG);
    });
});

test.describe('Theme toggle with a light system preference', () => {
    test.use({ colorScheme: 'light' });

    test('resolves to g10 without writing a preference', async ({ page }) => {
        await signUpAndLand(page, 'theme-sys-light');

        await expect(page.locator('html')).toHaveAttribute(THEME_ATTR, 'g10');
        expect(await bodyBackground(page)).toBe(LIGHT_BG);
        expect(await storedTheme(page)).toBeNull();
    });
});

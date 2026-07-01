const { test, expect } = require('@playwright/test');

test('AI Match - Flow from creation to archive hides match on dashboard', async ({ page }) => {
  const testEmail = `match-test-${Date.now()}@example.com`;
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

  // 3. Extract the JWT token from localStorage to authenticate API calls
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  expect(token).not.toBeNull();

  // 4. Create an AI match job card in "interested" column via POST request
  const createResponse = await page.request.post('/jobboard/api/jobs', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      company: 'Test Match Corp',
      position: 'E2E Match Engineer',
      status: 'interested',
      origin: 'agent' // Sets is_unseen to true automatically in backend
    }
  });

  if (!createResponse.ok()) {
    console.error('Create Response failed:', createResponse.status(), await createResponse.text());
  }
  expect(createResponse.ok()).toBeTruthy();
  const job = await createResponse.json();
  console.log('CREATED JOB:', job);
  expect(job.is_unseen).toBe(true);
  expect(job.status).toBe('interested');

  // 5. Navigate to Dashboard (or reload) and verify the match is listed
  await page.goto('/jobboard/index.html');
  const matchElement = page.locator('#newMatchesList .list-item', { hasText: 'Test Match Corp' });
  await expect(matchElement).toBeVisible();

  // 6. Update the job status to "archived" (simulating agent/user archive action)
  const updateResponse = await page.request.put(`/jobboard/api/jobs/${job.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      status: 'archived'
    }
  });
  expect(updateResponse.ok()).toBeTruthy();
  const updatedJob = await updateResponse.json();
  console.log('UPDATED JOB:', updatedJob);
  
  // The backend controller must have automatically set is_unseen to false
  expect(updatedJob.is_unseen).toBe(false);
  expect(updatedJob.status).toBe('archived');

  // 7. Reload dashboard page and verify the match is no longer listed
  await page.goto('/jobboard/index.html');
  await expect(matchElement).not.toBeVisible();
});

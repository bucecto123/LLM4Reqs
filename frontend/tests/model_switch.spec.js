import { test, expect } from '@playwright/test';

test('test model switching functionality', async ({ page }) => {
  // 1. Go to the dashboard
  await page.goto('http://localhost:5173/');

  // Check if redirected to login
  if (page.url().includes('/login')) {
    console.log('Redirected to login. Logging in...');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');
  }

  // 2. Locate the Model Selector
  // Wait for model selector to be attached to DOM
  const modelSelector = page.locator('button[title="Select AI Model"]');
  await expect(modelSelector).toBeVisible({ timeout: 15000 });

  // Get initial model name
  const initialModelName = await modelSelector.textContent();
  console.log(`Initial model: ${initialModelName}`);

  // 3. Open the dropdown
  await modelSelector.click();

  // 4. Find the dropdown items
  const dropdown = page.locator('.absolute.right-0.mt-2.w-72'); // Class from your code
  await expect(dropdown).toBeVisible();

  // 5. Select a different model
  // We look for buttons inside the dropdown that are NOT the selected one
  const modelButtons = dropdown.locator('button');
  const count = await modelButtons.count();
  
  if (count <= 1) {
      console.log('Only one model available, cannot test switching.');
      return;
  }

  // Click the last available model to ensure a switch
  await modelButtons.last().click();

  // 6. Verify the change
  // The dropdown should close
  await expect(dropdown).not.toBeVisible();
  
  // The button text should change
  const newModelName = await modelSelector.textContent();
  console.log(`New model: ${newModelName}`);

  expect(newModelName).not.toBe(initialModelName);
});

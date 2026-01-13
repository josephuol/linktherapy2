import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright tests
 * Authenticates as admin and stores the auth state for reuse across tests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Navigate to admin login
    console.log('🔐 Attempting admin login...')
    await page.goto(`${baseURL}/admin/login`)

    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Fill in admin credentials
    const testEmail = process.env.TEST_ADMIN_EMAIL || 'admin@linktherapy.com'
    const testPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123'

    console.log(`   Using email: ${testEmail}`)

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill(testEmail)
    await passwordInput.fill(testPassword)

    // Click sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i })
    await signInButton.click()

    // Wait for navigation - either to admin dashboard or back to login with error
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify we're logged in by checking if we're on an admin page
    const currentUrl = page.url()

    if (currentUrl.includes('/admin/login')) {
      console.error('\n❌ Admin login failed - still on login page')
      console.error('   Current URL:', currentUrl)
      console.error('\n   Please ensure you have a valid admin account with these credentials:')
      console.error(`   Email: ${testEmail}`)
      console.error(`   Password: [hidden]\n`)
      console.error('   You can set custom credentials using environment variables:')
      console.error('   TEST_ADMIN_EMAIL=your@email.com TEST_ADMIN_PASSWORD=yourpass npx playwright test\n')

      await browser.close()
      throw new Error('Admin authentication failed - credentials invalid or admin account not found')
    }

    if (!currentUrl.includes('/admin')) {
      console.error('❌ Unexpected redirect after login')
      console.error('   Current URL:', currentUrl)
      await browser.close()
      throw new Error('Admin authentication failed - unexpected redirect')
    }
  } catch (error) {
    console.error('\n❌ Error during authentication setup:', error)
    await browser.close()
    throw error
  }

  console.log('✅ Admin authentication successful')

  // Save signed-in state to 'storageState.json'
  await page.context().storageState({ path: 'tests/e2e/.auth/admin.json' })

  await browser.close()
}

export default globalSetup

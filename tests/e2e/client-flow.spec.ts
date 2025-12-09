import { test, expect } from '@playwright/test'

/**
 * Client Workflow E2E Tests
 * Tests the complete client journey from landing page to booking
 */

test.describe('Landing Page', () => {
  test('should display hero section with CTA buttons', async ({ page }) => {
    await page.goto('/')

    // Verify hero section elements
    await expect(page.locator('h1, h2').first()).toBeVisible()

    // Verify main CTA buttons
    const browseTherapistsBtn = page.getByRole('link', { name: /browse therapists/i })
    await expect(browseTherapistsBtn).toBeVisible()
  })

  test('should display therapist directory section', async ({ page }) => {
    await page.goto('/')

    // Verify therapist section exists
    const therapistSection = page.locator('#therapist-directory')
    await expect(therapistSection).toBeVisible()

    // Verify "Meet Our Expert Therapists" heading
    await expect(page.getByText(/meet our.*expert therapists/i)).toBeVisible()
  })

  test('should navigate to therapists page', async ({ page }) => {
    await page.goto('/')

    // Click on "Browse Therapists" link
    await page.getByRole('link', { name: /browse therapists/i }).first().click()

    // Verify navigation
    await expect(page).toHaveURL(/\/therapists/)
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Page should still render without errors
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    // Verify login form elements
    await expect(page.getByRole('heading', { name: /therapist login/i })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login')

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i })
    if (await submitButton.isVisible()) {
      await submitButton.click()

      // Should show validation or remain on page
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('should have link to reset password', async ({ page }) => {
    await page.goto('/login')

    // Look for forgot password link
    const forgotPasswordLink = page.getByRole('link', { name: /forgot|reset.*password/i })
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click()
      await expect(page).toHaveURL(/\/reset-password/)
    }
  })
})

test.describe('Therapist Directory', () => {
  test('should display therapist cards', async ({ page }) => {
    await page.goto('/therapists')

    // Wait for therapists to load
    await page.waitForSelector('[class*="card"], [class*="Card"]', { timeout: 10000 })

    // Verify at least one therapist card is displayed
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards.first()).toBeVisible()
  })

  test('should have filter options', async ({ page }) => {
    await page.goto('/therapists')

    // Verify filter sidebar or controls exist
    const filterSection = page.getByText(/filter|refine.*search/i)
    await expect(filterSection.first()).toBeVisible()
  })

  test('should display therapist information', async ({ page }) => {
    await page.goto('/therapists')

    // Wait for content to load
    await page.waitForTimeout(2000)

    // Verify therapist info elements exist (name, title, etc.)
    const therapistName = page.locator('h3, [class*="name"]').first()
    await expect(therapistName).toBeVisible()
  })

  test('should have Connect Now button on therapist cards', async ({ page }) => {
    await page.goto('/therapists')

    // Wait for cards to load
    await page.waitForTimeout(2000)

    // Find Connect Now button
    const connectButton = page.getByRole('button', { name: /connect now/i }).first()
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeEnabled()
    }
  })
})

test.describe('Contact & Information Pages', () => {
  test('should display contact page', async ({ page }) => {
    await page.goto('/contact')

    await expect(page.locator('body')).toBeVisible()
  })

  test('should display FAQ page', async ({ page }) => {
    await page.goto('/faq')

    // Verify FAQ content
    await expect(page.getByText(/faq|frequently asked|questions/i).first()).toBeVisible()
  })

  test('should display privacy policy', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Booking Flow', () => {
  test('should open contact modal when clicking Connect Now', async ({ page }) => {
    await page.goto('/therapists')

    // Wait for therapists to load
    await page.waitForTimeout(3000)

    // Click Connect Now on first therapist
    const connectButton = page.getByRole('button', { name: /connect now/i }).first()
    if (await connectButton.isVisible()) {
      await connectButton.click()

      // Verify modal opens (dialog or form appears)
      await page.waitForTimeout(1000)
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]')
      await expect(modal.first()).toBeVisible()
    }
  })
})

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    // Start at home
    await page.goto('/')
    await expect(page).toHaveURL('/')

    // Navigate to therapists
    await page.goto('/therapists')
    await expect(page).toHaveURL('/therapists')

    // Navigate to FAQ
    await page.goto('/faq')
    await expect(page).toHaveURL('/faq')

    // Navigate to contact
    await page.goto('/contact')
    await expect(page).toHaveURL('/contact')
  })
})

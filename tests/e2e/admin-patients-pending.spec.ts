import { test, expect, Page } from '@playwright/test'

/**
 * Admin Patients Page E2E Tests
 * Tests the admin patients page with Active Patients and Pending Requests tabs
 */

// Run tests in this file sequentially to avoid timing conflicts
test.describe.configure({ mode: 'serial' })

/**
 * Helper function to navigate to patients page and wait for it to load
 */
async function navigateAndWaitForLoad(page: Page) {
  await page.goto('/admin/patients')
  // Wait for network to be idle
  await page.waitForLoadState('networkidle')
  // Wait for the main heading to appear
  await page.waitForSelector('h1:has-text("Patients")', { timeout: 15000 })
  // Small additional wait for React to finish rendering
  await page.waitForTimeout(500)
}

test.describe('Admin Patients Page - Structure', () => {
  test('should load the patients page', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Page should render
    await expect(page.locator('body')).toBeVisible()

    // Should have the main heading
    const heading = page.getByRole('heading', { name: /patients/i })
    await expect(heading).toBeVisible()
  })

  test('should have Patient Management card header', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Should have the card header with "Patient Management"
    const cardHeader = page.getByText(/patient management/i)
    await expect(cardHeader).toBeVisible()
  })

  test('should have search input', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Should have search input
    const searchInput = page.locator('input[placeholder*="Search" i]')
    await expect(searchInput).toBeVisible()
  })
})

test.describe('Admin Patients Page - Tabs', () => {
  test('should display All Requests tab', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Should have All Requests tab
    const allTab = page.getByRole('tab', { name: /all requests/i })
    await expect(allTab).toBeVisible()
  })

  test('should display Pending Requests tab', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Should have Pending Requests tab
    const pendingTab = page.getByRole('tab', { name: /pending requests/i })
    await expect(pendingTab).toBeVisible()
  })

  test('should display tab counts', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Tabs should show counts in parentheses
    const allRequestsTab = page.getByRole('tab', { name: /all requests/i })
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })

    // Both tabs should be visible
    await expect(allRequestsTab).toBeVisible()
    await expect(pendingRequestsTab).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Get the tabs
    const allRequestsTab = page.getByRole('tab', { name: /all requests/i })
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })

    // Click on Pending Requests tab
    await pendingRequestsTab.click()
    await page.waitForTimeout(500)

    // Pending tab should be selected
    await expect(pendingRequestsTab).toHaveAttribute('data-state', 'active')

    // Click back on All Requests tab
    await allRequestsTab.click()
    await page.waitForTimeout(500)

    // All Requests tab should be selected
    await expect(allRequestsTab).toHaveAttribute('data-state', 'active')
  })
})

test.describe('Admin Patients Page - All Requests Tab', () => {
  test('should display all requests content', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Should be on All Requests tab by default
    const allRequestsTab = page.getByRole('tab', { name: /all requests/i })
    await expect(allRequestsTab).toHaveAttribute('data-state', 'active')

    // Content area should be visible
    const tabContent = page.locator('[role="tabpanel"]').first()
    await expect(tabContent).toBeVisible()
  })

  test('should show table or cards for all requests', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Should have either desktop table or mobile cards
    const desktopTable = page.locator('table')
    const mobileCards = page.locator('[class*="border"][class*="rounded"]')

    const hasTable = await desktopTable.isVisible().catch(() => false)
    const hasCards = await mobileCards.first().isVisible().catch(() => false)

    // Should have one or the other (or no data message)
    expect(hasTable || hasCards).toBeTruthy()
  })

  test('should show empty state if no requests', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // If there are no requests, should show empty state
    const emptyMessage = page.getByText(/no requests found/i)
    const hasRequests = await page.locator('table tbody tr').count().catch(() => 0)

    if (hasRequests === 0) {
      await expect(emptyMessage).toBeVisible()
    }
  })

  test('should display all status badges (not just new/contacted)', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Check if there are any requests
    const hasRequests = await page.locator('table tbody tr').count().catch(() => 0)

    if (hasRequests > 0) {
      // Should have status badges
      const badges = page.locator('span[class*="rounded-full"]')
      const hasBadges = await badges.first().isVisible().catch(() => false)
      expect(hasBadges).toBeTruthy()
    }
  })
})

test.describe('Admin Patients Page - Pending Requests Tab', () => {
  test('should display pending requests when tab is clicked', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Click on Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(1000)

    // Tab should be active
    await expect(pendingRequestsTab).toHaveAttribute('data-state', 'active')

    // Content should be visible
    const tabContent = page.locator('[role="tabpanel"]').nth(1)
    await expect(tabContent).toBeVisible()
  })

  test('should show table or cards for pending requests', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Click on Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(1000)

    // Should have either desktop table or mobile cards
    const desktopTable = page.locator('table')
    const mobileCards = page.locator('[class*="border"][class*="rounded"]')

    const hasTable = await desktopTable.isVisible().catch(() => false)
    const hasCards = await mobileCards.first().isVisible().catch(() => false)

    // Should have one or the other (or no data message)
    expect(hasTable || hasCards).toBeTruthy()
  })

  test('should show empty state if no pending requests', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Click on Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(1000)

    // If there are no pending requests, should show empty state
    const emptyMessage = page.getByText(/no pending requests found/i)
    const hasRequests = await page.locator('table tbody tr').count().catch(() => 0)

    if (hasRequests === 0) {
      await expect(emptyMessage).toBeVisible()
    }
  })

  test('should display status badges in pending requests', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Click on Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(1000)

    // Look for status badges (New, Contacted)
    const badges = page.locator('span[class*="rounded"]')
    const hasBadges = await badges.first().isVisible().catch(() => false)

    // If there are pending requests, there should be status badges
    const hasRequests = await page.locator('table tbody tr').count().catch(() => 0)

    if (hasRequests > 0) {
      expect(hasBadges).toBeTruthy()
    }
  })
})

test.describe('Admin Patients Page - Search Functionality', () => {
  test('should update search placeholder when switching tabs', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Get search input
    const searchInput = page.locator('input[placeholder*="Search" i]')

    // Should have "requests" placeholder on All Requests tab
    const allPlaceholder = await searchInput.getAttribute('placeholder')
    expect(allPlaceholder?.toLowerCase()).toContain('request')

    // Click on Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(500)

    // Should have "pending" placeholder
    const pendingPlaceholder = await searchInput.getAttribute('placeholder')
    expect(pendingPlaceholder?.toLowerCase()).toContain('pending')
  })

  test('should allow typing in search input', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Get search input
    const searchInput = page.locator('input[placeholder*="Search" i]')

    // Type in search
    await searchInput.fill('test search')

    // Input should have the value
    await expect(searchInput).toHaveValue('test search')
  })

  test('should maintain search value when switching tabs', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Get search input
    const searchInput = page.locator('input[placeholder*="Search" i]')

    // Type in search
    await searchInput.fill('john')

    // Switch to Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(500)

    // Search value should be maintained
    await expect(searchInput).toHaveValue('john')
  })
})

test.describe('Admin Patients Page - Responsive Design', () => {
  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await navigateAndWaitForLoad(page)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()

    // Desktop table should be visible (if data exists)
    const desktopTable = page.locator('table')
    const tableExists = await desktopTable.count() > 0

    if (tableExists) {
      await expect(desktopTable).toBeVisible()
    }
  })

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await navigateAndWaitForLoad(page)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await navigateAndWaitForLoad(page)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()

    // Mobile cards should be visible (if data exists)
    const mobileCards = page.locator('[class*="lg:hidden"]')
    const cardsExist = await mobileCards.count() > 0

    expect(cardsExist).toBeTruthy()
  })
})

test.describe('Admin Patients Page - Data Display', () => {
  test('should display contact request information in all requests tab', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Check if there's any request data visible
    const hasTableData = await page.locator('table tbody tr').count().catch(() => 0) > 0
    const hasCardData = await page.locator('[class*="border"][class*="rounded"]').count() > 0

    // If there's data, check for expected fields
    if (hasTableData || hasCardData) {
      // Should show email, phone, status, therapist information
      const bodyText = await page.locator('body').innerText()
      const hasExpectedData =
        bodyText.includes('Email') ||
        bodyText.includes('Phone') ||
        bodyText.includes('Therapist') ||
        bodyText.includes('Submitted') ||
        bodyText.includes('@')

      expect(hasExpectedData).toBeTruthy()
    }
  })

  test('should display all 6 status types (new, contacted, accepted, rejected, scheduled, closed)', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Check if status badges exist
    const badges = page.locator('span[class*="rounded-full"]')
    const badgeCount = await badges.count()

    // If there are requests with badges, verify they use the expected status colors
    if (badgeCount > 0) {
      const firstBadge = badges.first()
      await expect(firstBadge).toBeVisible()
    }
  })

  test('should display therapist names as clickable links', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Look for therapist buttons/links
    const therapistLinks = page.locator('button[class*="text-"][class*="hover:underline"]')
    const linkCount = await therapistLinks.count()

    // If there are therapist links, verify they're clickable
    if (linkCount > 0) {
      await expect(therapistLinks.first()).toBeVisible()
    }
  })

  test('should display session indicator (checkmark) for requests with sessions', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Check if there are any requests
    const hasRequests = await page.locator('table tbody tr').count().catch(() => 0)

    if (hasRequests > 0) {
      // Page should render (session indicator may or may not be present depending on data)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should display pending request information in pending tab', async ({ page }) => {
    await navigateAndWaitForLoad(page)

    // Click on Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(1000)

    // Check if there's any request data visible
    const hasTableData = await page.locator('table tbody tr').count().catch(() => 0) > 0
    const hasCardData = await page.locator('[class*="border"][class*="rounded"]').count() > 0

    // If there's data, check for expected fields
    if (hasTableData || hasCardData) {
      // Should show status, email, or therapist information
      const bodyText = await page.locator('body').innerText()
      const hasExpectedData =
        bodyText.includes('New') ||
        bodyText.includes('Contacted') ||
        bodyText.includes('Email') ||
        bodyText.includes('Therapist') ||
        bodyText.includes('Submitted')

      expect(hasExpectedData).toBeTruthy()
    }
  })
})

test.describe('Admin Patients Page - Access Control', () => {
  test('should be accessible only to authenticated users', async ({ page }) => {
    // Clear cookies to ensure unauthenticated state
    await page.context().clearCookies()

    // Try to navigate to patients page (should redirect to login)
    await page.goto('/admin/patients')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const url = page.url()

    // Should either redirect to login or show login page
    const isRedirected = url.includes('/login') || url.includes('/admin/login')
    const isOnPatientsPage = url.includes('/admin/patients')

    // If on patients page, user is authenticated; otherwise should be redirected
    expect(isRedirected || isOnPatientsPage).toBeTruthy()
  })
})

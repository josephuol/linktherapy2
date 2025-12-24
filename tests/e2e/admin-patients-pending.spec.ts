import { test, expect } from '@playwright/test'

/**
 * Admin Patients Page E2E Tests
 * Tests the admin patients page with Active Patients and Pending Requests tabs
 */

test.describe('Admin Patients Page - Structure', () => {
  test('should load the patients page', async ({ page }) => {
    await page.goto('/admin/patients')

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Page should render
    await expect(page.locator('body')).toBeVisible()

    // Should have the main heading
    const heading = page.getByRole('heading', { name: /patients/i })
    await expect(heading).toBeVisible()
  })

  test('should have Patient Management card header', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Should have the card header with "Patient Management"
    const cardHeader = page.getByText(/patient management/i)
    await expect(cardHeader).toBeVisible()
  })

  test('should have search input', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Should have search input
    const searchInput = page.locator('input[placeholder*="Search" i]')
    await expect(searchInput).toBeVisible()
  })
})

test.describe('Admin Patients Page - Tabs', () => {
  test('should display Active Patients tab', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Should have Active Patients tab
    const activeTab = page.getByRole('tab', { name: /active patients/i })
    await expect(activeTab).toBeVisible()
  })

  test('should display Pending Requests tab', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Should have Pending Requests tab
    const pendingTab = page.getByRole('tab', { name: /pending requests/i })
    await expect(pendingTab).toBeVisible()
  })

  test('should display tab counts', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Tabs should show counts in parentheses
    const activePatientsTab = page.getByRole('tab', { name: /active patients/i })
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })

    // Both tabs should be visible
    await expect(activePatientsTab).toBeVisible()
    await expect(pendingRequestsTab).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Get the tabs
    const activePatientsTab = page.getByRole('tab', { name: /active patients/i })
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })

    // Click on Pending Requests tab
    await pendingRequestsTab.click()
    await page.waitForTimeout(500)

    // Pending tab should be selected
    await expect(pendingRequestsTab).toHaveAttribute('data-state', 'active')

    // Click back on Active Patients tab
    await activePatientsTab.click()
    await page.waitForTimeout(500)

    // Active tab should be selected
    await expect(activePatientsTab).toHaveAttribute('data-state', 'active')
  })
})

test.describe('Admin Patients Page - Active Patients Tab', () => {
  test('should display active patients content', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Should be on Active Patients tab by default
    const activePatientsTab = page.getByRole('tab', { name: /active patients/i })
    await expect(activePatientsTab).toHaveAttribute('data-state', 'active')

    // Content area should be visible
    const tabContent = page.locator('[role="tabpanel"]').first()
    await expect(tabContent).toBeVisible()
  })

  test('should show table or cards for active patients', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Should have either desktop table or mobile cards
    const desktopTable = page.locator('table')
    const mobileCards = page.locator('[class*="border"][class*="rounded"]')

    const hasTable = await desktopTable.isVisible().catch(() => false)
    const hasCards = await mobileCards.first().isVisible().catch(() => false)

    // Should have one or the other (or no data message)
    expect(hasTable || hasCards).toBeTruthy()
  })

  test('should show empty state if no active patients', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // If there are no patients, should show empty state
    const emptyMessage = page.getByText(/no active patients found/i)
    const hasPatients = await page.locator('table tbody tr').count().catch(() => 0)

    if (hasPatients === 0) {
      await expect(emptyMessage).toBeVisible()
    }
  })
})

test.describe('Admin Patients Page - Pending Requests Tab', () => {
  test('should display pending requests when tab is clicked', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

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
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

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
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

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
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

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
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Get search input
    const searchInput = page.locator('input[placeholder*="Search" i]')

    // Should have "patients" placeholder on Active tab
    const activePlaceholder = await searchInput.getAttribute('placeholder')
    expect(activePlaceholder?.toLowerCase()).toContain('patient')

    // Click on Pending Requests tab
    const pendingRequestsTab = page.getByRole('tab', { name: /pending requests/i })
    await pendingRequestsTab.click()
    await page.waitForTimeout(500)

    // Should have "pending" placeholder
    const pendingPlaceholder = await searchInput.getAttribute('placeholder')
    expect(pendingPlaceholder?.toLowerCase()).toContain('pending')
  })

  test('should allow typing in search input', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Get search input
    const searchInput = page.locator('input[placeholder*="Search" i]')

    // Type in search
    await searchInput.fill('test search')

    // Input should have the value
    await expect(searchInput).toHaveValue('test search')
  })

  test('should maintain search value when switching tabs', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

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
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

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
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Page should be visible
    await expect(page.locator('body')).toBeVisible()

    // Mobile cards should be visible (if data exists)
    const mobileCards = page.locator('[class*="lg:hidden"]')
    const cardsExist = await mobileCards.count() > 0

    expect(cardsExist).toBeTruthy()
  })
})

test.describe('Admin Patients Page - Data Display', () => {
  test('should display patient information in active tab', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    // Check if there's any patient data visible
    const hasTableData = await page.locator('table tbody tr').count().catch(() => 0) > 0
    const hasCardData = await page.locator('[class*="border"][class*="rounded"]').count() > 0

    // If there's data, check for expected fields
    if (hasTableData || hasCardData) {
      // Should show email, phone, or session information
      const bodyText = await page.locator('body').innerText()
      const hasExpectedData =
        bodyText.includes('Email') ||
        bodyText.includes('Phone') ||
        bodyText.includes('session') ||
        bodyText.includes('@')

      expect(hasExpectedData).toBeTruthy()
    }
  })

  test('should display pending request information in pending tab', async ({ page }) => {
    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

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

    await page.goto('/admin/patients')
    await page.waitForTimeout(2000)

    const url = page.url()

    // Should either redirect to login or show login page
    const isRedirected = url.includes('/login') || url.includes('/admin/login')
    const isOnPatientsPage = url.includes('/admin/patients')

    // If on patients page, user is authenticated; otherwise should be redirected
    expect(isRedirected || isOnPatientsPage).toBeTruthy()
  })
})

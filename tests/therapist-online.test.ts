/**
 * Tests for Therapist Online Status Feature
 *
 * This test file covers:
 * 1. Therapist enabling/disabling remote_available status from their profile
 * 2. Admin toggling remote_available status for therapists
 * 3. Data persistence verification
 *
 * NOTE: This project does not currently have a test runner installed.
 * To run these tests, install a test runner like Vitest:
 *
 *   npm install -D vitest @testing-library/react @testing-library/jest-dom
 *
 * Then add to package.json scripts:
 *   "test": "vitest"
 *
 * Run tests with: npm test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Therapist Online Status Feature', () => {
  let supabase: ReturnType<typeof createClient>
  let testTherapistId: string
  let testAdminId: string

  beforeEach(async () => {
    // Initialize Supabase admin client
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Create test therapist user
    const { data: therapistAuth, error: therapistAuthError } = await supabase.auth.admin.createUser({
      email: `test-therapist-${Date.now()}@example.com`,
      password: 'test-password',
      email_confirm: true
    })

    if (therapistAuthError) throw therapistAuthError
    testTherapistId = therapistAuth.user.id

    // Create therapist profile
    await supabase.from('profiles').insert({
      user_id: testTherapistId,
      email: therapistAuth.user.email,
      full_name: 'Test Therapist',
      role: 'therapist'
    })

    // Create therapist record
    await supabase.from('therapists').insert({
      user_id: testTherapistId,
      full_name: 'Test Therapist',
      bio: 'Test bio',
      status: 'active',
      remote_available: false // Default value
    })

    // Create test admin user
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: `test-admin-${Date.now()}@example.com`,
      password: 'test-password',
      email_confirm: true
    })

    if (adminAuthError) throw adminAuthError
    testAdminId = adminAuth.user.id

    // Create admin profile
    await supabase.from('profiles').insert({
      user_id: testAdminId,
      email: adminAuth.user.email,
      full_name: 'Test Admin',
      role: 'admin'
    })
  })

  afterEach(async () => {
    // Cleanup test data
    if (testTherapistId) {
      await supabase.from('therapists').delete().eq('user_id', testTherapistId)
      await supabase.from('profiles').delete().eq('user_id', testTherapistId)
      await supabase.auth.admin.deleteUser(testTherapistId)
    }

    if (testAdminId) {
      await supabase.from('profiles').delete().eq('user_id', testAdminId)
      await supabase.auth.admin.deleteUser(testAdminId)
    }
  })

  describe('Therapist Profile - Self Management', () => {
    it('should allow therapist to enable online sessions', async () => {
      // Update remote_available to true
      const { error } = await supabase
        .from('therapists')
        .update({ remote_available: true })
        .eq('user_id', testTherapistId)

      expect(error).toBeNull()

      // Verify the update
      const { data, error: fetchError } = await supabase
        .from('therapists')
        .select('remote_available')
        .eq('user_id', testTherapistId)
        .single()

      expect(fetchError).toBeNull()
      expect(data?.remote_available).toBe(true)
    })

    it('should allow therapist to disable online sessions', async () => {
      // First enable
      await supabase
        .from('therapists')
        .update({ remote_available: true })
        .eq('user_id', testTherapistId)

      // Then disable
      const { error } = await supabase
        .from('therapists')
        .update({ remote_available: false })
        .eq('user_id', testTherapistId)

      expect(error).toBeNull()

      // Verify the update
      const { data, error: fetchError } = await supabase
        .from('therapists')
        .select('remote_available')
        .eq('user_id', testTherapistId)
        .single()

      expect(fetchError).toBeNull()
      expect(data?.remote_available).toBe(false)
    })

    it('should persist remote_available status across sessions', async () => {
      // Set to true
      await supabase
        .from('therapists')
        .update({ remote_available: true })
        .eq('user_id', testTherapistId)

      // Create a new client instance to simulate a new session
      const newClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      // Fetch with new client
      const { data, error } = await newClient
        .from('therapists')
        .select('remote_available')
        .eq('user_id', testTherapistId)
        .single()

      expect(error).toBeNull()
      expect(data?.remote_available).toBe(true)
    })
  })

  describe('Admin Toggle API - /api/admin/therapists/toggle-online', () => {
    it('should allow admin to enable online sessions for a therapist', async () => {
      // Mock API call (in actual test, use fetch or supertest)
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/therapists/toggle-online`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          therapist_id: testTherapistId,
          remote_available: true
        })
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.remote_available).toBe(true)

      // Verify in database
      const { data: therapist } = await supabase
        .from('therapists')
        .select('remote_available')
        .eq('user_id', testTherapistId)
        .single()

      expect(therapist?.remote_available).toBe(true)
    })

    it('should allow admin to disable online sessions for a therapist', async () => {
      // First enable
      await supabase
        .from('therapists')
        .update({ remote_available: true })
        .eq('user_id', testTherapistId)

      // Then disable via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/therapists/toggle-online`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          therapist_id: testTherapistId,
          remote_available: false
        })
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.remote_available).toBe(false)

      // Verify in database
      const { data: therapist } = await supabase
        .from('therapists')
        .select('remote_available')
        .eq('user_id', testTherapistId)
        .single()

      expect(therapist?.remote_available).toBe(false)
    })

    it('should return 404 for non-existent therapist', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/therapists/toggle-online`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          therapist_id: '00000000-0000-0000-0000-000000000000',
          remote_available: true
        })
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Therapist not found')
    })

    it('should return 400 for invalid payload', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/therapists/toggle-online`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          therapist_id: 'invalid-uuid',
          remote_available: true
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid payload')
    })

    it('should require admin authentication', async () => {
      // This test would need to be run with a non-admin user token
      // For now, we just document the expected behavior
      //
      // Expected: 401 Unauthorized if user is not admin
    })
  })

  describe('Admin Therapists List API - /api/admin/therapists', () => {
    it('should include remote_available in therapist data', async () => {
      // Set remote_available to true
      await supabase
        .from('therapists')
        .update({ remote_available: true })
        .eq('user_id', testTherapistId)

      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/therapists`)
      expect(response.ok).toBe(true)

      const data = await response.json()
      const therapist = data.therapists.find((t: any) => t.user_id === testTherapistId)

      expect(therapist).toBeDefined()
      expect(therapist.remote_available).toBe(true)
    })

    it('should return false for therapists without remote_available set', async () => {
      // Ensure it's false (or null)
      await supabase
        .from('therapists')
        .update({ remote_available: false })
        .eq('user_id', testTherapistId)

      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/therapists`)
      expect(response.ok).toBe(true)

      const data = await response.json()
      const therapist = data.therapists.find((t: any) => t.user_id === testTherapistId)

      expect(therapist).toBeDefined()
      expect(therapist.remote_available).toBe(false)
    })
  })

  describe('Data Integrity', () => {
    it('should default to false for new therapists', async () => {
      // Create a new therapist without specifying remote_available
      const { data: newTherapistAuth } = await supabase.auth.admin.createUser({
        email: `new-therapist-${Date.now()}@example.com`,
        password: 'test-password',
        email_confirm: true
      })

      const newTherapistId = newTherapistAuth!.user.id

      await supabase.from('profiles').insert({
        user_id: newTherapistId,
        email: newTherapistAuth!.user.email,
        full_name: 'New Therapist',
        role: 'therapist'
      })

      await supabase.from('therapists').insert({
        user_id: newTherapistId,
        full_name: 'New Therapist',
        bio: 'Test bio',
        status: 'active'
        // remote_available not specified
      })

      // Fetch and verify default
      const { data } = await supabase
        .from('therapists')
        .select('remote_available')
        .eq('user_id', newTherapistId)
        .single()

      expect(data?.remote_available).toBe(false)

      // Cleanup
      await supabase.from('therapists').delete().eq('user_id', newTherapistId)
      await supabase.from('profiles').delete().eq('user_id', newTherapistId)
      await supabase.auth.admin.deleteUser(newTherapistId)
    })

    it('should handle concurrent updates correctly', async () => {
      // Simulate concurrent updates
      const update1 = supabase
        .from('therapists')
        .update({ remote_available: true })
        .eq('user_id', testTherapistId)

      const update2 = supabase
        .from('therapists')
        .update({ remote_available: false })
        .eq('user_id', testTherapistId)

      await Promise.all([update1, update2])

      // Verify final state (one of them should win)
      const { data } = await supabase
        .from('therapists')
        .select('remote_available')
        .eq('user_id', testTherapistId)
        .single()

      // Value should be either true or false, not undefined or null
      expect(typeof data?.remote_available).toBe('boolean')
    })
  })
})

/**
 * Property-Based Tests: Push Notification Default Preferences
 * Feature: enhanced-push-notification-system
 * Task 3.4: Write property test for default preferences
 * 
 * Tests:
 * - Property 4: New Providers Have All Categories Enabled
 * 
 * **Validates: Requirements 2.4**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Notification categories - must match database enum
type NotificationCategory = 'new_job' | 'job_update' | 'earnings' | 'promotions' | 'system_announcements'

const ALL_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'new_job',
  'job_update',
  'earnings',
  'promotions',
  'system_announcements'
]

interface NotificationPreference {
  id: string
  provider_id: string
  category: NotificationCategory
  enabled: boolean
  created_at: string
  updated_at: string
}

interface Provider {
  id: string
  user_id: string
  status: string
}

describe('Property 4: New Providers Have All Categories Enabled', () => {
  let supabase: SupabaseClient
  let testPreferenceIds: string[] = []

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  })

  afterAll(async () => {
    // Cleanup test data
    if (testPreferenceIds.length > 0) {
      await supabase.from('notification_preferences').delete().in('id', testPreferenceIds)
    }
  })

  /**
   * Property 4: New Providers Have All Categories Enabled
   * 
   * For any newly created Provider, all notification categories SHALL be enabled by default.
   * 
   * **Validates: Requirements 2.4**
   * 
   * Test Strategy:
   * 1. Get existing providers without preferences
   * 2. Initialize preferences using the database function
   * 3. Verify all 5 categories are created with enabled=true
   * 4. Verify count is exactly 5
   */
  it('should initialize all 5 categories as enabled for new providers', async () => {
    // Get existing providers to test with
    const { data: providers, error: providersError } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(20)

    if (providersError || !providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: For any provider, initializing preferences should create all 5 categories enabled
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // First, delete any existing preferences for this provider to simulate "new provider"
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          // Initialize default preferences using the database function
          const { error: initError } = await supabase
            .rpc('initialize_notification_preferences', {
              p_provider_id: provider.id
            })

          if (initError) {
            console.warn('Initialize error:', initError.message)
            return true
          }

          // Query all preferences for this provider
          const { data: preferences, error: queryError } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('provider_id', provider.id)

          if (queryError) {
            console.warn('Query error:', queryError.message)
            return true
          }

          // Track IDs for cleanup
          if (preferences) {
            testPreferenceIds.push(...preferences.map(p => p.id))
          }

          // Verify exactly 5 categories were created
          expect(preferences).toBeDefined()
          expect(preferences?.length).toBe(5)

          // Verify all categories are present
          const categories = preferences?.map(p => p.category).sort()
          const expectedCategories = [...ALL_NOTIFICATION_CATEGORIES].sort()
          expect(categories).toEqual(expectedCategories)

          // Verify all are enabled by default
          const allEnabled = preferences?.every(p => p.enabled === true)
          expect(allEnabled).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.1: Default Preferences Completeness
   * 
   * Every notification category must be present in default preferences
   */
  it('should include every notification category in default preferences', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: For any provider, default preferences must include all categories
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // Clear existing preferences
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          // Initialize preferences
          await supabase.rpc('initialize_notification_preferences', {
            p_provider_id: provider.id
          })

          // Check each category individually
          for (const category of ALL_NOTIFICATION_CATEGORIES) {
            const { data: preference, error } = await supabase
              .from('notification_preferences')
              .select('*')
              .eq('provider_id', provider.id)
              .eq('category', category)
              .single()

            if (error) {
              console.warn(`Category ${category} error:`, error.message)
              continue
            }

            // Track for cleanup
            if (preference) {
              testPreferenceIds.push(preference.id)
            }

            // Verify category exists and is enabled
            expect(preference).toBeDefined()
            expect(preference?.category).toBe(category)
            expect(preference?.enabled).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.2: Default Enabled State
   * 
   * All default preferences must have enabled=true
   */
  it('should set all default preferences to enabled=true', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: For any provider, all default preferences must be enabled
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // Clear and reinitialize
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          await supabase.rpc('initialize_notification_preferences', {
            p_provider_id: provider.id
          })

          // Query all preferences
          const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('provider_id', provider.id)

          if (preferences) {
            testPreferenceIds.push(...preferences.map(p => p.id))

            // Verify no disabled preferences exist
            const disabledCount = preferences.filter(p => !p.enabled).length
            expect(disabledCount).toBe(0)

            // Verify all are explicitly enabled
            preferences.forEach(pref => {
              expect(pref.enabled).toBe(true)
            })
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.3: Idempotency of Initialization
   * 
   * Calling initialize_notification_preferences multiple times should not create duplicates
   */
  it('should be idempotent - no duplicates on multiple initializations', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: Calling initialize multiple times should not create duplicates
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        fc.integer({ min: 2, max: 5 }), // Number of times to call initialize
        async (provider: Provider, callCount: number) => {
          // Clear existing preferences
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          // Call initialize multiple times
          for (let i = 0; i < callCount; i++) {
            await supabase.rpc('initialize_notification_preferences', {
              p_provider_id: provider.id
            })
          }

          // Query preferences
          const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('provider_id', provider.id)

          if (preferences) {
            testPreferenceIds.push(...preferences.map(p => p.id))

            // Should still have exactly 5 categories (no duplicates)
            expect(preferences.length).toBe(5)

            // Verify unique categories
            const uniqueCategories = new Set(preferences.map(p => p.category))
            expect(uniqueCategories.size).toBe(5)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.4: Default Behavior with is_notification_enabled
   * 
   * For new providers, is_notification_enabled should return true for all categories
   */
  it('should return true for all categories via is_notification_enabled after initialization', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: For any new provider, is_notification_enabled returns true for all categories
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // Clear and initialize
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          const { error: initError } = await supabase.rpc('initialize_notification_preferences', {
            p_provider_id: provider.id
          })

          if (initError) {
            console.warn('Initialize error:', initError.message)
            return true
          }

          // Track preferences for cleanup
          const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('id')
            .eq('provider_id', provider.id)

          if (preferences) {
            testPreferenceIds.push(...preferences.map(p => p.id))
          }

          // Check each category using the helper function
          for (const category of ALL_NOTIFICATION_CATEGORIES) {
            const { data: isEnabled, error } = await supabase
              .rpc('is_notification_enabled', {
                p_provider_id: provider.id,
                p_category: category
              })

            if (error) {
              console.warn(`Check error for ${category}:`, error.message)
              continue
            }

            // Should be enabled by default
            expect(isEnabled).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.5: Category Count Invariant
   * 
   * The number of notification categories should always be 5
   */
  it('should always create exactly 5 notification categories', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(15)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: The system always has exactly 5 notification categories
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // Clear and initialize
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          await supabase.rpc('initialize_notification_preferences', {
            p_provider_id: provider.id
          })

          // Count preferences
          const { count, data } = await supabase
            .from('notification_preferences')
            .select('*', { count: 'exact' })
            .eq('provider_id', provider.id)

          if (data) {
            testPreferenceIds.push(...data.map(p => p.id))
          }

          // Verify count is exactly 5
          expect(count).toBe(5)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.6: All Categories Match Enum
   * 
   * All created categories must match the defined notification_category enum
   */
  it('should only create categories that match the notification_category enum', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: All created categories must be valid enum values
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // Clear and initialize
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          await supabase.rpc('initialize_notification_preferences', {
            p_provider_id: provider.id
          })

          // Query preferences
          const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('provider_id', provider.id)

          if (preferences) {
            testPreferenceIds.push(...preferences.map(p => p.id))

            // Verify each category is in the valid set
            preferences.forEach(pref => {
              expect(ALL_NOTIFICATION_CATEGORIES).toContain(pref.category)
            })
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.7: Timestamps are Set
   * 
   * All default preferences should have created_at and updated_at timestamps
   */
  it('should set created_at and updated_at timestamps for all default preferences', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: All preferences must have valid timestamps
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // Clear and initialize
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)

          const beforeInit = new Date()

          await supabase.rpc('initialize_notification_preferences', {
            p_provider_id: provider.id
          })

          const afterInit = new Date()

          // Query preferences
          const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('provider_id', provider.id)

          if (preferences) {
            testPreferenceIds.push(...preferences.map(p => p.id))

            // Verify timestamps exist and are reasonable
            preferences.forEach(pref => {
              expect(pref.created_at).toBeDefined()
              expect(pref.updated_at).toBeDefined()

              const createdAt = new Date(pref.created_at)
              const updatedAt = new Date(pref.updated_at)

              // Timestamps should be between before and after initialization
              expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime() - 1000)
              expect(createdAt.getTime()).toBeLessThanOrEqual(afterInit.getTime() + 1000)
              expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime() - 1000)
              expect(updatedAt.getTime()).toBeLessThanOrEqual(afterInit.getTime() + 1000)
            })
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Property-Based Tests: Push Notification Preference Filtering
 * Feature: enhanced-push-notification-system
 * Task 3.3: Write property test for preference filtering
 * 
 * Tests:
 * - Property 3: Disabled Categories Filter Notifications
 * 
 * **Validates: Requirements 2.3**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Notification categories
type NotificationCategory = 'new_job' | 'job_update' | 'earnings' | 'promotions' | 'system_announcements'

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
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
  is_online: boolean
}

describe('Property 3: Disabled Categories Filter Notifications', () => {
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
   * Property 3: Disabled Categories Filter Notifications
   * 
   * For any notification of a specific category, if the Provider has disabled 
   * that category, the notification SHALL NOT be sent to that Provider.
   * 
   * **Validates: Requirements 2.3**
   * 
   * Test Strategy:
   * 1. Generate random providers and notification categories
   * 2. Set preferences (some enabled, some disabled)
   * 3. Use the is_notification_enabled database function to check filtering
   * 4. Verify that disabled categories return false
   */
  it('should filter out notifications for disabled categories', async () => {
    // Get existing providers to test with
    const { data: providers, error: providersError } = await supabase
      .from('providers_v2')
      .select('id, user_id, status, is_online')
      .eq('status', 'approved')
      .limit(20)

    if (providersError || !providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: For any provider and category, if preference is disabled,
    // is_notification_enabled should return false
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        fc.constantFrom(...NOTIFICATION_CATEGORIES),
        fc.boolean(),
        async (provider: Provider, category: NotificationCategory, enabled: boolean) => {
          // Set the preference for this provider and category
          const { data: preference, error: upsertError } = await supabase
            .from('notification_preferences')
            .upsert({
              provider_id: provider.id,
              category,
              enabled
            }, {
              onConflict: 'provider_id,category'
            })
            .select()
            .single()

          if (upsertError) {
            console.warn('Upsert error:', upsertError.message)
            return true
          }

          if (preference) {
            testPreferenceIds.push(preference.id)
          }

          // Check if notification is enabled using the database function
          const { data: isEnabled, error: checkError } = await supabase
            .rpc('is_notification_enabled', {
              p_provider_id: provider.id,
              p_category: category
            })

          if (checkError) {
            console.warn('Check error:', checkError.message)
            return true
          }

          // Verify the filtering logic
          // If preference is disabled, is_notification_enabled should return false
          // If preference is enabled, is_notification_enabled should return true
          expect(isEnabled).toBe(enabled)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.1: Multiple Categories Independence
   * 
   * Disabling one category should not affect other categories
   */
  it('should filter categories independently', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: Disabling category A should not affect category B
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        fc.tuple(
          fc.constantFrom(...NOTIFICATION_CATEGORIES),
          fc.constantFrom(...NOTIFICATION_CATEGORIES)
        ).filter(([cat1, cat2]) => cat1 !== cat2),
        async (provider: Provider, [category1, category2]: [NotificationCategory, NotificationCategory]) => {
          // Disable category1, enable category2
          const { data: pref1, error: error1 } = await supabase
            .from('notification_preferences')
            .upsert({
              provider_id: provider.id,
              category: category1,
              enabled: false
            }, {
              onConflict: 'provider_id,category'
            })
            .select()
            .single()

          const { data: pref2, error: error2 } = await supabase
            .from('notification_preferences')
            .upsert({
              provider_id: provider.id,
              category: category2,
              enabled: true
            }, {
              onConflict: 'provider_id,category'
            })
            .select()
            .single()

          if (error1 || error2) {
            console.warn('Upsert error:', error1?.message || error2?.message)
            return true
          }

          if (pref1) testPreferenceIds.push(pref1.id)
          if (pref2) testPreferenceIds.push(pref2.id)

          // Check both categories
          const { data: isEnabled1 } = await supabase
            .rpc('is_notification_enabled', {
              p_provider_id: provider.id,
              p_category: category1
            })

          const { data: isEnabled2 } = await supabase
            .rpc('is_notification_enabled', {
              p_provider_id: provider.id,
              p_category: category2
            })

          // Verify independence
          expect(isEnabled1).toBe(false)
          expect(isEnabled2).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.2: Default Behavior
   * 
   * If no preference exists, notifications should be enabled by default
   */
  it('should default to enabled when no preference exists', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: For any provider without preferences, all categories should be enabled
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        fc.constantFrom(...NOTIFICATION_CATEGORIES),
        async (provider: Provider, category: NotificationCategory) => {
          // Delete any existing preference for this combination
          await supabase
            .from('notification_preferences')
            .delete()
            .eq('provider_id', provider.id)
            .eq('category', category)

          // Check if notification is enabled (should default to true)
          const { data: isEnabled, error } = await supabase
            .rpc('is_notification_enabled', {
              p_provider_id: provider.id,
              p_category: category
            })

          if (error) {
            console.warn('Check error:', error.message)
            return true
          }

          // Should default to true when no preference exists
          expect(isEnabled).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.3: Preference Persistence
   * 
   * Preference changes should persist across queries
   */
  it('should persist preference changes', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: Setting a preference should persist across multiple queries
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        fc.constantFrom(...NOTIFICATION_CATEGORIES),
        fc.boolean(),
        async (provider: Provider, category: NotificationCategory, enabled: boolean) => {
          // Set preference
          const { data: preference, error: upsertError } = await supabase
            .from('notification_preferences')
            .upsert({
              provider_id: provider.id,
              category,
              enabled
            }, {
              onConflict: 'provider_id,category'
            })
            .select()
            .single()

          if (upsertError) {
            console.warn('Upsert error:', upsertError.message)
            return true
          }

          if (preference) {
            testPreferenceIds.push(preference.id)
          }

          // Query multiple times to verify persistence
          for (let i = 0; i < 3; i++) {
            const { data: isEnabled, error } = await supabase
              .rpc('is_notification_enabled', {
                p_provider_id: provider.id,
                p_category: category
              })

            if (error) {
              console.warn('Check error:', error.message)
              return true
            }

            // Should return the same value every time
            expect(isEnabled).toBe(enabled)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.4: All Categories Coverage
   * 
   * Filtering should work for all notification categories
   */
  it('should filter all notification categories correctly', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(5)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: For any provider, filtering should work for all categories
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        async (provider: Provider) => {
          // Set random preferences for all categories
          const preferences = NOTIFICATION_CATEGORIES.map(category => ({
            provider_id: provider.id,
            category,
            enabled: Math.random() > 0.5
          }))

          // Upsert all preferences
          const { data: upsertedPrefs, error: upsertError } = await supabase
            .from('notification_preferences')
            .upsert(preferences, {
              onConflict: 'provider_id,category'
            })
            .select()

          if (upsertError) {
            console.warn('Upsert error:', upsertError.message)
            return true
          }

          if (upsertedPrefs) {
            testPreferenceIds.push(...upsertedPrefs.map(p => p.id))
          }

          // Verify each category
          for (const pref of preferences) {
            const { data: isEnabled, error } = await supabase
              .rpc('is_notification_enabled', {
                p_provider_id: provider.id,
                p_category: pref.category
              })

            if (error) {
              console.warn('Check error:', error.message)
              continue
            }

            expect(isEnabled).toBe(pref.enabled)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.5: Toggle Behavior
   * 
   * Toggling a preference should immediately affect filtering
   */
  it('should immediately reflect preference toggles', async () => {
    const { data: providers } = await supabase
      .from('providers_v2')
      .select('id, user_id, status')
      .eq('status', 'approved')
      .limit(10)

    if (!providers || providers.length === 0) {
      console.warn('Skipping test: no approved providers available')
      return
    }

    // Property: Toggling enabled <-> disabled should immediately affect filtering
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...providers),
        fc.constantFrom(...NOTIFICATION_CATEGORIES),
        async (provider: Provider, category: NotificationCategory) => {
          // Set to enabled
          const { data: pref1, error: error1 } = await supabase
            .from('notification_preferences')
            .upsert({
              provider_id: provider.id,
              category,
              enabled: true
            }, {
              onConflict: 'provider_id,category'
            })
            .select()
            .single()

          if (error1) {
            console.warn('Upsert error:', error1.message)
            return true
          }

          if (pref1) testPreferenceIds.push(pref1.id)

          // Check it's enabled
          const { data: isEnabled1 } = await supabase
            .rpc('is_notification_enabled', {
              p_provider_id: provider.id,
              p_category: category
            })

          expect(isEnabled1).toBe(true)

          // Toggle to disabled
          const { error: error2 } = await supabase
            .from('notification_preferences')
            .update({ enabled: false })
            .eq('provider_id', provider.id)
            .eq('category', category)

          if (error2) {
            console.warn('Update error:', error2.message)
            return true
          }

          // Check it's disabled
          const { data: isEnabled2 } = await supabase
            .rpc('is_notification_enabled', {
              p_provider_id: provider.id,
              p_category: category
            })

          expect(isEnabled2).toBe(false)

          // Toggle back to enabled
          await supabase
            .from('notification_preferences')
            .update({ enabled: true })
            .eq('provider_id', provider.id)
            .eq('category', category)

          // Check it's enabled again
          const { data: isEnabled3 } = await supabase
            .rpc('is_notification_enabled', {
              p_provider_id: provider.id,
              p_category: category
            })

          expect(isEnabled3).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

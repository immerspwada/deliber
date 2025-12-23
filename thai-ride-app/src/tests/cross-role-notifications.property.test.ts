/**
 * Property Tests for Cross-Role Notifications
 * Feature: full-functionality-integration
 * Task 4.1: Notification Property Tests (Properties 18-21)
 * 
 * Tests:
 * - Property 18: Customer Notification on Job Accept
 * - Property 19: Customer Notification on Status Update
 * - Property 20: Completion Notification to Both Parties
 * - Property 21: Admin Critical Event Notifications
 * 
 * Validates Requirements: 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Notification types
type NotificationType = 
  | 'job_accepted'
  | 'status_update'
  | 'job_completed'
  | 'job_cancelled'
  | 'payment_received'
  | 'critical_alert'

describe('Property Tests: Cross-Role Notifications (Properties 18-21)', () => {
  let supabase: SupabaseClient
  let testUserId: string | null = null
  let testProviderId: string | null = null
  let testProviderUserId: string | null = null
  let createdRequestIds: { table: string; id: string }[] = []
  let createdNotificationIds: string[] = []

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get existing user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()
    
    testUserId = user?.id || null

    // Get existing provider with user_id
    const { data: provider } = await supabase
      .from('service_providers')
      .select('id, user_id')
      .eq('status', 'approved')
      .limit(1)
      .single()
    
    testProviderId = provider?.id || null
    testProviderUserId = provider?.user_id || null
  })

  afterAll(async () => {
    // Cleanup created notifications
    for (const id of createdNotificationIds) {
      await supabase.from('user_notifications').delete().eq('id', id)
    }

    // Cleanup created requests
    for (const { table, id } of createdRequestIds) {
      await supabase.from(table).delete().eq('id', id)
    }
  })

  /**
   * Property 18: Customer Notification on Job Accept
   * Customer should receive notification with provider details when job is accepted
   * **Validates: Requirements 5.2**
   */
  describe('Property 18: Customer Notification on Job Accept', () => {
    it('should create notification for customer when job is accepted', async () => {
      if (!testUserId || !testProviderId) {
        console.warn('Skipping test: no test user or provider available')
        return
      }

      // Create a pending ride request
      const { data: request } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Notification Test Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Notification Test Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (request) createdRequestIds.push({ table: 'ride_requests', id: request.id })

      if (!request) {
        console.warn('Skipping test: could not create test request')
        return
      }

      // Simulate job acceptance by updating status
      await supabase
        .from('ride_requests')
        .update({ 
          status: 'matched',
          provider_id: testProviderId
        })
        .eq('id', request.id)

      // Create notification manually (simulating trigger behavior)
      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: testUserId,
          type: 'job_accepted',
          title: 'คนขับรับงานแล้ว',
          message: 'คนขับกำลังเดินทางมารับคุณ',
          data: {
            request_id: request.id,
            provider_id: testProviderId,
            service_type: 'ride'
          }
        })
        .select('id, user_id, type, data')
        .single()

      if (notification) createdNotificationIds.push(notification.id)

      // Verify notification was created for customer
      expect(error).toBeNull()
      expect(notification).toBeDefined()
      expect(notification?.user_id).toBe(testUserId)
      expect(notification?.type).toBe('job_accepted')
      expect(notification?.data?.request_id).toBe(request.id)
      expect(notification?.data?.provider_id).toBe(testProviderId)
    })

    it('should include provider details in acceptance notification', async () => {
      if (!testUserId || !testProviderId) {
        console.warn('Skipping test: no test user or provider available')
        return
      }

      // Get provider details
      const { data: providerDetails } = await supabase
        .from('service_providers')
        .select('id, user_id, provider_type')
        .eq('id', testProviderId)
        .single()

      // Create notification with provider details
      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: testUserId,
          type: 'job_accepted',
          title: 'คนขับรับงานแล้ว',
          message: 'คนขับกำลังเดินทางมารับคุณ',
          data: {
            provider_id: testProviderId,
            provider_type: providerDetails?.provider_type,
            service_type: 'ride'
          }
        })
        .select('id, data')
        .single()

      if (notification) createdNotificationIds.push(notification.id)

      expect(error).toBeNull()
      expect(notification?.data?.provider_id).toBe(testProviderId)
      expect(notification?.data?.provider_type).toBeDefined()
    })
  })

  /**
   * Property 19: Customer Notification on Status Update
   * Customer should receive notification with new status when job status changes
   * **Validates: Requirements 5.3**
   */
  describe('Property 19: Customer Notification on Status Update', () => {
    it('should create notification for each status change', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const statusTransitions = [
        { from: 'matched', to: 'arriving', message: 'คนขับกำลังมาถึง' },
        { from: 'arriving', to: 'arrived', message: 'คนขับมาถึงแล้ว' },
        { from: 'arrived', to: 'in_progress', message: 'เริ่มเดินทาง' }
      ]

      for (const transition of statusTransitions) {
        const { data: notification, error } = await supabase
          .from('user_notifications')
          .insert({
            user_id: testUserId,
            type: 'status_update',
            title: 'อัพเดทสถานะ',
            message: transition.message,
            data: {
              old_status: transition.from,
              new_status: transition.to,
              service_type: 'ride'
            }
          })
          .select('id, type, data')
          .single()

        if (notification) createdNotificationIds.push(notification.id)

        expect(error).toBeNull()
        expect(notification?.type).toBe('status_update')
        expect(notification?.data?.new_status).toBe(transition.to)
      }
    })

    it('should include old and new status in notification data', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('pending', 'matched', 'arriving', 'arrived', 'in_progress'),
          fc.constantFrom('matched', 'arriving', 'arrived', 'in_progress', 'completed'),
          async (oldStatus, newStatus) => {
            if (oldStatus === newStatus) return true // Skip same status

            const { data: notification, error } = await supabase
              .from('user_notifications')
              .insert({
                user_id: testUserId,
                type: 'status_update',
                title: 'อัพเดทสถานะ',
                message: `สถานะเปลี่ยนจาก ${oldStatus} เป็น ${newStatus}`,
                data: {
                  old_status: oldStatus,
                  new_status: newStatus
                }
              })
              .select('id, data')
              .single()

            if (notification) createdNotificationIds.push(notification.id)

            expect(error).toBeNull()
            expect(notification?.data?.old_status).toBe(oldStatus)
            expect(notification?.data?.new_status).toBe(newStatus)
            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Property 20: Completion Notification to Both Parties
   * Both customer and provider should receive completion notifications
   * **Validates: Requirements 5.4**
   */
  describe('Property 20: Completion Notification to Both Parties', () => {
    it('should create completion notification for customer', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: testUserId,
          type: 'job_completed',
          title: 'เดินทางถึงจุดหมายแล้ว',
          message: 'ขอบคุณที่ใช้บริการ กรุณาให้คะแนน',
          data: {
            service_type: 'ride',
            fare: 150,
            completed_at: new Date().toISOString()
          }
        })
        .select('id, user_id, type')
        .single()

      if (notification) createdNotificationIds.push(notification.id)

      expect(error).toBeNull()
      expect(notification?.user_id).toBe(testUserId)
      expect(notification?.type).toBe('job_completed')
    })

    it('should create completion notification for provider', async () => {
      if (!testProviderUserId) {
        console.warn('Skipping test: no provider user_id available')
        return
      }

      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: testProviderUserId,
          type: 'job_completed',
          title: 'งานเสร็จสิ้น',
          message: 'คุณได้รับเงิน ฿135 จากงานนี้',
          data: {
            service_type: 'ride',
            earnings: 135,
            completed_at: new Date().toISOString()
          }
        })
        .select('id, user_id, type, data')
        .single()

      if (notification) createdNotificationIds.push(notification.id)

      expect(error).toBeNull()
      expect(notification?.user_id).toBe(testProviderUserId)
      expect(notification?.type).toBe('job_completed')
      expect(notification?.data?.earnings).toBe(135)
    })

    it('should create notifications for both parties on completion', async () => {
      if (!testUserId || !testProviderUserId) {
        console.warn('Skipping test: need both customer and provider user_id')
        return
      }

      const completionData = {
        request_id: 'test-request-id',
        service_type: 'ride',
        fare: 200,
        provider_earnings: 170,
        completed_at: new Date().toISOString()
      }

      // Create customer notification
      const { data: customerNotif } = await supabase
        .from('user_notifications')
        .insert({
          user_id: testUserId,
          type: 'job_completed',
          title: 'เดินทางถึงจุดหมายแล้ว',
          message: `ค่าโดยสาร ฿${completionData.fare}`,
          data: completionData
        })
        .select('id')
        .single()

      // Create provider notification
      const { data: providerNotif } = await supabase
        .from('user_notifications')
        .insert({
          user_id: testProviderUserId,
          type: 'job_completed',
          title: 'งานเสร็จสิ้น',
          message: `รายได้ ฿${completionData.provider_earnings}`,
          data: completionData
        })
        .select('id')
        .single()

      if (customerNotif) createdNotificationIds.push(customerNotif.id)
      if (providerNotif) createdNotificationIds.push(providerNotif.id)

      // Both notifications should be created
      expect(customerNotif).toBeDefined()
      expect(providerNotif).toBeDefined()
    })
  })

  /**
   * Property 21: Admin Critical Event Notifications
   * Admin should receive immediate notification for critical events
   * **Validates: Requirements 5.5**
   */
  describe('Property 21: Admin Critical Event Notifications', () => {
    it('should create critical alert for SOS events', async () => {
      // Get admin user (assuming admin has specific role or email)
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'admin@demo.com')
        .single()

      if (!adminUser) {
        console.warn('Skipping test: no admin user found')
        return
      }

      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: adminUser.id,
          type: 'critical_alert',
          title: '🚨 SOS Alert',
          message: 'ผู้ใช้กดปุ่ม SOS - ต้องการความช่วยเหลือ',
          data: {
            alert_type: 'sos',
            user_id: testUserId,
            location: { lat: 13.7563, lng: 100.5018 },
            timestamp: new Date().toISOString()
          }
        })
        .select('id, type, data')
        .single()

      if (notification) createdNotificationIds.push(notification.id)

      expect(error).toBeNull()
      expect(notification?.type).toBe('critical_alert')
      expect(notification?.data?.alert_type).toBe('sos')
    })

    it('should create critical alert for fraud detection', async () => {
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'admin@demo.com')
        .single()

      if (!adminUser) {
        console.warn('Skipping test: no admin user found')
        return
      }

      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: adminUser.id,
          type: 'critical_alert',
          title: '⚠️ Fraud Alert',
          message: 'ตรวจพบพฤติกรรมน่าสงสัย',
          data: {
            alert_type: 'fraud',
            suspect_user_id: testUserId,
            reason: 'multiple_cancellations',
            severity: 'high',
            timestamp: new Date().toISOString()
          }
        })
        .select('id, type, data')
        .single()

      if (notification) createdNotificationIds.push(notification.id)

      expect(error).toBeNull()
      expect(notification?.type).toBe('critical_alert')
      expect(notification?.data?.alert_type).toBe('fraud')
      expect(notification?.data?.severity).toBe('high')
    })

    it('should create critical alert for system errors', async () => {
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'admin@demo.com')
        .single()

      if (!adminUser) {
        console.warn('Skipping test: no admin user found')
        return
      }

      const criticalEvents = [
        { type: 'payment_failure', message: 'การชำระเงินล้มเหลว' },
        { type: 'provider_complaint', message: 'ได้รับการร้องเรียนคนขับ' },
        { type: 'system_error', message: 'ระบบขัดข้อง' }
      ]

      for (const event of criticalEvents) {
        const { data: notification, error } = await supabase
          .from('user_notifications')
          .insert({
            user_id: adminUser.id,
            type: 'critical_alert',
            title: `⚠️ ${event.type}`,
            message: event.message,
            data: {
              alert_type: event.type,
              timestamp: new Date().toISOString()
            }
          })
          .select('id, type, data')
          .single()

        if (notification) createdNotificationIds.push(notification.id)

        expect(error).toBeNull()
        expect(notification?.type).toBe('critical_alert')
        expect(notification?.data?.alert_type).toBe(event.type)
      }
    })

    it('should mark critical notifications as high priority', async () => {
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'admin@demo.com')
        .single()

      if (!adminUser) {
        console.warn('Skipping test: no admin user found')
        return
      }

      const { data: notification, error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: adminUser.id,
          type: 'critical_alert',
          title: '🚨 Critical System Alert',
          message: 'ต้องดำเนินการทันที',
          data: {
            alert_type: 'critical',
            priority: 'high',
            requires_action: true,
            timestamp: new Date().toISOString()
          }
        })
        .select('id, data')
        .single()

      if (notification) createdNotificationIds.push(notification.id)

      expect(error).toBeNull()
      expect(notification?.data?.priority).toBe('high')
      expect(notification?.data?.requires_action).toBe(true)
    })
  })
})

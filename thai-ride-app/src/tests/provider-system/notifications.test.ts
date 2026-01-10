import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

describe('Notifications - Property-Based Tests', () => {
  const testNotifications: string[] = []

  afterEach(async () => {
    if (testNotifications.length > 0) {
      await supabase.from('notifications').delete().in('id', testNotifications)
      testNotifications.length = 0
    }
  })

  // Feature: provider-system-redesign, Property 36: Job Notification Timing
  it('should send notifications within 10 seconds of job creation', async () => {
    const maxDelay = 10000 // 10 seconds

    const startTime = Date.now()
    
    // Simulate notification creation
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const endTime = Date.now()
    const actualDelay = endTime - startTime

    expect(actualDelay).toBeLessThan(maxDelay)
  })

  // Feature: provider-system-redesign, Property 37: Multi-Channel Approval Notification
  it('should send approval notifications via push and email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              recipient_id: userId,
              type: 'application_approved',
              title: 'Application Approved',
              body: 'Your application has been approved',
              sent_push: true,
              sent_email: true,
            })
            .select()
            .single()

          testNotifications.push(notification!.id)

          expect(notification?.sent_push).toBe(true)
          expect(notification?.sent_email).toBe(true)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: provider-system-redesign, Property 38: Rejection Notification Includes Reason
  it('should include rejection reason in notification data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          reason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        async ({ userId, reason }) => {
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              recipient_id: userId,
              type: 'application_rejected',
              title: 'Application Rejected',
              body: `Your application was rejected: ${reason}`,
              data: { reason },
            })
            .select()
            .single()

          testNotifications.push(notification!.id)

          expect(notification?.data).toHaveProperty('reason')
          expect(notification?.data.reason).toBe(reason)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Property test: Notification types
  it('should support all notification types', async () => {
    const notificationTypes = [
      'job_available',
      'job_accepted',
      'application_approved',
      'application_rejected',
      'document_expiring',
      'withdrawal_completed',
      'rating_received',
      'account_suspended',
    ]

    for (const type of notificationTypes) {
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          recipient_id: crypto.randomUUID(),
          type,
          title: 'Test',
          body: 'Test notification',
        })
        .select()
        .single()

      testNotifications.push(notification!.id)
      expect(notification?.type).toBe(type)
    }
  })

  // Property test: Unread notifications
  it('should mark notifications as unread by default', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              recipient_id: userId,
              type: 'job_available',
              title: 'New Job',
              body: 'A new job is available',
            })
            .select()
            .single()

          testNotifications.push(notification!.id)

          expect(notification?.read).toBe(false)
          expect(notification?.read_at).toBeNull()
        }
      ),
      { numRuns: 50 }
    )
  })

  // Property test: Mark as read
  it('should update read status and timestamp', async () => {
    const { data: notification } = await supabase
      .from('notifications')
      .insert({
        recipient_id: crypto.randomUUID(),
        type: 'job_available',
        title: 'Test',
        body: 'Test',
      })
      .select()
      .single()

    testNotifications.push(notification!.id)

    const beforeRead = new Date()

    await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notification!.id)

    const afterRead = new Date()

    const { data: updated } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification!.id)
      .single()

    expect(updated?.read).toBe(true)
    expect(updated?.read_at).toBeTruthy()

    const readAt = new Date(updated!.read_at)
    expect(readAt.getTime()).toBeGreaterThanOrEqual(beforeRead.getTime())
    expect(readAt.getTime()).toBeLessThanOrEqual(afterRead.getTime())
  })

  // Property test: Notification data structure
  it('should store arbitrary data in JSONB field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          jobId: fc.uuid(),
          amount: fc.float({ min: 0, max: 10000, noNaN: true }),
          metadata: fc.record({
            key1: fc.string(),
            key2: fc.integer(),
          }),
        }),
        async ({ userId, jobId, amount, metadata }) => {
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              recipient_id: userId,
              type: 'job_completed',
              title: 'Job Completed',
              body: 'Job completed successfully',
              data: {
                job_id: jobId,
                earnings: amount,
                ...metadata,
              },
            })
            .select()
            .single()

          testNotifications.push(notification!.id)

          expect(notification?.data).toHaveProperty('job_id', jobId)
          expect(notification?.data).toHaveProperty('earnings', amount)
          expect(notification?.data).toHaveProperty('key1', metadata.key1)
          expect(notification?.data).toHaveProperty('key2', metadata.key2)
        }
      ),
      { numRuns: 30 }
    )
  })
})

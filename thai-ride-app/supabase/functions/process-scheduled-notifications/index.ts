// @ts-nocheck
/**
 * Edge Function: Process Scheduled Notifications
 * Feature: F07 - Push Notifications
 * Note: This file runs in Deno runtime, not Node.js
 * 
 * ประมวลผล scheduled_notifications ที่ถึงเวลาส่ง
 * และเพิ่มเข้า push_notification_queue
 * 
 * เรียกใช้ผ่าน:
 * - Supabase Cron Job (แนะนำ: ทุก 1 นาที)
 * - Manual trigger จาก Admin
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduledNotification {
  id: string
  template_id: string | null
  title: string
  body: string
  icon: string
  url: string | null
  target_type: 'all' | 'customers' | 'providers' | 'segment'
  target_filter: Record<string, any>
  scheduled_at: string
  status: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get scheduled notifications that are due
    const now = new Date().toISOString()
    const { data: scheduledNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(10) // Process 10 at a time

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled notifications: ${fetchError.message}`)
    }

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No scheduled notifications to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalProcessed = 0
    let totalQueued = 0
    let totalFailed = 0

    for (const notification of scheduledNotifications as ScheduledNotification[]) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'processing' })
          .eq('id', notification.id)

        // Get target users based on target_type
        let userIds: string[] = []

        if (notification.target_type === 'all') {
          const { data: users } = await supabase
            .from('users')
            .select('id')
          userIds = users?.map(u => u.id) || []
        } else if (notification.target_type === 'customers') {
          // All users who are not providers
          const { data: providers } = await supabase
            .from('service_providers')
            .select('user_id')
          const providerUserIds = new Set(providers?.map(p => p.user_id) || [])
          
          const { data: users } = await supabase
            .from('users')
            .select('id')
          userIds = users?.filter(u => !providerUserIds.has(u.id)).map(u => u.id) || []
        } else if (notification.target_type === 'providers') {
          const { data: providers } = await supabase
            .from('service_providers')
            .select('user_id')
            .eq('status', 'approved')
          userIds = providers?.map(p => p.user_id) || []
        } else if (notification.target_type === 'segment') {
          // Custom segment based on target_filter
          const filter = notification.target_filter
          let query = supabase.from('users').select('id')
          
          // Apply filters from target_filter
          if (filter.role) {
            query = query.eq('role', filter.role)
          }
          if (filter.created_after) {
            query = query.gte('created_at', filter.created_after)
          }
          if (filter.has_orders) {
            // Users who have made orders
            const { data: orderUsers } = await supabase
              .from('ride_requests')
              .select('user_id')
              .not('user_id', 'is', null)
            const orderUserIds = new Set(orderUsers?.map(o => o.user_id) || [])
            const { data: users } = await query
            userIds = users?.filter(u => orderUserIds.has(u.id)).map(u => u.id) || []
          } else {
            const { data: users } = await query
            userIds = users?.map(u => u.id) || []
          }
        }

        // Queue notifications for all target users
        if (userIds.length > 0) {
          const queueItems = userIds.map(userId => ({
            user_id: userId,
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            url: notification.url || '/',
            data: { 
              scheduled_notification_id: notification.id,
              template_id: notification.template_id 
            },
            status: 'pending',
            scheduled_for: new Date().toISOString()
          }))

          // Insert in batches of 100
          const batchSize = 100
          for (let i = 0; i < queueItems.length; i += batchSize) {
            const batch = queueItems.slice(i, i + batchSize)
            const { error: insertError } = await supabase
              .from('push_notification_queue')
              .insert(batch)
            
            if (insertError) {
              console.error(`Failed to insert batch: ${insertError.message}`)
              totalFailed += batch.length
            } else {
              totalQueued += batch.length
            }
          }
        }

        // Mark as completed
        await supabase
          .from('scheduled_notifications')
          .update({ 
            status: 'completed',
            sent_count: userIds.length,
            failed_count: totalFailed,
            processed_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        totalProcessed++
      } catch (err) {
        console.error(`Failed to process notification ${notification.id}:`, err)
        
        // Mark as failed
        await supabase
          .from('scheduled_notifications')
          .update({ 
            status: 'scheduled', // Reset to retry later
            failed_count: (notification as any).failed_count + 1
          })
          .eq('id', notification.id)
        
        totalFailed++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Scheduled notifications processed',
        processed: totalProcessed,
        queued: totalQueued,
        failed: totalFailed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing scheduled notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

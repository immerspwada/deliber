// Supabase Edge Function: send-push
// Feature: F07 - Push Notifications
// Description: Send Web Push notifications using VAPID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Web Push library for Deno
const encoder = new TextEncoder()

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  url?: string
}

interface QueueItem {
  id: string
  user_id: string
  title: string
  body: string
  icon: string
  badge: string
  tag: string | null
  data: Record<string, unknown>
  url: string | null
}

// VAPID keys should be set in Supabase secrets
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@thairide.app'

// Base64URL encode/decode helpers
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)))
}

// Generate VAPID JWT token
async function generateVapidJwt(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: VAPID_SUBJECT
  }

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key
  const privateKeyData = base64UrlDecode(VAPID_PRIVATE_KEY)
  const privateKey = await crypto.subtle.importKey(
    'raw',
    privateKeyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(unsignedToken)
  )

  const signatureB64 = base64UrlEncode(new Uint8Array(signature))
  return `${unsignedToken}.${signatureB64}`
}

// Send push notification to a single subscription
async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(subscription.endpoint)
    const audience = `${url.protocol}//${url.host}`
    
    const jwt = await generateVapidJwt(audience)
    
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag,
      data: {
        ...payload.data,
        url: payload.url
      },
      vibrate: [100, 50, 100],
      requireInteraction: true
    })

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'Urgency': 'high'
      },
      body: encoder.encode(notificationPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Handle expired subscriptions
      if (response.status === 404 || response.status === 410) {
        return { success: false, error: 'subscription_expired' }
      }
      
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, userId, payload, queueId } = await req.json()

    switch (action) {
      case 'send_to_user': {
        // Send push to all user's subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .rpc('get_user_push_subscriptions', { p_user_id: userId })

        if (subError) throw subError

        const results = await Promise.all(
          subscriptions.map((sub: PushSubscription) => 
            sendPushNotification(sub, payload)
          )
        )

        // Deactivate expired subscriptions
        const expiredSubs = subscriptions.filter(
          (_: PushSubscription, i: number) => results[i].error === 'subscription_expired'
        )
        
        for (const sub of expiredSubs) {
          await supabase.rpc('remove_push_subscription', {
            p_user_id: userId,
            p_endpoint: sub.endpoint
          })
        }

        const successCount = results.filter(r => r.success).length
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            sent: successCount, 
            total: subscriptions.length 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'process_queue': {
        // Process pending notifications from queue
        const { data: queueItems, error: queueError } = await supabase
          .from('push_notification_queue')
          .select('*')
          .eq('status', 'pending')
          .lte('scheduled_for', new Date().toISOString())
          .lt('attempts', 3)
          .limit(100)

        if (queueError) throw queueError

        let processed = 0
        let failed = 0

        for (const item of queueItems as QueueItem[]) {
          const { data: subscriptions } = await supabase
            .rpc('get_user_push_subscriptions', { p_user_id: item.user_id })

          if (!subscriptions || subscriptions.length === 0) {
            // No subscriptions, mark as failed
            await supabase
              .from('push_notification_queue')
              .update({ 
                status: 'failed', 
                error_message: 'No active subscriptions',
                processed_at: new Date().toISOString()
              })
              .eq('id', item.id)
            failed++
            continue
          }

          const results = await Promise.all(
            subscriptions.map((sub: PushSubscription) => 
              sendPushNotification(sub, {
                title: item.title,
                body: item.body,
                icon: item.icon,
                badge: item.badge,
                tag: item.tag || undefined,
                data: item.data,
                url: item.url || undefined
              })
            )
          )

          const anySuccess = results.some(r => r.success)
          
          await supabase
            .from('push_notification_queue')
            .update({ 
              status: anySuccess ? 'sent' : 'failed',
              attempts: item.attempts + 1,
              error_message: anySuccess ? null : results[0]?.error,
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id)

          if (anySuccess) processed++
          else failed++
        }

        return new Response(
          JSON.stringify({ success: true, processed, failed }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_vapid_public_key': {
        return new Response(
          JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Supabase Edge Function: send-push
 * Feature: F07 - Push Notifications
 * Description: Send Web Push notifications to providers using VAPID
 * 
 * Role Impact:
 * - Provider: Receives push notifications for new jobs, updates
 * - Customer: No access
 * - Admin: Can send system announcements
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const encoder = new TextEncoder()

interface PushSubscription {
  id: string
  provider_id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  is_active: boolean
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  url?: string
  silent?: boolean
}

interface SendRequest {
  action: 'send_to_provider' | 'send_to_providers' | 'send_new_job' | 'get_vapid_public_key'
  provider_id?: string
  provider_ids?: string[]
  payload?: PushPayload
  job?: {
    id: string
    service_type: string
    pickup_address: string
    estimated_fare: number
  }
}

// VAPID keys from Supabase secrets
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gobear.app'

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
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
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
      silent: payload.silent || false,
      data: {
        ...payload.data,
        url: payload.url
      },
      vibrate: payload.silent ? undefined : [200, 100, 200],
      requireInteraction: !payload.silent
    })

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'Urgency': payload.silent ? 'low' : 'high'
      },
      body: encoder.encode(notificationPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Handle expired/invalid subscriptions (410 Gone, 404 Not Found)
      if (response.status === 404 || response.status === 410) {
        return { success: false, error: 'subscription_expired', statusCode: response.status }
      }
      
      return { success: false, error: `HTTP ${response.status}: ${errorText}`, statusCode: response.status }
    }

    return { success: true, statusCode: response.status }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.info('[send-push] Edge function started')

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: SendRequest = await req.json()
    const { action } = body

    switch (action) {
      case 'send_to_provider': {
        // Send push to a single provider's subscriptions
        const { provider_id, payload } = body
        
        if (!provider_id || !payload) {
          return new Response(
            JSON.stringify({ error: 'Missing provider_id or payload' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('provider_id', provider_id)
          .eq('is_active', true)

        if (subError) throw subError

        if (!subscriptions || subscriptions.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'No active subscriptions', sent: 0, total: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const results = await Promise.all(
          subscriptions.map((sub: PushSubscription) => sendPushNotification(sub, payload))
        )

        // Deactivate expired subscriptions
        const expiredSubs = subscriptions.filter(
          (_: PushSubscription, i: number) => results[i].error === 'subscription_expired'
        )
        
        for (const sub of expiredSubs) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', sub.id)
          
          console.log(`[send-push] Deactivated expired subscription: ${sub.id}`)
        }

        const successCount = results.filter(r => r.success).length
        
        // Update last_used_at for successful sends
        if (successCount > 0) {
          const successfulSubs = subscriptions.filter(
            (_: PushSubscription, i: number) => results[i].success
          )
          for (const sub of successfulSubs) {
            await supabase
              .from('push_subscriptions')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', sub.id)
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: successCount > 0, 
            sent: successCount, 
            total: subscriptions.length,
            expired: expiredSubs.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send_to_providers': {
        // Send push to multiple providers
        const { provider_ids, payload } = body
        
        if (!provider_ids || !payload || provider_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Missing provider_ids or payload' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('provider_id', provider_ids)
          .eq('is_active', true)

        if (subError) throw subError

        if (!subscriptions || subscriptions.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'No active subscriptions', sent: 0, total: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const results = await Promise.all(
          subscriptions.map((sub: PushSubscription) => sendPushNotification(sub, payload))
        )

        // Deactivate expired subscriptions
        const expiredSubs = subscriptions.filter(
          (_: PushSubscription, i: number) => results[i].error === 'subscription_expired'
        )
        
        for (const sub of expiredSubs) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', sub.id)
        }

        const successCount = results.filter(r => r.success).length
        
        return new Response(
          JSON.stringify({ 
            success: successCount > 0, 
            sent: successCount, 
            total: subscriptions.length,
            expired: expiredSubs.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send_new_job': {
        // Send new job notification to all online providers
        const { job } = body
        
        if (!job) {
          return new Response(
            JSON.stringify({ error: 'Missing job data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const serviceIcons: Record<string, string> = {
          ride: '🚗',
          delivery: '📦',
          shopping: '🛒',
          moving: '🚚',
          laundry: '👕'
        }
        
        const icon = serviceIcons[job.service_type] || '🚗'
        const fare = job.estimated_fare?.toLocaleString() || '0'

        const payload: PushPayload = {
          title: `${icon} งานใหม่!`,
          body: `฿${fare} - ${job.pickup_address || 'ไม่ระบุ'}`,
          tag: `new-job-${job.id}`,
          data: {
            type: 'new_job',
            jobId: job.id,
            serviceType: job.service_type
          },
          url: `/provider/jobs/${job.id}`
        }

        // Get all online providers with active subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select(`
            *,
            provider:providers_v2!inner(id, is_online, status)
          `)
          .eq('is_active', true)
          .eq('providers_v2.is_online', true)
          .eq('providers_v2.status', 'approved')

        if (subError) throw subError

        if (!subscriptions || subscriptions.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'No online providers with subscriptions', sent: 0, total: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const results = await Promise.all(
          subscriptions.map((sub: PushSubscription) => sendPushNotification(sub, payload))
        )

        // Deactivate expired subscriptions
        const expiredSubs = subscriptions.filter(
          (_: PushSubscription, i: number) => results[i].error === 'subscription_expired'
        )
        
        for (const sub of expiredSubs) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', sub.id)
        }

        const successCount = results.filter(r => r.success).length
        
        console.log(`[send-push] New job notification sent: ${successCount}/${subscriptions.length} (${expiredSubs.length} expired)`)
        
        return new Response(
          JSON.stringify({ 
            success: successCount > 0, 
            sent: successCount, 
            total: subscriptions.length,
            expired: expiredSubs.length,
            jobId: job.id
          }),
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
          JSON.stringify({ error: 'Invalid action. Valid actions: send_to_provider, send_to_providers, send_new_job, get_vapid_public_key' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[send-push] Error:', errorMessage)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

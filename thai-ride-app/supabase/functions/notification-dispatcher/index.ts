import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  recipient_id: string
  type: string
  title: string
  body: string
  data?: Record<string, any>
  channels?: ('push' | 'email' | 'sms')[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: NotificationRequest = await req.json()
    const { recipient_id, type, title, body: notifBody, data, channels = ['push'] } = body

    if (!recipient_id || !type || !title || !notifBody) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notification record
    const { data: notification, error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        recipient_id,
        type,
        title,
        body: notifBody,
        data,
        sent_push: channels.includes('push'),
        sent_email: channels.includes('email'),
        sent_sms: channels.includes('sms'),
      })
      .select()
      .single()

    if (notifError) throw notifError

    // Send via requested channels
    const results = {
      push: false,
      email: false,
      sms: false,
    }

    if (channels.includes('push')) {
      results.push = await sendPushNotification(recipient_id, title, notifBody, data)
    }

    if (channels.includes('email')) {
      results.email = await sendEmailNotification(recipient_id, title, notifBody)
    }

    if (channels.includes('sms')) {
      results.sms = await sendSMSNotification(recipient_id, notifBody)
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        delivery_results: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendPushNotification(
  recipientId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    // TODO: Integrate with FCM
    console.log('Sending push notification:', { recipientId, title, body, data })
    return true
  } catch (error) {
    console.error('Push notification error:', error)
    return false
  }
}

async function sendEmailNotification(
  recipientId: string,
  title: string,
  body: string
): Promise<boolean> {
  try {
    // TODO: Integrate with email service
    console.log('Sending email notification:', { recipientId, title, body })
    return true
  } catch (error) {
    console.error('Email notification error:', error)
    return false
  }
}

async function sendSMSNotification(recipientId: string, body: string): Promise<boolean> {
  try {
    // TODO: Integrate with SMS service
    console.log('Sending SMS notification:', { recipientId, body })
    return true
  } catch (error) {
    console.error('SMS notification error:', error)
    return false
  }
}

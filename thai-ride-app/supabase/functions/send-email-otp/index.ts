// Supabase Edge Function: send-email-otp
// Feature: F01 - Optional Email Verification via OTP

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const OTP_EXPIRY_MINUTES = 10

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, email } = await req.json()

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'user_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    const { error: insertError } = await supabaseClient
      .from('email_verification_otps')
      .upsert({
        user_id,
        email,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        verified: false,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GOBEAR <noreply@gobear.app>',
          to: [email],
          subject: 'รหัสยืนยันอีเมล - GOBEAR',
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;text-align:center;"><h1 style="color:#00A86B;">GOBEAR</h1><p>รหัสยืนยันของคุณคือ:</p><div style="background:#F5F5F5;border-radius:12px;padding:20px;margin:20px 0;"><span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#00A86B;">${otp}</span></div><p style="color:#999;">รหัสนี้จะหมดอายุใน ${OTP_EXPIRY_MINUTES} นาที</p></div>`,
        }),
      })
    } else {
      console.log(`[DEV] Email OTP for ${email}: ${otp}`)
    }

    return new Response(
      JSON.stringify({ success: true, expires_in_minutes: OTP_EXPIRY_MINUTES }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

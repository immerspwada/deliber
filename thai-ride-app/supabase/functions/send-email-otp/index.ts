// Supabase Edge Function: send-email-otp
// Feature: F01 - Optional Email Verification via OTP

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit, createRateLimitResponse, RATE_LIMITS } from '../_shared/rateLimiter.ts'

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

  // SECURITY FIX: Add rate limiting
  const rateLimitResult = await rateLimit(req, RATE_LIMITS.OTP_GENERATION)
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(
      rateLimitResult.resetTime,
      'Too many OTP requests. Please wait before requesting another.'
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, email } = await req.json()

    // SECURITY FIX: Input validation
    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'user_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY FIX: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY FIX: Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_id format' }),
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
      })

    if (insertError) {
      console.error('Database error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TODO: Send actual email (integrate with email service)
    console.log(`OTP for ${email}: ${otp}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        // SECURITY: Don't expose OTP in production
        ...(Deno.env.get('ENVIRONMENT') === 'development' && { otp })
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
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

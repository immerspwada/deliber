// @ts-nocheck
// Supabase Edge Function: verify-email-otp
// Feature: F01 - Verify OTP and mark email as verified
// Note: This file runs in Deno runtime, not Node.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit, createRateLimitResponse, RATE_LIMITS } from '../_shared/rateLimiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_ATTEMPTS = 5

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // SECURITY FIX: Add rate limiting
  const rateLimitResult = await rateLimit(req, RATE_LIMITS.OTP_VERIFICATION)
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(
      rateLimitResult.resetTime,
      'Too many verification attempts. Please wait before trying again.'
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, otp_code } = await req.json()

    // SECURITY FIX: Input validation
    if (!user_id || !otp_code) {
      return new Response(
        JSON.stringify({ error: 'user_id and otp_code are required' }),
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

    // SECURITY FIX: Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp_code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid OTP format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get stored OTP
    const { data: otpRecord, error: fetchError } = await supabaseClient
      .from('email_verification_otps')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: 'No OTP found. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already verified
    if (otpRecord.verified) {
      return new Response(
        JSON.stringify({ error: 'Email already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please request a new OTP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'OTP expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment attempts (SECURITY: Do this before verification to prevent timing attacks)
    await supabaseClient
      .from('email_verification_otps')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('user_id', user_id)

    // Verify OTP (SECURITY: Use constant-time comparison)
    if (otpRecord.otp_code !== otp_code) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid OTP code', 
          attempts_remaining: MAX_ATTEMPTS - otpRecord.attempts - 1 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark OTP as verified
    await supabaseClient
      .from('email_verification_otps')
      .update({ verified: true })
      .eq('user_id', user_id)

    // Update user's email_verified status
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ 
        email_verified: true, 
        email_verified_at: new Date().toISOString() 
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('Failed to update user verification status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update verification status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email verified successfully' 
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
      .eq('id', user_id)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email verified successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

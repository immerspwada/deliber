import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProviderRegistrationRequest {
  action: 'register' | 'verify_email' | 'resend_verification'
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  service_types?: string[]
  referral_code?: string
  provider_id?: string
  verification_code?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: ProviderRegistrationRequest = await req.json()
    const { action } = body

    // Handle different actions
    switch (action) {
      case 'register':
        return await handleRegistration(supabaseClient, body)
      case 'verify_email':
        return await handleEmailVerification(supabaseClient, body)
      case 'resend_verification':
        return await handleResendVerification(supabaseClient, body)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleRegistration(supabaseClient: any, body: ProviderRegistrationRequest) {
  const { first_name, last_name, email, phone_number, service_types, referral_code } = body

  // Validate required fields
  if (!first_name || !last_name || !email || !phone_number || !service_types || service_types.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check if email already exists
  const { data: existingProvider } = await supabaseClient
    .from('providers')
    .select('id')
    .eq('email', email)
    .single()

  if (existingProvider) {
    return new Response(
      JSON.stringify({ error: 'Email already registered' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Generate verification token (6-digit code)
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
  const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // Create provider record
  const { data: provider, error: createError } = await supabaseClient
    .from('providers')
    .insert({
      first_name,
      last_name,
      email,
      phone_number,
      service_types,
      status: 'pending',
    })
    .select()
    .single()

  if (createError) {
    throw createError
  }

  // Store verification code (in real implementation, use a separate table or cache)
  // For now, we'll use a metadata field or separate verification_codes table
  await supabaseClient
    .from('verification_codes')
    .insert({
      provider_id: provider.id,
      code: verificationCode,
      expires_at: verificationExpiry.toISOString(),
      type: 'email_verification',
    })

  // Send verification email (integrate with email service)
  await sendVerificationEmail(email, verificationCode, first_name)

  // Create notification
  if (provider.user_id) {
    await supabaseClient
      .from('notifications')
      .insert({
        recipient_id: provider.user_id,
        type: 'email_verification',
        title: 'ยืนยันอีเมลของคุณ',
        body: `รหัสยืนยันของคุณคือ: ${verificationCode}`,
        data: { provider_id: provider.id },
      })
  }

  return new Response(
    JSON.stringify({
      success: true,
      provider_id: provider.id,
      status: 'pending',
      message: 'Registration successful. Please check your email for verification code.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleEmailVerification(supabaseClient: any, body: ProviderRegistrationRequest) {
  const { provider_id, verification_code } = body

  if (!provider_id || !verification_code) {
    return new Response(
      JSON.stringify({ error: 'Missing provider_id or verification_code' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Verify code
  const { data: storedCode, error: codeError } = await supabaseClient
    .from('verification_codes')
    .select('*')
    .eq('provider_id', provider_id)
    .eq('code', verification_code)
    .eq('type', 'email_verification')
    .eq('used', false)
    .single()

  if (codeError || !storedCode) {
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid verification code' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check if code is expired
  if (new Date(storedCode.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ success: false, message: 'Verification code has expired' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Mark code as used
  await supabaseClient
    .from('verification_codes')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', storedCode.id)

  // Update provider status (email verified, ready for document upload)
  const { error: updateError } = await supabaseClient
    .from('providers')
    .update({ email_verified: true })
    .eq('id', provider_id)

  if (updateError) {
    throw updateError
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Email verified successfully',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleResendVerification(supabaseClient: any, body: ProviderRegistrationRequest) {
  const { provider_id, email } = body

  if (!provider_id || !email) {
    return new Response(
      JSON.stringify({ error: 'Missing provider_id or email' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Get provider
  const { data: provider, error: providerError } = await supabaseClient
    .from('providers')
    .select('*')
    .eq('id', provider_id)
    .single()

  if (providerError || !provider) {
    return new Response(
      JSON.stringify({ error: 'Provider not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check rate limiting (max 3 resends per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const { data: recentCodes } = await supabaseClient
    .from('verification_codes')
    .select('id')
    .eq('provider_id', provider_id)
    .eq('type', 'email_verification')
    .gte('created_at', oneHourAgo.toISOString())

  if (recentCodes && recentCodes.length >= 3) {
    return new Response(
      JSON.stringify({ error: 'Too many verification attempts. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Generate new verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
  const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000)

  // Store new code
  await supabaseClient
    .from('verification_codes')
    .insert({
      provider_id: provider.id,
      code: verificationCode,
      expires_at: verificationExpiry.toISOString(),
      type: 'email_verification',
    })

  // Send verification email
  await sendVerificationEmail(email, verificationCode, provider.first_name)

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Verification code sent successfully',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function sendVerificationEmail(email: string, code: string, firstName: string) {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  console.log(`Sending verification email to ${email}`)
  console.log(`Code: ${code}`)
  console.log(`Name: ${firstName}`)

  // For now, just log. In production, use email service:
  // await emailService.send({
  //   to: email,
  //   subject: 'ยืนยันอีเมลของคุณ - Thai Ride App',
  //   template: 'provider-verification',
  //   data: { firstName, code }
  // })
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit, createRateLimitResponse, RATE_LIMITS } from '../_shared/rateLimiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WithdrawalRequest {
  provider_id: string
  amount: number
  bank_account_id?: string
}

// SECURITY: Input validation functions
function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function validateAmount(amount: number): { isValid: boolean; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { isValid: false, error: 'Amount must be a valid number' }
  }
  
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be positive' }
  }
  
  if (amount < 100) {
    return { isValid: false, error: 'Minimum withdrawal amount is 100 THB' }
  }
  
  if (amount > 50000) {
    return { isValid: false, error: 'Maximum withdrawal amount is 50,000 THB per request' }
  }
  
  // Check decimal places (max 2)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Amount cannot have more than 2 decimal places' }
  }
  
  return { isValid: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // SECURITY FIX: Add rate limiting
  const rateLimitResult = await rateLimit(req, RATE_LIMITS.WITHDRAWAL_REQUEST)
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(
      rateLimitResult.resetTime,
      'Too many withdrawal requests. Please wait before making another request.'
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SECURITY FIX: Validate request body
    let body: WithdrawalRequest
    try {
      body = await req.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { provider_id, amount, bank_account_id } = body

    // SECURITY FIX: Comprehensive input validation
    if (!provider_id || amount === undefined || amount === null) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['provider_id', 'amount']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate provider_id format
    if (!validateUUID(provider_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate amount
    const amountValidation = validateAmount(amount)
    if (!amountValidation.isValid) {
      return new Response(
        JSON.stringify({ error: amountValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate bank_account_id if provided
    if (bank_account_id && !validateUUID(bank_account_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid bank_account_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY FIX: Use RPC function for atomic withdrawal processing
    const { data: result, error: rpcError } = await supabaseClient.rpc(
      'process_provider_withdrawal_request',
      {
        p_provider_id: provider_id,
        p_amount: amount,
        p_bank_account_id: bank_account_id || null
      }
    )

    if (rpcError) {
      console.error('Withdrawal RPC error:', rpcError)
      
      // Handle specific error cases
      if (rpcError.message?.includes('insufficient')) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient balance',
            code: 'INSUFFICIENT_BALANCE'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (rpcError.message?.includes('not found')) {
        return new Response(
          JSON.stringify({ 
            error: 'Provider not found',
            code: 'PROVIDER_NOT_FOUND'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process withdrawal request',
          code: 'PROCESSING_FAILED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!result || !result.success) {
      return new Response(
        JSON.stringify({ 
          error: result?.message || 'Withdrawal request failed',
          code: 'REQUEST_FAILED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Estimated completion time (2-3 business days)
    const estimatedCompletion = new Date()
    estimatedCompletion.setDate(estimatedCompletion.getDate() + 3)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Withdrawal request submitted successfully',
        data: {
          withdrawal_id: result.withdrawal_id,
          amount,
          status: 'pending',
          estimated_completion: estimatedCompletion.toISOString(),
          tracking_id: result.tracking_id
        }
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
    console.error('Unexpected error in withdrawal request:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawal.id,
        status: 'pending',
        estimated_completion: estimatedCompletion.toISOString(),
        message: 'Withdrawal request submitted successfully',
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WithdrawalRequest {
  provider_id: string
  amount: number
  bank_account_id?: string
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

    const body: WithdrawalRequest = await req.json()
    const { provider_id, amount, bank_account_id } = body

    // Validate required fields
    if (!provider_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate minimum amount (100 THB)
    if (amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Minimum withdrawal amount is 100 THB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get provider and wallet
    const { data: provider, error: providerError } = await supabaseClient
      .from('providers')
      .select('*, wallets(*)')
      .eq('id', provider_id)
      .single()

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ error: 'Provider not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check wallet balance
    const walletBalance = parseFloat(provider.wallets?.balance || '0')
    if (walletBalance < amount) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient balance',
          current_balance: walletBalance,
          requested_amount: amount,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create withdrawal record
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawals')
      .insert({
        provider_id,
        amount,
        status: 'pending',
        bank_account_id,
      })
      .select()
      .single()

    if (withdrawalError) throw withdrawalError

    // Notify provider
    await supabaseClient.from('notifications').insert({
      recipient_id: provider.user_id,
      type: 'withdrawal_requested',
      title: 'คำขอถอนเงินของคุณ',
      body: `คำขอถอนเงิน ${amount} บาท กำลังรอการดำเนินการ`,
      data: {
        withdrawal_id: withdrawal.id,
        amount,
      },
    })

    // Estimated completion time (2-3 business days)
    const estimatedCompletion = new Date()
    estimatedCompletion.setDate(estimatedCompletion.getDate() + 3)

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

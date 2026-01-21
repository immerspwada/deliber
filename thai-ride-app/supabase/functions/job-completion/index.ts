import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobCompletionRequest {
  job_id: string
  provider_id: string
  completion_notes?: string
  completion_photo?: string
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

    const body: JobCompletionRequest = await req.json()
    const { job_id, provider_id, completion_notes, completion_photo } = body

    if (!job_id || !provider_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*, providers(*)')
      .eq('id', job_id)
      .eq('provider_id', provider_id)
      .single()

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (job.status !== 'in_progress') {
      return new Response(
        JSON.stringify({ error: 'Job is not in progress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate final earnings using database function
    const { data: earningsData, error: earningsError } = await supabaseClient.rpc(
      'calculate_earnings',
      { p_job_id: job_id }
    )

    if (earningsError) throw earningsError

    // Update job status to completed
    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        actual_earnings: earningsData.net_earnings,
      })
      .eq('id', job_id)

    if (updateError) throw updateError

    // Create earnings record
    const { data: earnings, error: createEarningsError } = await supabaseClient
      .from('earnings')
      .insert({
        provider_id,
        job_id,
        base_fare: earningsData.base_fare,
        distance_fare: earningsData.distance_fare,
        time_fare: earningsData.time_fare,
        surge_amount: earningsData.surge_amount,
        tip_amount: earningsData.tip_amount || 0,
        bonus_amount: earningsData.bonus_amount || 0,
        gross_earnings: earningsData.gross_earnings,
        platform_fee: earningsData.platform_fee,
        net_earnings: earningsData.net_earnings,
        service_type: job.service_type,
      })
      .select()
      .single()

    if (createEarningsError) throw createEarningsError

    // Update provider stats
    await supabaseClient.rpc('increment_provider_stats', {
      p_provider_id: provider_id,
      p_earnings: earningsData.net_earnings,
    })

    // Notify customer
    await supabaseClient.from('notifications').insert({
      recipient_id: job.customer_id,
      type: 'job_completed',
      title: 'งานเสร็จสมบูรณ์',
      body: 'ผู้ให้บริการได้ทำงานเสร็จเรียบร้อยแล้ว กรุณาให้คะแนน',
      data: {
        job_id,
        provider_id,
        provider_name: `${job.providers.first_name} ${job.providers.last_name}`,
      },
    })

    // Notify provider
    await supabaseClient.from('notifications').insert({
      recipient_id: job.providers.user_id,
      type: 'job_completed',
      title: 'งานเสร็จสมบูรณ์',
      body: `คุณได้รับ ${earningsData.net_earnings} บาท`,
      data: {
        job_id,
        earnings: earningsData.net_earnings,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        earnings: earningsData,
        message: 'Job completed successfully',
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

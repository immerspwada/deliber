import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobAcceptanceRequest {
  job_id: string
  provider_id: string
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

    const body: JobAcceptanceRequest = await req.json()
    const { job_id, provider_id } = body

    // Validate required fields
    if (!job_id || !provider_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use database function to accept job (handles all validation and updates)
    const { data, error } = await supabaseClient.rpc('accept_job', {
      p_job_id: job_id,
      p_provider_id: provider_id,
    })

    if (error) {
      // Parse error message
      if (error.message.includes('JOB_NOT_AVAILABLE')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Job is no longer available' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (error.message.includes('PROVIDER_HAS_ACTIVE_JOB')) {
        return new Response(
          JSON.stringify({ success: false, error: 'You already have an active job' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw error
    }

    // Get updated job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*, providers(*)')
      .eq('id', job_id)
      .single()

    if (jobError) throw jobError

    // Notify customer
    await supabaseClient.from('notifications').insert({
      recipient_id: job.customer_id,
      type: 'job_accepted',
      title: 'ผู้ให้บริการรับงานแล้ว',
      body: `${job.providers.first_name} ${job.providers.last_name} รับงานของคุณแล้ว`,
      data: {
        job_id,
        provider_id,
        provider_name: `${job.providers.first_name} ${job.providers.last_name}`,
        provider_phone: job.providers.phone_number,
      },
    })

    // Generate navigation URL (Google Maps or other navigation app)
    const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      job.pickup_address
    )}`

    return new Response(
      JSON.stringify({
        success: true,
        job,
        navigation_url: navigationUrl,
        message: 'Job accepted successfully',
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

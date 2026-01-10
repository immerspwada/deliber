import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProviderManagementRequest {
  provider_id: string
  action: 'approve' | 'reject' | 'suspend' | 'reactivate'
  reason?: string
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

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ProviderManagementRequest = await req.json()
    const { provider_id, action, reason } = body

    // Validate required fields
    if (!provider_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate reason for reject/suspend
    if ((action === 'reject' || action === 'suspend') && (!reason || reason.length < 10)) {
      return new Response(
        JSON.stringify({ error: 'Reason must be at least 10 characters' }),
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

    let affectedJobs: string[] = []

    // Handle different actions
    switch (action) {
      case 'approve': {
        // Generate provider_uid
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const randomNum = Math.floor(10000 + Math.random() * 90000)
        const providerUid = `PRV-${today}-${randomNum}`

        // Update provider status
        const { error: updateError } = await supabaseClient
          .from('providers')
          .update({
            status: 'approved',
            provider_uid: providerUid,
            approved_at: new Date().toISOString(),
          })
          .eq('id', provider_id)

        if (updateError) throw updateError

        // Send approval notification
        await supabaseClient.from('notifications').insert({
          recipient_id: provider.user_id,
          type: 'application_approved',
          title: 'คำขอของคุณได้รับการอนุมัติ',
          body: `ยินดีด้วย! บัญชีผู้ให้บริการของคุณได้รับการอนุมัติแล้ว รหัสผู้ให้บริการ: ${providerUid}`,
          data: { provider_id, provider_uid: providerUid },
        })

        break
      }

      case 'reject': {
        // Update provider status
        const { error: updateError } = await supabaseClient
          .from('providers')
          .update({
            status: 'rejected',
            suspension_reason: reason,
          })
          .eq('id', provider_id)

        if (updateError) throw updateError

        // Send rejection notification
        await supabaseClient.from('notifications').insert({
          recipient_id: provider.user_id,
          type: 'application_rejected',
          title: 'คำขอของคุณถูกปฏิเสธ',
          body: `ขออภัย คำขอเป็นผู้ให้บริการของคุณถูกปฏิเสธ เหตุผล: ${reason}`,
          data: { provider_id, reason },
        })

        break
      }

      case 'suspend': {
        // Get active jobs
        const { data: activeJobs } = await supabaseClient
          .from('jobs')
          .select('id, customer_id')
          .eq('provider_id', provider_id)
          .in('status', ['accepted', 'arrived', 'in_progress'])

        affectedJobs = activeJobs?.map((j) => j.id) || []

        // Cancel active jobs
        if (affectedJobs.length > 0) {
          await supabaseClient
            .from('jobs')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancelled_by: 'system',
              cancellation_reason: 'Provider suspended by admin',
            })
            .in('id', affectedJobs)

          // Notify affected customers
          for (const job of activeJobs || []) {
            await supabaseClient.from('notifications').insert({
              recipient_id: job.customer_id,
              type: 'job_cancelled',
              title: 'งานถูกยกเลิก',
              body: 'งานของคุณถูกยกเลิกเนื่องจากผู้ให้บริการถูกระงับการใช้งาน',
              data: { job_id: job.id },
            })
          }
        }

        // Update provider status
        const { error: updateError } = await supabaseClient
          .from('providers')
          .update({
            status: 'suspended',
            suspended_at: new Date().toISOString(),
            suspension_reason: reason,
            is_online: false,
          })
          .eq('id', provider_id)

        if (updateError) throw updateError

        // Send suspension notification
        await supabaseClient.from('notifications').insert({
          recipient_id: provider.user_id,
          type: 'account_suspended',
          title: 'บัญชีของคุณถูกระงับ',
          body: `บัญชีผู้ให้บริการของคุณถูกระงับการใช้งาน เหตุผล: ${reason}`,
          data: { provider_id, reason, affected_jobs: affectedJobs },
        })

        break
      }

      case 'reactivate': {
        // Update provider status
        const { error: updateError } = await supabaseClient
          .from('providers')
          .update({
            status: 'approved',
            suspended_at: null,
            suspension_reason: null,
          })
          .eq('id', provider_id)

        if (updateError) throw updateError

        // Send reactivation notification
        await supabaseClient.from('notifications').insert({
          recipient_id: provider.user_id,
          type: 'account_reactivated',
          title: 'บัญชีของคุณถูกเปิดใช้งานอีกครั้ง',
          body: 'บัญชีผู้ให้บริการของคุณได้รับการเปิดใช้งานอีกครั้งแล้ว',
          data: { provider_id },
        })

        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Provider ${action}ed successfully`,
        affected_jobs: affectedJobs,
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const body = await req.json()
    const { provider_id, action, reason, admin_id } = body

    if (!provider_id || !action || !admin_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: provider_id, action, admin_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify admin permissions (basic check)
    const { data: adminUser, error: adminError } = await supabaseClient.auth.admin.getUserById(admin_id)
    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid admin user' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let result
    let auditAction = ''

    switch (action) {
      case 'approve':
        result = await approveProvider(supabaseClient, provider_id, admin_id)
        auditAction = 'APPROVE_PROVIDER'
        break
      
      case 'reject':
        result = await rejectProvider(supabaseClient, provider_id, admin_id, reason)
        auditAction = 'REJECT_PROVIDER'
        break
      
      case 'suspend':
        result = await suspendProvider(supabaseClient, provider_id, admin_id, reason)
        auditAction = 'SUSPEND_PROVIDER'
        break
      
      case 'activate':
        result = await activateProvider(supabaseClient, provider_id, admin_id)
        auditAction = 'ACTIVATE_PROVIDER'
        break
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action. Must be: approve, reject, suspend, or activate' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    // Log admin action for audit trail
    await logAdminAction(supabaseClient, {
      admin_id,
      action: auditAction,
      target_type: 'provider',
      target_id: provider_id,
      reason,
      result: result.success
    })

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Admin provider management error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function approveProvider(supabaseClient: any, providerId: string, adminId: string) {
  try {
    // Generate unique provider UID
    const providerUid = `P${Date.now().toString().slice(-8)}`

    // Update provider status
    const { data: provider, error: updateError } = await supabaseClient
      .from('service_providers')
      .update({
        status: 'approved',
        provider_uid: providerUid,
        approved_at: new Date().toISOString(),
        approved_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .select()
      .single()

    if (updateError) throw updateError

    // TODO: Send approval notification email
    console.log(`Provider ${providerId} approved with UID: ${providerUid}`)

    return {
      success: true,
      message: 'Provider approved successfully',
      data: { provider_uid: providerUid }
    }
  } catch (error) {
    console.error('Error approving provider:', error)
    return {
      success: false,
      message: 'Failed to approve provider',
      error: error.message
    }
  }
}

async function rejectProvider(supabaseClient: any, providerId: string, adminId: string, reason?: string) {
  try {
    // Update provider status
    const { data: provider, error: updateError } = await supabaseClient
      .from('service_providers')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        rejected_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .select()
      .single()

    if (updateError) throw updateError

    // TODO: Send rejection notification email
    console.log(`Provider ${providerId} rejected. Reason: ${reason}`)

    return {
      success: true,
      message: 'Provider rejected successfully'
    }
  } catch (error) {
    console.error('Error rejecting provider:', error)
    return {
      success: false,
      message: 'Failed to reject provider',
      error: error.message
    }
  }
}

async function suspendProvider(supabaseClient: any, providerId: string, adminId: string, reason?: string) {
  try {
    // Update provider status
    const { data: provider, error: updateError } = await supabaseClient
      .from('service_providers')
      .update({
        status: 'suspended',
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .select()
      .single()

    if (updateError) throw updateError

    // TODO: Cancel active jobs
    // TODO: Send suspension notification

    console.log(`Provider ${providerId} suspended. Reason: ${reason}`)

    return {
      success: true,
      message: 'Provider suspended successfully'
    }
  } catch (error) {
    console.error('Error suspending provider:', error)
    return {
      success: false,
      message: 'Failed to suspend provider',
      error: error.message
    }
  }
}

async function activateProvider(supabaseClient: any, providerId: string, adminId: string) {
  try {
    // Update provider status
    const { data: provider, error: updateError } = await supabaseClient
      .from('service_providers')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
        activated_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .select()
      .single()

    if (updateError) throw updateError

    console.log(`Provider ${providerId} activated`)

    return {
      success: true,
      message: 'Provider activated successfully'
    }
  } catch (error) {
    console.error('Error activating provider:', error)
    return {
      success: false,
      message: 'Failed to activate provider',
      error: error.message
    }
  }
}

async function logAdminAction(supabaseClient: any, actionData: {
  admin_id: string
  action: string
  target_type: string
  target_id: string
  reason?: string
  result: boolean
}) {
  try {
    await supabaseClient
      .from('admin_audit_logs')
      .insert({
        id: crypto.randomUUID(),
        admin_id: actionData.admin_id,
        action: actionData.action,
        target_type: actionData.target_type,
        target_id: actionData.target_id,
        changes: {
          reason: actionData.reason,
          result: actionData.result,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log admin action:', error)
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}
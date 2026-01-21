import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentVerificationRequest {
  document_id: string
  action: 'approve' | 'reject'
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

    // Get admin user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: DocumentVerificationRequest = await req.json()
    const { document_id, action, reason } = body

    // Validate required fields
    if (!document_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate rejection reason
    if (action === 'reject' && (!reason || reason.length < 10)) {
      return new Response(
        JSON.stringify({ error: 'Rejection reason must be at least 10 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get document
    const { data: document, error: docError } = await supabaseClient
      .from('provider_documents')
      .select('*, providers(*)')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update document status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      verified_at: new Date().toISOString(),
    }

    if (action === 'reject') {
      updateData.rejection_reason = reason
    }

    const { error: updateError } = await supabaseClient
      .from('provider_documents')
      .update(updateData)
      .eq('id', document_id)

    if (updateError) throw updateError

    // Check if all documents are now approved
    const { data: allDocuments } = await supabaseClient
      .from('provider_documents')
      .select('status')
      .eq('provider_id', document.provider_id)

    const allApproved = allDocuments?.every((d) => d.status === 'approved')
    const hasRejected = allDocuments?.some((d) => d.status === 'rejected')

    // Update provider status if needed
    if (action === 'approve' && allApproved && !hasRejected) {
      // All documents approved - ready for final provider approval
      await supabaseClient
        .from('providers')
        .update({ status: 'pending_verification' })
        .eq('id', document.provider_id)
    } else if (action === 'reject') {
      // Document rejected - provider needs to resubmit
      await supabaseClient
        .from('providers')
        .update({ status: 'pending' })
        .eq('id', document.provider_id)
    }

    // Send notification to provider
    const notificationTitle =
      action === 'approve' ? 'เอกสารได้รับการอนุมัติ' : 'เอกสารถูกปฏิเสธ'
    const notificationBody =
      action === 'approve'
        ? `เอกสาร ${getDocumentTypeName(document.document_type)} ได้รับการอนุมัติแล้ว`
        : `เอกสาร ${getDocumentTypeName(document.document_type)} ถูกปฏิเสธ: ${reason}`

    await supabaseClient.from('notifications').insert({
      recipient_id: document.providers.user_id,
      type: action === 'approve' ? 'document_approved' : 'document_rejected',
      title: notificationTitle,
      body: notificationBody,
      data: {
        document_id,
        document_type: document.document_type,
        reason: action === 'reject' ? reason : undefined,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: action === 'approve' ? 'Document approved successfully' : 'Document rejected',
        all_documents_approved: allApproved,
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

function getDocumentTypeName(type: string): string {
  const names: Record<string, string> = {
    national_id: 'บัตรประชาชน',
    driver_license: 'ใบขับขี่',
    vehicle_registration: 'ทะเบียนรถ',
    vehicle_insurance: 'ประกันรถ',
    bank_account: 'บัญชีธนาคาร',
    criminal_record: 'ประวัติอาชญากรรม',
    health_certificate: 'ใบรับรองสุขภาพ',
  }
  return names[type] || type
}

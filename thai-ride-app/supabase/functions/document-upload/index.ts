import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentUploadRequest {
  provider_id: string
  document_type: string
  file_name: string
  file_data: string // base64 encoded
  expiry_date?: string
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

    const body: DocumentUploadRequest = await req.json()
    const { provider_id, document_type, file_name, file_data, expiry_date } = body

    // Validate required fields
    if (!provider_id || !document_type || !file_name || !file_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate document type
    const validDocumentTypes = [
      'national_id',
      'driver_license',
      'vehicle_registration',
      'vehicle_insurance',
      'bank_account',
      'criminal_record',
      'health_certificate',
    ]

    if (!validDocumentTypes.includes(document_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid document type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify provider exists
    const { data: provider, error: providerError } = await supabaseClient
      .from('providers')
      .select('id, status')
      .eq('id', provider_id)
      .single()

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ error: 'Provider not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate expiry date if provided
    if (expiry_date) {
      const expiryDateObj = new Date(expiry_date)
      if (expiryDateObj <= new Date()) {
        return new Response(
          JSON.stringify({ error: 'Expiry date must be in the future' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Decode base64 file data
    const fileBuffer = Uint8Array.from(atob(file_data), (c) => c.charCodeAt(0))

    // Validate file size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024
    if (fileBuffer.length > maxSizeBytes) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 5MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate storage path
    const fileExt = file_name.split('.').pop()
    const storagePath = `${provider_id}/${document_type}_${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('provider-documents')
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(fileExt || ''),
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error('Failed to upload document to storage')
    }

    // Create document record in database
    const { data: documentData, error: dbError } = await supabaseClient
      .from('provider_documents')
      .insert({
        provider_id,
        document_type,
        storage_path: uploadData.path,
        status: 'pending',
        expiry_date: expiry_date || null,
      })
      .select()
      .single()

    if (dbError) {
      // Cleanup uploaded file if database insert fails
      await supabaseClient.storage
        .from('provider-documents')
        .remove([uploadData.path])
      throw dbError
    }

    // Check if all required documents are uploaded
    await checkAndUpdateProviderStatus(supabaseClient, provider_id)

    // Create notification for admin
    await supabaseClient
      .from('notifications')
      .insert({
        recipient_id: provider.user_id,
        type: 'document_uploaded',
        title: 'เอกสารถูกอัปโหลดแล้ว',
        body: `เอกสาร ${getDocumentTypeName(document_type)} ถูกอัปโหลดเรียบร้อยแล้ว`,
        data: { 
          provider_id,
          document_id: documentData.id,
          document_type,
        },
      })

    return new Response(
      JSON.stringify({
        success: true,
        document_id: documentData.id,
        storage_path: documentData.storage_path,
        status: 'pending',
        message: 'Document uploaded successfully',
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

async function checkAndUpdateProviderStatus(supabaseClient: any, providerId: string): Promise<void> {
  // Get provider with service types
  const { data: provider } = await supabaseClient
    .from('providers')
    .select('service_types, status')
    .eq('id', providerId)
    .single()

  if (!provider || provider.status !== 'pending') {
    return
  }

  // Get all uploaded documents
  const { data: documents } = await supabaseClient
    .from('provider_documents')
    .select('document_type')
    .eq('provider_id', providerId)

  if (!documents) {
    return
  }

  const uploadedTypes = documents.map((d: any) => d.document_type)

  // Define required documents per service type
  const requiredDocuments: Record<string, string[]> = {
    ride: ['national_id', 'driver_license', 'vehicle_registration', 'vehicle_insurance'],
    delivery: ['national_id', 'driver_license', 'vehicle_registration'],
    shopping: ['national_id', 'bank_account'],
    moving: ['national_id', 'driver_license', 'vehicle_registration', 'vehicle_insurance'],
    laundry: ['national_id', 'bank_account'],
  }

  // Check if all required documents for all service types are uploaded
  let allDocumentsUploaded = true
  for (const serviceType of provider.service_types) {
    const required = requiredDocuments[serviceType] || []
    for (const docType of required) {
      if (!uploadedTypes.includes(docType)) {
        allDocumentsUploaded = false
        break
      }
    }
    if (!allDocumentsUploaded) break
  }

  // Update provider status if all documents uploaded
  if (allDocumentsUploaded) {
    await supabaseClient
      .from('providers')
      .update({ status: 'pending_verification' })
      .eq('id', providerId)
  }
}

function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf',
  }
  return contentTypes[extension.toLowerCase()] || 'application/octet-stream'
}

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

/**
 * useDriverDocument - Driver Document Management
 * Feature: F194 - Driver Document System
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface DriverDocument {
  id: string
  provider_id: string
  document_type: 'id_card' | 'driving_license' | 'vehicle_registration' | 'insurance' | 'criminal_record' | 'photo'
  document_url: string
  document_number?: string
  expiry_date?: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  rejection_reason?: string
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
}

export function useDriverDocument() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const documents = ref<DriverDocument[]>([])

  const pendingDocuments = computed(() => documents.value.filter(d => d.status === 'pending'))
  const expiredDocuments = computed(() => documents.value.filter(d => d.status === 'expired' || (d.expiry_date && new Date(d.expiry_date) < new Date())))
  const approvedDocuments = computed(() => documents.value.filter(d => d.status === 'approved'))

  const fetchDocuments = async (providerId?: string) => {
    loading.value = true
    try {
      let query = supabase.from('provider_documents').select('*').order('created_at', { ascending: false })
      if (providerId) query = query.eq('provider_id', providerId)
      const { data, error: err } = await query
      if (err) throw err
      documents.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const uploadDocument = async (providerId: string, documentType: string, file: File): Promise<DriverDocument | null> => {
    try {
      const fileName = `${providerId}/${documentType}_${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadErr } = await supabase.storage.from('provider-documents').upload(fileName, file)
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('provider-documents').getPublicUrl(fileName)
      
      const { data, error: err } = await supabase.from('provider_documents').insert({
        provider_id: providerId,
        document_type: documentType,
        document_url: urlData.publicUrl,
        status: 'pending'
      } as never).select().single()
      if (err) throw err
      documents.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const approveDocument = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_documents').update({ status: 'approved', verified_at: new Date().toISOString() } as never).eq('id', id)
      if (err) throw err
      const idx = documents.value.findIndex(d => d.id === id)
      if (idx !== -1) documents.value[idx].status = 'approved'
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const rejectDocument = async (id: string, reason: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_documents').update({ status: 'rejected', rejection_reason: reason } as never).eq('id', id)
      if (err) throw err
      const idx = documents.value.findIndex(d => d.id === id)
      if (idx !== -1) { documents.value[idx].status = 'rejected'; documents.value[idx].rejection_reason = reason }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const deleteDocument = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_documents').delete().eq('id', id)
      if (err) throw err
      documents.value = documents.value.filter(d => d.id !== id)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getDocumentTypeText = (type: string) => ({ id_card: 'บัตรประชาชน', driving_license: 'ใบขับขี่', vehicle_registration: 'ทะเบียนรถ', insurance: 'ประกันภัย', criminal_record: 'ประวัติอาชญากรรม', photo: 'รูปถ่าย' }[type] || type)
  const getStatusText = (s: string) => ({ pending: 'รอตรวจสอบ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ', expired: 'หมดอายุ' }[s] || s)

  return { loading, error, documents, pendingDocuments, expiredDocuments, approvedDocuments, fetchDocuments, uploadDocument, approveDocument, rejectDocument, deleteDocument, getDocumentTypeText, getStatusText }
}

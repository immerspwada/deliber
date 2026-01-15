/**
 * Composable: useProviderMedia
 * จัดการอัพโหลดรูปโปรไฟล์และรูปรถของ Provider
 * 
 * Role-based access:
 * - Provider: อัพโหลด/แก้ไขรูปตัวเอง
 * - Admin: ดู/จัดการรูปทุกคน
 * - Customer: ดูรูปเท่านั้น (public bucket)
 */
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { resizeImage, type ResizeOptions } from '../utils/imageResize'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface ProviderMediaState {
  avatarUrl: string | null
  vehiclePhotoUrl: string | null
  isUploading: boolean
  uploadProgress: number
  error: string | null
}

// Provider data interface for type safety
interface ProviderMediaData {
  id: string
  avatar_url?: string | null
  vehicle_photo_url?: string | null
}

const AVATAR_BUCKET = 'provider-avatars'
const VEHICLE_BUCKET = 'provider-vehicles'

// Resize options for avatar (smaller, square)
const AVATAR_RESIZE_OPTIONS: ResizeOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.85,
  format: 'webp'
}

// Resize options for vehicle photo (larger)
const VEHICLE_RESIZE_OPTIONS: ResizeOptions = {
  maxWidth: 1200,
  maxHeight: 800,
  quality: 0.85,
  format: 'webp'
}

export function useProviderMedia(providerId?: string) {
  const authStore = useAuthStore()
  
  const state = ref<ProviderMediaState>({
    avatarUrl: null,
    vehiclePhotoUrl: null,
    isUploading: false,
    uploadProgress: 0,
    error: null
  })

  // Get current provider ID (from param or from auth)
  const currentProviderId = computed(() => {
    if (providerId) return providerId
    // Get provider ID from providers_v2 via user_id
    return null // Will be fetched
  })

  /**
   * Fetch provider's current media URLs
   */
  async function fetchProviderMedia(provId?: string): Promise<void> {
    const targetId = provId || currentProviderId.value
    if (!targetId) {
      // Try to get provider ID from user
      const userId = authStore.user?.id
      if (!userId) return

      const { data } = await supabase
        .from('providers_v2')
        .select('id, avatar_url, vehicle_photo_url')
        .eq('user_id', userId)
        .single()
      
      if (data) {
        const providerData = data as unknown as ProviderMediaData
        state.value.avatarUrl = providerData.avatar_url ?? null
        state.value.vehiclePhotoUrl = providerData.vehicle_photo_url ?? null
      }
      return
    }

    const { data, error } = await supabase
      .from('providers_v2')
      .select('avatar_url, vehicle_photo_url')
      .eq('id', targetId)
      .single()

    if (error) {
      console.error('[ProviderMedia] Error fetching media:', error)
      return
    }

    if (data) {
      const providerData = data as unknown as ProviderMediaData
      state.value.avatarUrl = providerData.avatar_url ?? null
      state.value.vehiclePhotoUrl = providerData.vehicle_photo_url ?? null
    }
  }

  /**
   * Upload avatar image
   */
  async function uploadAvatar(file: File): Promise<UploadResult> {
    state.value.isUploading = true
    state.value.uploadProgress = 0
    state.value.error = null

    try {
      // Get provider ID
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('ไม่พบข้อมูลผู้ใช้')
      }

      const { data: providerData } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', userId)
        .single()

      const provId = (providerData as { id?: string } | null)?.id
      if (!provId) {
        throw new Error('ไม่พบข้อมูล Provider')
      }

      state.value.uploadProgress = 10

      // Resize image
      const resizedBlob = await resizeImage(file, AVATAR_RESIZE_OPTIONS)
      state.value.uploadProgress = 40

      // Generate filename
      const ext = AVATAR_RESIZE_OPTIONS.format || 'webp'
      const filename = `${provId}/avatar.${ext}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filename, resizedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${ext}`
        })

      if (uploadError) {
        throw uploadError
      }
      state.value.uploadProgress = 80

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filename)

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}` // Cache bust

      // Update providers_v2 record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase
        .from('providers_v2') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', provId)

      if (updateError) {
        throw updateError
      }

      state.value.avatarUrl = publicUrl
      state.value.uploadProgress = 100

      return { success: true, url: publicUrl }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'อัพโหลดรูปไม่สำเร็จ'
      state.value.error = message
      console.error('[ProviderMedia] Avatar upload error:', err)
      return { success: false, error: message }
    } finally {
      state.value.isUploading = false
    }
  }

  /**
   * Upload vehicle photo
   */
  async function uploadVehiclePhoto(file: File): Promise<UploadResult> {
    state.value.isUploading = true
    state.value.uploadProgress = 0
    state.value.error = null

    try {
      // Get provider ID
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('ไม่พบข้อมูลผู้ใช้')
      }

      const { data: providerData } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', userId)
        .single()

      const provId = (providerData as { id?: string } | null)?.id
      if (!provId) {
        throw new Error('ไม่พบข้อมูล Provider')
      }

      state.value.uploadProgress = 10

      // Resize image
      const resizedBlob = await resizeImage(file, VEHICLE_RESIZE_OPTIONS)
      state.value.uploadProgress = 40

      // Generate filename
      const ext = VEHICLE_RESIZE_OPTIONS.format || 'webp'
      const filename = `${provId}/vehicle.${ext}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(VEHICLE_BUCKET)
        .upload(filename, resizedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${ext}`
        })

      if (uploadError) {
        throw uploadError
      }
      state.value.uploadProgress = 80

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(VEHICLE_BUCKET)
        .getPublicUrl(filename)

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}` // Cache bust

      // Update providers_v2 record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase
        .from('providers_v2') as any)
        .update({ vehicle_photo_url: publicUrl })
        .eq('id', provId)

      if (updateError) {
        throw updateError
      }

      state.value.vehiclePhotoUrl = publicUrl
      state.value.uploadProgress = 100

      return { success: true, url: publicUrl }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'อัพโหลดรูปรถไม่สำเร็จ'
      state.value.error = message
      console.error('[ProviderMedia] Vehicle photo upload error:', err)
      return { success: false, error: message }
    } finally {
      state.value.isUploading = false
    }
  }

  /**
   * Delete avatar
   */
  async function deleteAvatar(): Promise<boolean> {
    try {
      const userId = authStore.user?.id
      if (!userId) return false

      const { data: providerData } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', userId)
        .single()

      const provId = (providerData as { id?: string } | null)?.id
      if (!provId) return false

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove([`${provId}/avatar.webp`])

      if (deleteError) {
        console.error('[ProviderMedia] Delete avatar error:', deleteError)
      }

      // Update record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase
        .from('providers_v2') as any)
        .update({ avatar_url: null })
        .eq('id', provId)

      state.value.avatarUrl = null
      return true
    } catch (err) {
      console.error('[ProviderMedia] Delete avatar error:', err)
      return false
    }
  }

  /**
   * Delete vehicle photo
   */
  async function deleteVehiclePhoto(): Promise<boolean> {
    try {
      const userId = authStore.user?.id
      if (!userId) return false

      const { data: providerData } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', userId)
        .single()

      const provId = (providerData as { id?: string } | null)?.id
      if (!provId) return false

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(VEHICLE_BUCKET)
        .remove([`${provId}/vehicle.webp`])

      if (deleteError) {
        console.error('[ProviderMedia] Delete vehicle photo error:', deleteError)
      }

      // Update record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase
        .from('providers_v2') as any)
        .update({ vehicle_photo_url: null })
        .eq('id', provId)

      state.value.vehiclePhotoUrl = null
      return true
    } catch (err) {
      console.error('[ProviderMedia] Delete vehicle photo error:', err)
      return false
    }
  }

  return {
    state,
    avatarUrl: computed(() => state.value.avatarUrl),
    vehiclePhotoUrl: computed(() => state.value.vehiclePhotoUrl),
    isUploading: computed(() => state.value.isUploading),
    uploadProgress: computed(() => state.value.uploadProgress),
    error: computed(() => state.value.error),
    fetchProviderMedia,
    uploadAvatar,
    uploadVehiclePhoto,
    deleteAvatar,
    deleteVehiclePhoto
  }
}

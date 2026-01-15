/**
 * Composable: useShareTrip
 * แชร์ลิงก์ติดตามการเดินทางให้คนอื่น
 * 
 * Role Impact:
 * - Customer: สร้างและแชร์ลิงก์ติดตาม
 * - Provider: ไม่มีผลกระทบ
 * - Admin: ดูสถิติการแชร์
 */
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface ShareLink {
  id: string
  ride_id: string
  share_token: string
  expires_at: string
  is_active: boolean
  view_count: number
  created_at: string
}

export interface SharedRideInfo {
  ride: {
    id: string
    status: string
    pickup_address: string
    destination_address: string
    pickup_lat: number
    pickup_lng: number
    destination_lat: number
    destination_lng: number
    estimated_fare: number
    provider_id?: string
  }
  provider: {
    name: string
    vehicle_type: string
    vehicle_plate: string
    vehicle_color: string
    current_lat: number
    current_lng: number
  } | null
  expires_at: string
}

export interface ShareLinkAnalytics {
  total_views: number
  unique_views: number
  recent_views: Array<{
    viewed_at: string
    user_agent: string | null
    referrer: string | null
  }>
}

export function useShareTrip(rideId?: string) {
  const shareLink = ref<ShareLink | null>(null)
  const sharedRideInfo = ref<SharedRideInfo | null>(null)
  const analytics = ref<ShareLinkAnalytics | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const shareUrl = ref<string | null>(null)

  // Generate share URL from token
  function generateShareUrl(token: string): string {
    const baseUrl = window.location.origin
    return `${baseUrl}/track/${token}`
  }

  // Create a new share link for a ride
  async function createShareLink(): Promise<string | null> {
    if (!rideId) {
      error.value = 'ไม่พบข้อมูลการเดินทาง'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase
        .rpc('create_ride_share_link', { p_ride_id: rideId })

      if (rpcError) {
        console.error('[ShareTrip] RPC error:', rpcError)
        error.value = 'ไม่สามารถสร้างลิงก์แชร์ได้'
        return null
      }

      // Parse JSON response
      const responseData = data as { success?: boolean; share_token?: string; error?: string } | null
      
      if (responseData?.error) {
        console.error('[ShareTrip] Error:', responseData.error)
        error.value = responseData.error === 'ride_not_found_or_unauthorized' 
          ? 'ไม่พบการเดินทางหรือไม่มีสิทธิ์' 
          : 'เกิดข้อผิดพลาด'
        return null
      }

      if (responseData?.success && responseData?.share_token) {
        const url = generateShareUrl(responseData.share_token)
        shareUrl.value = url
        console.log('[ShareTrip] Share link created:', url)
        return url
      }

      return null
    } catch (err) {
      console.error('[ShareTrip] Exception:', err)
      error.value = 'เกิดข้อผิดพลาด'
      return null
    } finally {
      loading.value = false
    }
  }

  // Get shared ride info by token (for public view)
  async function getSharedRideInfo(token: string): Promise<SharedRideInfo | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_shared_ride_info', { p_share_token: token })

      if (rpcError) {
        console.error('[ShareTrip] RPC error:', rpcError)
        error.value = 'ไม่สามารถโหลดข้อมูลได้'
        return null
      }

      // Parse JSON response for error check
      const errorData = data as { error?: string } | null
      if (errorData?.error) {
        console.error('[ShareTrip] Error:', errorData.error)
        error.value = errorData.error === 'invalid_or_expired_link'
          ? 'ลิงก์ไม่ถูกต้องหรือหมดอายุ'
          : 'ไม่พบข้อมูลการเดินทาง'
        return null
      }

      // Parse JSON response
      const responseData = data as { success?: boolean; error?: string; ride?: SharedRideInfo['ride']; provider?: SharedRideInfo['provider']; expires_at?: string } | null
      
      if (responseData?.success && responseData.ride) {
        sharedRideInfo.value = {
          ride: responseData.ride,
          provider: responseData.provider || null,
          expires_at: responseData.expires_at || ''
        }
        return sharedRideInfo.value
      }

      return null
    } catch (err) {
      console.error('[ShareTrip] Exception:', err)
      error.value = 'เกิดข้อผิดพลาด'
      return null
    } finally {
      loading.value = false
    }
  }

  // Share via Web Share API or copy to clipboard
  async function shareViaSystem(customMessage?: string): Promise<boolean> {
    const url = shareUrl.value
    if (!url) {
      const newUrl = await createShareLink()
      if (!newUrl) return false
    }

    const shareData = {
      title: 'ติดตามการเดินทาง',
      text: customMessage || 'ติดตามการเดินทางของฉันได้ที่นี่',
      url: shareUrl.value!
    }

    // Try Web Share API first
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData)
        console.log('[ShareTrip] Shared via Web Share API')
        return true
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          console.warn('[ShareTrip] Web Share failed:', err)
        }
      }
    }

    // Fallback to clipboard
    return copyToClipboard()
  }

  // Copy share URL to clipboard
  async function copyToClipboard(): Promise<boolean> {
    if (!shareUrl.value) {
      const url = await createShareLink()
      if (!url) return false
    }

    try {
      await navigator.clipboard.writeText(shareUrl.value!)
      console.log('[ShareTrip] Copied to clipboard')
      return true
    } catch (err) {
      console.error('[ShareTrip] Clipboard error:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl.value!
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        return true
      } catch {
        error.value = 'ไม่สามารถคัดลอกได้'
        return false
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }

  // Share via LINE
  function shareViaLine(): void {
    if (!shareUrl.value) {
      createShareLink().then(url => {
        if (url) openLineShare(url)
      })
      return
    }
    openLineShare(shareUrl.value)
  }

  function openLineShare(url: string): void {
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent('ติดตามการเดินทางของฉัน: ' + url)}`
    window.open(lineUrl, '_blank')
  }

  // Check if share link exists for this ride
  async function checkExistingLink(): Promise<void> {
    if (!rideId) return

    try {
      const { data, error: dbError } = await supabase
        .from('ride_share_links')
        .select('*')
        .eq('ride_id', rideId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!dbError && data) {
        shareLink.value = data
        shareUrl.value = generateShareUrl(data.share_token)
      }
    } catch (err) {
      console.warn('[ShareTrip] Check existing link error:', err)
    }
  }

  // Log share link view (for analytics tracking)
  async function logShareLinkView(token: string): Promise<boolean> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('log_share_link_view', {
          p_share_token: token,
          p_viewer_ip: null, // IP is captured server-side if needed
          p_user_agent: navigator.userAgent,
          p_referrer: document.referrer || null
        })

      if (rpcError) {
        console.warn('[ShareTrip] Log view error:', rpcError)
        return false
      }

      const result = data as { success?: boolean; is_unique?: boolean } | null
      if (result?.success) {
        console.log('[ShareTrip] View logged, unique:', result.is_unique)
        return true
      }

      return false
    } catch (err) {
      console.warn('[ShareTrip] Log view exception:', err)
      return false
    }
  }

  // Get analytics for a share link
  async function getShareLinkAnalytics(shareLinkId: string): Promise<ShareLinkAnalytics | null> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_share_link_analytics', { p_share_link_id: shareLinkId })

      if (rpcError) {
        console.error('[ShareTrip] Get analytics error:', rpcError)
        return null
      }

      const result = data as { success?: boolean; error?: string; total_views?: number; unique_views?: number; recent_views?: ShareLinkAnalytics['recent_views'] } | null
      
      if (result?.error) {
        console.error('[ShareTrip] Analytics error:', result.error)
        return null
      }

      if (result?.success) {
        analytics.value = {
          total_views: result.total_views || 0,
          unique_views: result.unique_views || 0,
          recent_views: result.recent_views || []
        }
        return analytics.value
      }

      return null
    } catch (err) {
      console.error('[ShareTrip] Get analytics exception:', err)
      return null
    }
  }

  // Computed
  const hasShareLink = computed(() => !!shareUrl.value)
  const isExpired = computed(() => {
    if (!shareLink.value?.expires_at) return false
    return new Date(shareLink.value.expires_at) < new Date()
  })

  return {
    shareLink,
    sharedRideInfo,
    shareUrl,
    analytics,
    loading,
    error,
    hasShareLink,
    isExpired,
    createShareLink,
    getSharedRideInfo,
    shareViaSystem,
    shareViaLine,
    copyToClipboard,
    checkExistingLink,
    logShareLinkView,
    getShareLinkAnalytics
  }
}

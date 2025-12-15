import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface RideHistoryItem {
  id: string
  tracking_id: string  // Human-readable tracking ID (e.g., RID-20251215-000001)
  type: 'ride' | 'delivery' | 'shopping'
  typeName: string
  from: string
  to: string
  date: string
  time: string
  fare: number
  status: 'completed' | 'cancelled'
  rating: number | null
  driver_name?: string
  driver_tracking_id?: string  // Driver tracking ID
  vehicle?: string
}

// Demo data with tracking IDs
const DEMO_HISTORY: RideHistoryItem[] = [
  {
    id: '1',
    tracking_id: 'RID-20251215-000001',
    type: 'ride',
    typeName: 'เรียกรถ',
    from: 'สยามพารากอน',
    to: 'สถานีรถไฟฟ้าอโศก',
    date: '15 ธ.ค. 2567',
    time: '14:30',
    fare: 85,
    status: 'completed',
    rating: 5,
    driver_name: 'สมชาย ใจดี',
    driver_tracking_id: 'DRV-20251101-000042',
    vehicle: 'Toyota Camry'
  },
  {
    id: '2',
    tracking_id: 'DEL-20251214-000015',
    type: 'delivery',
    typeName: 'ส่งของ',
    from: 'ลาดพร้าว 71',
    to: 'รามคำแหง 24',
    date: '14 ธ.ค. 2567',
    time: '10:15',
    fare: 65,
    status: 'completed',
    rating: 4,
    driver_tracking_id: 'RDR-20251105-000018'
  },
  {
    id: '3',
    tracking_id: 'RID-20251212-000089',
    type: 'ride',
    typeName: 'เรียกรถ',
    from: 'เซ็นทรัลเวิลด์',
    to: 'สนามบินดอนเมือง',
    date: '12 ธ.ค. 2567',
    time: '06:00',
    fare: 350,
    status: 'completed',
    rating: 5,
    driver_name: 'วิชัย ขับรถ',
    driver_tracking_id: 'DRV-20251020-000007',
    vehicle: 'Honda City'
  },
  {
    id: '4',
    tracking_id: 'RID-20251210-000156',
    type: 'ride',
    typeName: 'เรียกรถ',
    from: 'MBK Center',
    to: 'สีลม',
    date: '10 ธ.ค. 2567',
    time: '19:30',
    fare: 95,
    status: 'cancelled',
    rating: null
  }
]

export function useRideHistory() {
  const authStore = useAuthStore()
  const history = ref<RideHistoryItem[]>([])
  const loading = ref(false)

  // Fetch ride history
  const fetchHistory = async (filter?: 'all' | 'ride' | 'delivery' | 'shopping') => {
    loading.value = true

    try {
      if (!authStore.user?.id) {
        // Return demo data
        history.value = filter && filter !== 'all'
          ? DEMO_HISTORY.filter(h => h.type === filter)
          : DEMO_HISTORY
        return history.value
      }

      let query = (supabase
        .from('ride_requests') as any)
        .select(`
          id,
          pickup_address,
          destination_address,
          ride_type,
          estimated_fare,
          final_fare,
          status,
          created_at,
          completed_at,
          provider:provider_id (
            vehicle_type,
            users:user_id (name)
          ),
          rating:ride_ratings (rating)
        `)
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter && filter !== 'all') {
        query = query.eq('ride_type', filter)
      }

      const { data, error } = await query

      if (!error && data) {
        history.value = data.map((item: any) => ({
          id: item.id,
          tracking_id: item.tracking_id || `RID-${formatDateForId(item.created_at)}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          type: 'ride',
          typeName: 'เรียกรถ',
          from: item.pickup_address?.split(',')[0] || 'ไม่ระบุ',
          to: item.destination_address?.split(',')[0] || 'ไม่ระบุ',
          date: formatDate(item.created_at),
          time: formatTime(item.created_at),
          fare: item.final_fare || item.estimated_fare,
          status: item.status === 'completed' ? 'completed' : 'cancelled',
          rating: item.rating?.[0]?.rating || null,
          driver_name: item.provider?.users?.name,
          driver_tracking_id: item.provider?.tracking_id,
          vehicle: item.provider?.vehicle_type
        }))
      }

      // If no real data, use demo
      if (history.value.length === 0) {
        history.value = filter && filter !== 'all'
          ? DEMO_HISTORY.filter(h => h.type === filter)
          : DEMO_HISTORY
      }

      return history.value
    } catch (err) {
      console.error('Error fetching history:', err)
      history.value = DEMO_HISTORY
      return history.value
    } finally {
      loading.value = false
    }
  }

  // Get single ride details
  const getRideDetails = async (rideId: string) => {
    try {
      const { data } = await (supabase
        .from('ride_requests') as any)
        .select(`
          *,
          provider:provider_id (
            vehicle_type,
            vehicle_plate,
            rating,
            users:user_id (name, avatar_url)
          ),
          rating:ride_ratings (rating, comment, tip_amount)
        `)
        .eq('id', rideId)
        .single()

      return data
    } catch (err) {
      console.error('Error fetching ride details:', err)
      return null
    }
  }

  // Rebook a ride
  const rebookRide = (item: RideHistoryItem) => {
    // Return data needed to pre-fill a new ride request
    return {
      from: item.from,
      to: item.to,
      type: item.type
    }
  }

  return {
    history,
    loading,
    fetchHistory,
    getRideDetails,
    rebookRide
  }
}

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function formatDateForId(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

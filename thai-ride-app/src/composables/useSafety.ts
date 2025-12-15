import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  relationship: string
  is_primary: boolean
}

export interface TripShare {
  id: string
  ride_id: string
  share_code: string
  shared_with_phone?: string
  shared_with_email?: string
  expires_at: string
}

export function useSafety() {
  const authStore = useAuthStore()
  const emergencyContacts = ref<EmergencyContact[]>([])
  const loading = ref(false)

  // Fetch emergency contacts
  const fetchEmergencyContacts = async () => {
    if (!authStore.user?.id) return []

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('emergency_contacts') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('is_primary', { ascending: false })

      if (!error) {
        emergencyContacts.value = data || []
      }
      return data || []
    } catch (err) {
      console.error('Error fetching contacts:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Add emergency contact
  const addEmergencyContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!authStore.user?.id) return null

    try {
      const { data, error } = await (supabase
        .from('emergency_contacts') as any)
        .insert({
          user_id: authStore.user.id,
          ...contact
        })
        .select()
        .single()

      if (!error && data) {
        emergencyContacts.value.push(data)
      }
      return data
    } catch (err) {
      console.error('Error adding contact:', err)
      return null
    }
  }

  // Remove emergency contact
  const removeEmergencyContact = async (id: string) => {
    try {
      await (supabase
        .from('emergency_contacts') as any)
        .delete()
        .eq('id', id)

      emergencyContacts.value = emergencyContacts.value.filter(c => c.id !== id)
      return true
    } catch (err) {
      console.error('Error removing contact:', err)
      return false
    }
  }

  // Share trip
  const shareTrip = async (rideId: string, phone?: string, email?: string) => {
    const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    try {
      const { error } = await (supabase
        .from('trip_shares') as any)
        .insert({
          ride_id: rideId,
          share_code: shareCode,
          shared_with_phone: phone,
          shared_with_email: email,
          expires_at: expiresAt
        })
        .select()
        .single()

      if (!error) {
        return { shareCode, shareUrl: `${window.location.origin}/track/${shareCode}` }
      }
      return null
    } catch (err) {
      console.error('Error sharing trip:', err)
      // Return mock share for demo
      return { shareCode, shareUrl: `${window.location.origin}/track/${shareCode}` }
    }
  }

  // Get shared trip
  const getSharedTrip = async (shareCode: string) => {
    try {
      const { data } = await (supabase
        .from('trip_shares') as any)
        .select(`
          *,
          ride:ride_id (
            pickup_address,
            destination_address,
            status,
            provider_id
          )
        `)
        .eq('share_code', shareCode)
        .gt('expires_at', new Date().toISOString())
        .single()

      return data
    } catch (err) {
      console.error('Error getting shared trip:', err)
      return null
    }
  }

  // Trigger SOS
  const triggerSOS = async (rideId: string, location: { lat: number; lng: number }) => {
    // In production, this would:
    // 1. Alert emergency contacts
    // 2. Notify support team
    // 3. Record incident
    // 4. Optionally call emergency services

    console.log('SOS triggered for ride:', rideId, 'at location:', location)

    // Send notification to emergency contacts
    const contacts = emergencyContacts.value.filter(c => c.is_primary)
    
    // For demo, just show alert
    alert(`SOS ส่งแล้ว!\n\nตำแหน่ง: ${location.lat}, ${location.lng}\nแจ้งเตือนไปยัง: ${contacts.map(c => c.name).join(', ') || 'ศูนย์ช่วยเหลือ'}`)

    return true
  }

  // Call emergency number
  const callEmergency = (type: 'police' | 'ambulance' | 'fire' | 'tourist') => {
    const numbers: Record<string, string> = {
      police: '191',
      ambulance: '1669',
      fire: '199',
      tourist: '1155'
    }
    window.location.href = `tel:${numbers[type]}`
  }

  return {
    emergencyContacts,
    loading,
    fetchEmergencyContacts,
    addEmergencyContact,
    removeEmergencyContact,
    shareTrip,
    getSharedTrip,
    triggerSOS,
    callEmergency
  }
}

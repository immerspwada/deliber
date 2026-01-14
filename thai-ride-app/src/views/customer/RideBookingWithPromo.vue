<template>
  <div class="ride-booking-page">
    <div class="booking-container">
      <h1>🚗 จองรถ</h1>

      <!-- Pickup & Dropoff -->
      <div class="location-section">
        <div class="input-group">
          <label>📍 จุดรับ</label>
          <input 
            v-model="pickup.address" 
            placeholder="ระบุจุดรับ"
            @input="calculateFare"
          />
        </div>

        <div class="input-group">
          <label>🎯 จุดส่ง</label>
          <input 
            v-model="dropoff.address" 
            placeholder="ระบุจุดส่ง"
            @input="calculateFare"
          />
        </div>
      </div>

      <!-- Service Type -->
      <div class="service-section">
        <label>🚙 ประเภทบริการ</label>
        <div class="service-options">
          <button
            v-for="service in serviceTypes"
            :key="service.value"
            :class="['service-btn', { active: selectedService === service.value }]"
            @click="selectService(service.value)"
          >
            <span class="icon">{{ service.icon }}</span>
            <span class="name">{{ service.name }}</span>
          </button>
        </div>
      </div>

      <!-- Smart Promo Suggestion -->
      <SmartPromoSuggestion
        v-if="estimatedFare > 0"
        :service-type="selectedService"
        :estimated-fare="estimatedFare"
        :pickup="pickup"
        @applied="handlePromoApplied"
      />

      <!-- Fare Summary -->
      <div v-if="estimatedFare > 0" class="fare-summary">
        <div class="fare-row">
          <span>ค่าโดยสาร</span>
          <span>฿{{ estimatedFare.toLocaleString() }}</span>
        </div>

        <div v-if="appliedPromo" class="fare-row discount">
          <span>ส่วนลด ({{ appliedPromo.code }})</span>
          <span>-฿{{ appliedPromo.discount.toLocaleString() }}</span>
        </div>

        <div class="fare-row total">
          <span>ยอดรวม</span>
          <span>฿{{ finalFare.toLocaleString() }}</span>
        </div>

        <div v-if="appliedPromo" class="savings-badge">
          🎉 คุณประหยัด ฿{{ appliedPromo.discount.toLocaleString() }}!
        </div>
      </div>

      <!-- Book Button -->
      <button 
        class="book-btn"
        :disabled="!canBook"
        @click="bookRide"
      >
        <span v-if="booking">กำลังจอง...</span>
        <span v-else>จองเลย ฿{{ finalFare.toLocaleString() }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SmartPromoSuggestion from '@/components/customer/SmartPromoSuggestion.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const serviceTypes = [
  { value: 'ride', name: 'รถทั่วไป', icon: '🚗' },
  { value: 'premium', name: 'พรีเมียม', icon: '🚙' },
  { value: 'delivery', name: 'ส่งของ', icon: '📦' },
]

const pickup = ref({
  address: '',
  lat: 13.7563,
  lng: 100.5018,
})

const dropoff = ref({
  address: '',
  lat: 13.7563,
  lng: 100.5018,
})

const selectedService = ref('ride')
const estimatedFare = ref(0)
const appliedPromo = ref<{
  code: string
  discount: number
  finalFare: number
} | null>(null)
const booking = ref(false)

const finalFare = computed(() => {
  if (appliedPromo.value) {
    return appliedPromo.value.finalFare
  }
  return estimatedFare.value
})

const canBook = computed(() => {
  return pickup.value.address && 
         dropoff.value.address && 
         estimatedFare.value > 0 &&
         !booking.value
})

const selectService = (service: string) => {
  selectedService.value = service
  calculateFare()
}

const calculateFare = () => {
  // Simple fare calculation (replace with actual logic)
  if (pickup.value.address && dropoff.value.address) {
    const baseFare = 50
    const distance = Math.random() * 20 + 5 // Mock distance
    const multiplier = selectedService.value === 'premium' ? 1.5 : 1
    estimatedFare.value = Math.round((baseFare + distance * 10) * multiplier)
  } else {
    estimatedFare.value = 0
  }
}

const handlePromoApplied = (promo: { code: string; discount: number; finalFare: number }) => {
  appliedPromo.value = promo
  console.log('✅ Promo applied:', promo)
}

const bookRide = async () => {
  if (!authStore.user?.id) {
    router.push('/login')
    return
  }

  booking.value = true
  try {
    const { data, error } = await supabase
      .from('ride_requests')
      .insert({
        user_id: authStore.user.id,
        pickup_lat: pickup.value.lat,
        pickup_lng: pickup.value.lng,
        pickup_address: pickup.value.address,
        dropoff_lat: dropoff.value.lat,
        dropoff_lng: dropoff.value.lng,
        dropoff_address: dropoff.value.address,
        service_type: selectedService.value,
        estimated_fare: estimatedFare.value,
        final_fare: finalFare.value,
        promo_code: appliedPromo.value?.code,
        discount_amount: appliedPromo.value?.discount || 0,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Record promo usage
    if (appliedPromo.value) {
      await supabase.rpc('use_promo_code', {
        p_user_id: authStore.user.id,
        p_promo_code: appliedPromo.value.code,
        p_ride_id: data.id,
      })
    }

    console.log('✅ Ride booked:', data)
    router.push(`/customer/ride/${data.id}`)
  } catch (err) {
    console.error('❌ Booking failed:', err)
    alert('ไม่สามารถจองได้ กรุณาลองใหม่')
  } finally {
    booking.value = false
  }
}
</script>

<style scoped>
.ride-booking-page {
  min-height: 100vh;
  background: #f9fafb;
  padding: 20px;
}

.booking-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: #1f2937;
}

.location-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.input-group input {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s;
}

.input-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.service-section {
  margin-bottom: 24px;
}

.service-section label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.service-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.service-btn {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.service-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.service-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.service-btn .icon {
  font-size: 32px;
}

.service-btn .name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.fare-summary {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 16px;
  color: #374151;
}

.fare-row.discount {
  color: #10b981;
  font-weight: 600;
}

.fare-row.total {
  border-top: 2px solid #e5e7eb;
  margin-top: 8px;
  padding-top: 16px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.savings-badge {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  animation: slideIn 0.3s ease-out;
}

.book-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.book-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.book-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .service-options {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
interface DriverInfo {
  id?: string
  name: string
  rating: number
  trips: number
  vehicle: string
  color: string
  plate: string
  photo?: string
  eta: number
}

defineProps<{
  driver: DriverInfo
}>()

defineEmits<{
  'call': []
  'chat': []
  'safety': []
  'cancel': []
}>()
</script>

<template>
  <div class="driver-matched">
    <div class="eta-display">
      <span class="eta-number">{{ driver.eta }}</span>
      <span class="eta-unit">นาที</span>
    </div>
    <p class="eta-text">คนขับกำลังมารับคุณ</p>

    <div class="driver-info-card">
      <div class="driver-profile">
        <div class="driver-avatar">
          <img v-if="driver.photo" :src="driver.photo" :alt="driver.name" />
          <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="driver-text">
          <span class="driver-name">{{ driver.name }}</span>
          <div class="driver-rating">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>{{ driver.rating }}</span>
            <span class="trips-count">{{ driver.trips.toLocaleString() }} เที่ยว</span>
          </div>
        </div>
      </div>
      <div class="car-info">
        <span class="car-model">{{ driver.vehicle }} {{ driver.color }}</span>
        <span class="car-plate">{{ driver.plate }}</span>
      </div>
    </div>

    <div class="contact-actions">
      <button @click="$emit('call')" class="contact-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
        <span>โทร</span>
      </button>
      <button @click="$emit('chat')" class="contact-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span>แชท</span>
      </button>
      <button @click="$emit('safety')" class="contact-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
        </svg>
        <span>แชร์</span>
      </button>
    </div>

    <button @click="$emit('cancel')" class="btn-cancel-ride">ยกเลิกการเดินทาง</button>
  </div>
</template>

<style scoped>
.driver-matched {
  padding: 12px 0;
}

.eta-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 6px;
}

.eta-number {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
}

.eta-unit {
  font-size: 20px;
  color: #666;
  font-weight: 500;
}

.eta-text {
  text-align: center;
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

.driver-info-card {
  background: #F6F6F6;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 20px;
}

.driver-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid #E5E5E5;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-avatar svg {
  width: 32px;
  height: 32px;
  color: #888;
}

.driver-text {
  flex: 1;
}

.driver-name {
  font-size: 18px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.driver-rating svg {
  width: 16px;
  height: 16px;
  color: #F59E0B;
}

.trips-count {
  margin-left: 8px;
  color: #888;
}

.car-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid #E0E0E0;
}

.car-model {
  font-size: 15px;
  color: #333;
}

.car-plate {
  font-size: 16px;
  font-weight: 700;
  background: #000;
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
}

/* Contact Actions */
.contact-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.contact-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #F6F6F6;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 72px;
}

.contact-btn:hover {
  background: #EBEBEB;
}

.contact-btn:active {
  transform: scale(0.97);
}

.contact-btn svg {
  width: 26px;
  height: 26px;
  stroke-width: 1.5;
}

.contact-btn span {
  font-size: 13px;
  font-weight: 600;
}

.btn-cancel-ride {
  width: 100%;
  padding: 16px;
  background: none;
  color: #E11900;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel-ride:hover {
  background: #FEE2E2;
  border-radius: 12px;
}
</style>

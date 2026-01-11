<script setup lang="ts">
/**
 * Component: RideTrackingView
 * แสดงหน้าจอติดตามการเดินทาง
 */
import type { GeoLocation } from '../../composables/useLocation'
import type { MatchedDriver } from '../../composables/useRideRequest'
import MapView from '../MapView.vue'
import RideShareETA from './RideShareETA.vue'

defineProps<{
  pickup: GeoLocation | null
  destination: GeoLocation | null
  matchedDriver: MatchedDriver | null
  statusText: string
}>()

const emit = defineEmits<{
  callDriver: []
  callEmergency: []
  cancel: []
}>()
</script>

<template>
  <div class="tracking-view">
    <!-- Map Area -->
    <div class="map-area">
      <MapView
        :pickup="pickup"
        :destination="destination"
        :showRoute="true"
        :driverLocation="matchedDriver ? { 
          lat: matchedDriver.current_lat || 0, 
          lng: matchedDriver.current_lng || 0, 
          heading: 0 
        } : null"
        height="100%"
      />
    </div>

    <!-- Driver Card -->
    <div class="driver-card">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-indicator"></div>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- Driver Info -->
      <div v-if="matchedDriver" class="driver-info">
        <div class="driver-avatar">
          <img
            v-if="matchedDriver.avatar_url"
            :src="matchedDriver.avatar_url"
            alt="รูปคนขับ"
            class="avatar-img"
          />
          <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </div>
        <div class="driver-details">
          <span class="driver-name">{{ matchedDriver.name || 'คนขับ' }}</span>
          <span class="driver-vehicle">
            {{ matchedDriver.vehicle_plate || 'กข 1234' }}
            <template v-if="matchedDriver.vehicle_color"> • {{ matchedDriver.vehicle_color }}</template>
          </span>
          <span v-if="matchedDriver.rating" class="driver-rating">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            {{ matchedDriver.rating.toFixed(1) }}
          </span>
        </div>
        <div class="driver-actions">
          <button class="action-btn call" @click="emit('callDriver')" aria-label="โทรหาคนขับ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Trip Info -->
      <div class="trip-info-card">
        <div class="trip-point">
          <div class="point-dot green"></div>
          <span>{{ pickup?.address }}</span>
        </div>
        <div class="trip-point">
          <div class="point-dot red"></div>
          <span>{{ destination?.address }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="card-actions">
        <!-- Share ETA -->
        <RideShareETA
          :ride-id="'ride-' + Date.now()"
          :destination-name="destination?.address || 'ปลายทาง'"
          :estimated-arrival="5"
          :current-location="matchedDriver ? { lat: matchedDriver.current_lat || 0, lng: matchedDriver.current_lng || 0 } : undefined"
        />
        
        <button class="sos-btn" @click="emit('callEmergency')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          SOS
        </button>
        <button class="cancel-btn" @click="emit('cancel')">
          ยกเลิก
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracking-view {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

/* Map Area */
.map-area {
  flex: 1;
  min-height: 45vh;
  background: #e8f5ef;
}

/* Driver Card */
.driver-card {
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

/* Status Bar */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background: #00a86b;
  border-radius: 50%;
  animation: pulse-status 2s ease-in-out infinite;
}

@keyframes pulse-status {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: #00a86b;
}

/* Driver Info */
.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  background: #e0e0e0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.driver-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.driver-vehicle {
  font-size: 13px;
  color: #666;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.driver-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.call {
  background: #00a86b;
  color: #fff;
}

.action-btn:active {
  transform: scale(0.95);
}

/* Trip Info */
.trip-info-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.trip-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #1a1a1a;
}

.trip-point span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.point-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.green { background: #00a86b; }
.point-dot.red { background: #e53935; }

/* Action Buttons */
.card-actions {
  display: flex;
  gap: 12px;
}

.sos-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: #ffebee;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #e53935;
  cursor: pointer;
  transition: all 0.2s;
}

.sos-btn:active {
  background: #ffcdd2;
  transform: scale(0.98);
}

.cancel-btn {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:active {
  background: #e8e8e8;
  transform: scale(0.98);
}
</style>

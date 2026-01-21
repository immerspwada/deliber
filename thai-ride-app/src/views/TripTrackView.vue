<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import MapView from "../components/MapView.vue";
import { supabase } from "../lib/supabase";

const route = useRoute();

const loading = ref(true);
const error = ref("");
const tripData = ref<any>(null);
const rideData = ref<any>(null);

let subscription: any = null;

const fetchTripShare = async () => {
  const shareCode = route.params.shareCode as string;

  try {
    // Get trip share data
    const { data: share, error: shareError } = await supabase
      .from("trip_shares")
      .select("*")
      .eq("share_code", shareCode)
      .single();

    if (shareError || !share) {
      error.value = "ไม่พบข้อมูลการเดินทาง";
      return;
    }

    // Check if expired
    if (new Date((share as any).expires_at) < new Date()) {
      error.value = "ลิงก์หมดอายุแล้ว";
      return;
    }

    tripData.value = share;

    // Get ride data - updated for providers_v2 schema
    const { data: ride, error: rideError } = await supabase
      .from("ride_requests")
      .select(
        `
        *,
        provider:provider_id (
          id,
          user_id,
          first_name,
          last_name,
          phone_number,
          rating
        )
      `
      )
      .eq("id", (share as any).ride_id)
      .single();

    if (rideError) {
      console.error("[TripTrackView] Error fetching ride:", rideError.message);
    }

    if (ride) {
      rideData.value = ride;

      // Subscribe to ride updates
      subscription = supabase
        .channel(`ride-track-${(ride as any).id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ride_requests",
            filter: `id=eq.${(ride as any).id}`,
          },
          (payload) => {
            rideData.value = { ...rideData.value, ...payload.new };
          }
        )
        .subscribe();
    }
  } catch (err) {
    error.value = "เกิดข้อผิดพลาด";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTripShare();
});

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe();
  }
});

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: "กำลังหาคนขับ",
    matched: "คนขับกำลังมารับ",
    in_progress: "กำลังเดินทาง",
    completed: "ถึงจุดหมายแล้ว",
    cancelled: "ยกเลิกแล้ว",
  };
  return statusMap[status] || status;
};
</script>

<template>
  <div class="track-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h2>{{ error }}</h2>
      <p>กรุณาตรวจสอบลิงก์อีกครั้ง</p>
    </div>

    <!-- Trip Data -->
    <template v-else-if="rideData">
      <div class="map-area">
        <MapView
          :pickup="rideData.pickup_location"
          :destination="rideData.destination_location"
          :show-route="true"
          height="100%"
        />
      </div>

      <div class="info-panel">
        <div class="status-badge" :class="rideData.status">
          {{ getStatusText(rideData.status) }}
        </div>

        <div class="trip-info">
          <div class="location-row">
            <div class="dot pickup"></div>
            <div class="location-text">
              <span class="label">จุดรับ</span>
              <span class="address">{{ rideData.pickup_address }}</span>
            </div>
          </div>
          <div class="location-row">
            <div class="dot destination"></div>
            <div class="location-text">
              <span class="label">จุดหมาย</span>
              <span class="address">{{ rideData.destination_address }}</span>
            </div>
          </div>
        </div>

        <div v-if="rideData.service_providers" class="driver-info">
          <div class="driver-avatar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div class="driver-text">
            <span class="driver-name">{{
              rideData.service_providers.name
            }}</span>
            <span class="vehicle"
              >{{ rideData.service_providers.vehicle_model }} -
              {{ rideData.service_providers.license_plate }}</span
            >
          </div>
        </div>

        <div class="shared-by">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>แชร์โดย GOBEAR</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.track-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state svg {
  width: 64px;
  height: 64px;
  color: #e11900;
  margin-bottom: 16px;
}

.error-state h2 {
  font-size: 18px;
  margin-bottom: 8px;
}

.error-state p {
  color: #6b6b6b;
}

.map-area {
  flex: 1;
  min-height: 50vh;
}

.info-panel {
  padding: 20px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  position: relative;
  z-index: 10;
}

.status-badge {
  display: inline-block;
  padding: 8px 16px;
  background: #f6f6f6;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
}

.status-badge.in_progress {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.completed {
  background: #e3f2fd;
  color: #1565c0;
}

.status-badge.cancelled {
  background: #ffebee;
  color: #c62828;
}

.trip-info {
  margin-bottom: 16px;
}

.location-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
}

.location-row:first-child {
  border-bottom: 1px solid #e5e5e5;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
}

.dot.pickup {
  background: #000;
}

.dot.destination {
  border: 2px solid #000;
}

.location-text {
  flex: 1;
}

.location-text .label {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 2px;
}

.location-text .address {
  font-size: 15px;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driver-avatar svg {
  width: 24px;
  height: 24px;
  color: #6b6b6b;
}

.driver-text {
  flex: 1;
}

.driver-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
}

.vehicle {
  font-size: 13px;
  color: #6b6b6b;
}

.shared-by {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: #6b6b6b;
  font-size: 13px;
}

.shared-by svg {
  width: 16px;
  height: 16px;
}
</style>

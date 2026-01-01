<script setup lang="ts">
/**
 * ProviderJobsView - หน้าแสดงงานที่รับได้ตาม provider_type
 * Feature: F14 - Provider Dashboard
 * MUNEEF Style: สีเขียว #00A86B, ห้ามใช้ emoji
 * แสดงเฉพาะงานที่ตรงกับ provider_type (rider, driver, etc.)
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { supabase } from "../../lib/supabase";
import PromoInfoBadge from "../../components/provider/PromoInfoBadge.vue";

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const providerInfo = ref<any>(null);
const availableJobs = ref<any[]>([]);
const activeJob = ref<any>(null);

// Realtime subscription
let jobsSubscription: any = null;

// Provider type labels
const providerTypeLabels: Record<string, string> = {
  rider: "ไรเดอร์ส่งของ",
  driver: "คนขับรถ",
  shopper: "ช้อปเปอร์",
  mover: "ขนย้าย",
  laundry: "ซักผ้า",
  queue: "บริการคิว",
};

// Job type mapping - ใช้ SVG icon type แทน emoji (MUNEEF Rule)
const jobTypeMapping: Record<
  string,
  { table: string; label: string; iconType: string }
> = {
  rider: {
    table: "delivery_requests",
    label: "งานส่งของ",
    iconType: "delivery",
  },
  driver: { table: "ride_requests", label: "งานรับส่ง", iconType: "ride" },
  shopper: {
    table: "shopping_requests",
    label: "งานช้อปปิ้ง",
    iconType: "shopping",
  },
  mover: { table: "moving_requests", label: "งานขนย้าย", iconType: "moving" },
  laundry: {
    table: "laundry_requests",
    label: "งานซักผ้า",
    iconType: "laundry",
  },
  queue: { table: "queue_bookings", label: "งานคิว", iconType: "queue" },
};

const providerTypeLabel = computed(() => {
  if (!providerInfo.value?.provider_type) return "";
  return (
    providerTypeLabels[providerInfo.value.provider_type] ||
    providerInfo.value.provider_type
  );
});

const jobConfig = computed(() => {
  if (!providerInfo.value?.provider_type) return null;
  return jobTypeMapping[providerInfo.value.provider_type];
});

// Fetch provider info
const fetchProviderInfo = async () => {
  if (!authStore.user?.id) return;

  const { data, error } = await supabase
    .from("service_providers")
    .select("*")
    .eq("user_id", authStore.user.id)
    .eq("status", "approved")
    .single();

  if (error) {
    console.error("Error fetching provider:", error);
    return;
  }

  providerInfo.value = data;
};

// Fetch available jobs based on provider type
const fetchAvailableJobs = async () => {
  if (!providerInfo.value || !jobConfig.value) return;

  loading.value = true;

  try {
    const { data, error } = await supabase
      .from(jobConfig.value.table)
      .select("*, users!inner(name, phone)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    availableJobs.value = data || [];
  } catch (err) {
    console.error("Error fetching jobs:", err);
  } finally {
    loading.value = false;
  }
};

// Fetch active job
const fetchActiveJob = async () => {
  if (!providerInfo.value || !jobConfig.value) return;

  const { data } = await supabase
    .from(jobConfig.value.table)
    .select("*, users!inner(name, phone)")
    .eq("provider_id", providerInfo.value.id)
    .in("status", ["matched", "in_progress", "picked_up"])
    .single();

  if (data) {
    activeJob.value = data;
  }
};

// Accept job
const acceptJob = async (job: any) => {
  if (!providerInfo.value || !jobConfig.value) return;

  const confirmed = confirm(`ยืนยันรับงาน?`);
  if (!confirmed) return;

  loading.value = true;

  try {
    const { error } = await supabase
      .from(jobConfig.value.table)
      .update({
        provider_id: providerInfo.value.id,
        status: "matched",
        matched_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending"); // Ensure still pending

    if (error) throw error;

    // Refresh
    await fetchAvailableJobs();
    await fetchActiveJob();
  } catch (err: any) {
    alert("ไม่สามารถรับงานได้: " + err.message);
  } finally {
    loading.value = false;
  }
};

// View job detail
const viewJobDetail = (job: any) => {
  // Navigate to appropriate tracking view based on job type
  const routes: Record<string, string> = {
    rider: "/delivery/tracking",
    driver: "/ride/tracking",
    shopper: "/shopping/tracking",
    mover: "/moving/tracking",
    laundry: "/laundry/tracking",
    queue: "/queue/tracking",
  };

  const route = routes[providerInfo.value?.provider_type];
  if (route) {
    router.push(`${route}/${job.id}`);
  }
};

// Setup realtime subscription
const setupRealtimeSubscription = () => {
  if (!jobConfig.value) return;

  jobsSubscription = supabase
    .channel(`${jobConfig.value.table}_changes`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: jobConfig.value.table,
        filter: `status=eq.pending`,
      },
      () => {
        fetchAvailableJobs();
      }
    )
    .subscribe();
};

onMounted(async () => {
  await fetchProviderInfo();
  if (providerInfo.value) {
    await Promise.all([fetchAvailableJobs(), fetchActiveJob()]);
    setupRealtimeSubscription();
  }
});

onUnmounted(() => {
  if (jobsSubscription) {
    supabase.removeChannel(jobsSubscription);
  }
});
</script>

<template>
  <div class="jobs-page">
    <!-- Header -->
    <div class="page-header">
      <button @click="router.back()" class="back-btn">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="header-title">
        <h1>{{ jobConfig?.label || "งานของฉัน" }}</h1>
        <span class="provider-type">{{ providerTypeLabel }}</span>
      </div>
      <div class="header-spacer"></div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !providerInfo" class="loading-state">
      <div class="loading-spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- No provider info -->
    <div v-else-if="!providerInfo" class="empty-state">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <h3>ไม่พบข้อมูลผู้ให้บริการ</h3>
      <p>กรุณาสมัครเป็นผู้ให้บริการก่อน</p>
      <button @click="router.push('/provider/onboarding')" class="btn-primary">
        สมัครเลย
      </button>
    </div>

    <!-- Content -->
    <div v-else class="jobs-content">
      <!-- Active Job -->
      <div v-if="activeJob" class="active-job-section">
        <h2 class="section-title">งานที่กำลังทำ</h2>
        <div class="job-card active" @click="viewJobDetail(activeJob)">
          <div class="job-header">
            <!-- SVG Icon based on job type -->
            <div class="job-icon-wrapper">
              <!-- Ride Icon -->
              <svg
                v-if="jobConfig?.iconType === 'ride'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"
                />
                <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2M5 17h10" />
              </svg>
              <!-- Delivery Icon -->
              <svg
                v-else-if="jobConfig?.iconType === 'delivery'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <!-- Shopping Icon -->
              <svg
                v-else-if="jobConfig?.iconType === 'shopping'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <!-- Moving Icon -->
              <svg
                v-else-if="jobConfig?.iconType === 'moving'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path
                  d="M16 8h4l3 3v5h-7V8zM5 21a2 2 0 100-4 2 2 0 000 4zM19 21a2 2 0 100-4 2 2 0 000 4z"
                />
              </svg>
              <!-- Laundry Icon -->
              <svg
                v-else-if="jobConfig?.iconType === 'laundry'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"
                />
              </svg>
              <!-- Queue Icon -->
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div class="job-info">
              <h3>{{ activeJob.users?.name || "ลูกค้า" }}</h3>
              <span class="job-status">{{ activeJob.status }}</span>
            </div>
            <svg
              class="chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Available Jobs -->
      <div class="available-jobs-section">
        <div class="section-header">
          <h2 class="section-title">งานที่รับได้</h2>
          <span class="job-count">{{ availableJobs.length }} งาน</span>
        </div>

        <!-- Empty state -->
        <div v-if="availableJobs.length === 0" class="empty-jobs">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6M9 15h6" />
          </svg>
          <p>ยังไม่มีงานใหม่</p>
        </div>

        <!-- Jobs list -->
        <div v-else class="jobs-list">
          <div v-for="job in availableJobs" :key="job.id" class="job-card">
            <div class="job-header">
              <!-- SVG Icon based on job type -->
              <div class="job-icon-wrapper">
                <!-- Ride Icon -->
                <svg
                  v-if="jobConfig?.iconType === 'ride'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"
                  />
                  <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2M5 17h10" />
                </svg>
                <!-- Delivery Icon -->
                <svg
                  v-else-if="jobConfig?.iconType === 'delivery'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <!-- Shopping Icon -->
                <svg
                  v-else-if="jobConfig?.iconType === 'shopping'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <!-- Moving Icon -->
                <svg
                  v-else-if="jobConfig?.iconType === 'moving'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <path
                    d="M16 8h4l3 3v5h-7V8zM5 21a2 2 0 100-4 2 2 0 000 4zM19 21a2 2 0 100-4 2 2 0 000 4z"
                  />
                </svg>
                <!-- Laundry Icon -->
                <svg
                  v-else-if="jobConfig?.iconType === 'laundry'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"
                  />
                </svg>
                <!-- Queue Icon -->
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div class="job-info">
                <h3>{{ job.users?.name || "ลูกค้า" }}</h3>
                <span class="job-time">{{
                  new Date(job.created_at).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}</span>
              </div>
            </div>

            <div class="job-details">
              <!-- Promo Info Badge -->
              <PromoInfoBadge
                v-if="job.promo_code"
                :service-type="
                  providerInfo?.provider_type === 'driver'
                    ? 'ride'
                    : providerInfo?.provider_type === 'rider'
                    ? 'delivery'
                    : providerInfo?.provider_type === 'shopper'
                    ? 'shopping'
                    : providerInfo?.provider_type
                "
                :request-id="job.id"
              />

              <!-- For Queue Bookings -->
              <template v-if="providerInfo?.provider_type === 'queue'">
                <div v-if="job.place_name" class="detail-row">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{{ job.place_name }}</span>
                </div>
                <div v-if="job.scheduled_date" class="detail-row">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span
                    >{{
                      new Date(job.scheduled_date).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })
                    }}
                    {{ job.scheduled_time?.substring(0, 5) }}</span
                  >
                </div>
                <div v-if="job.category" class="detail-row">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  <span>{{ job.category }}</span>
                </div>
              </template>
              <!-- For other services -->
              <template v-else>
                <div v-if="job.pickup_address" class="detail-row">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{{ job.pickup_address }}</span>
                </div>
                <div v-if="job.delivery_address" class="detail-row">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{{ job.delivery_address }}</span>
                </div>
              </template>
            </div>

            <button @click="acceptJob(job)" class="btn-accept">รับงาน</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jobs-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.header-title {
  flex: 1;
  text-align: center;
}

.header-title h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.provider-type {
  font-size: 13px;
  color: #00a86b;
  font-weight: 600;
}

.header-spacer {
  width: 40px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e8e8e8;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #999999;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #666666;
  margin-bottom: 24px;
}

.jobs-content {
  padding: 20px;
}

.active-job-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.job-count {
  font-size: 14px;
  color: #666666;
  font-weight: 600;
}

.job-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.job-card.active {
  border: 2px solid #00a86b;
  cursor: pointer;
}

.job-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.job-icon-wrapper {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5ef;
  border-radius: 12px;
  flex-shrink: 0;
}

.job-icon-wrapper svg {
  width: 24px;
  height: 24px;
  color: #00a86b;
}

.job-info {
  flex: 1;
}

.job-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.job-status {
  font-size: 13px;
  color: #00a86b;
  font-weight: 600;
}

.job-time {
  font-size: 13px;
  color: #999999;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #999999;
}

.job-details {
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666666;
}

.detail-row svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.btn-accept {
  width: 100%;
  padding: 12px;
  background: #00a86b;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-accept:hover {
  background: #008f5b;
}

.btn-accept:active {
  transform: scale(0.98);
}

.empty-jobs {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-jobs svg {
  width: 48px;
  height: 48px;
  color: #999999;
  margin-bottom: 12px;
}

.empty-jobs p {
  font-size: 14px;
  color: #666666;
}

.btn-primary {
  padding: 14px 32px;
  background: #00a86b;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
}
</style>

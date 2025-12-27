<template>
  <div class="service-bundles-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1>Service Bundles</h1>
        <p class="subtitle">Manage multi-service packages and templates</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round" />
        </svg>
        Create Bundle Template
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: #e8f5ef">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00A86B"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" stroke-width="2" />
            <rect x="14" y="3" width="7" height="7" rx="1" stroke-width="2" />
            <rect x="3" y="14" width="7" height="7" rx="1" stroke-width="2" />
            <rect x="14" y="14" width="7" height="7" rx="1" stroke-width="2" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalBundles }}</div>
          <div class="stat-label">Total Bundles</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: #fff4e6">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F5A623"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              stroke-width="2"
            />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeBundles }}</div>
          <div class="stat-label">Active Templates</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: #e8f5ff">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2196F3"
          >
            <path
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
              stroke-width="2"
            />
            <circle cx="12" cy="7" r="4" stroke-width="2" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalCustomers }}</div>
          <div class="stat-label">Customers Using Bundles</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: #f3e8ff">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9C27B0"
          >
            <path
              d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              stroke-width="2"
            />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">
            ฿{{ stats.totalRevenue.toLocaleString() }}
          </div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'templates' }]"
        @click="activeTab = 'templates'"
      >
        Bundle Templates
      </button>
      <button
        :class="['tab', { active: activeTab === 'active' }]"
        @click="activeTab = 'active'"
      >
        Active Bundles
      </button>
      <button
        :class="['tab', { active: activeTab === 'history' }]"
        @click="activeTab = 'history'"
      >
        History
      </button>
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'" class="content-section">
      <div v-if="loading" class="loading">Loading templates...</div>

      <div v-else class="templates-grid">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-card"
        >
          <div class="template-header">
            <div>
              <h3>{{ template.name }}</h3>
              <p class="template-name-th">{{ template.name_th }}</p>
            </div>
            <span
              :class="[
                'status-badge',
                template.is_active ? 'active' : 'inactive',
              ]"
            >
              {{ template.is_active ? "Active" : "Inactive" }}
            </span>
          </div>

          <p class="template-description">{{ template.description }}</p>

          <div class="template-services">
            <span
              v-for="service in template.service_types"
              :key="service"
              class="service-tag"
            >
              {{ formatServiceType(service) }}
            </span>
          </div>

          <div class="template-discount">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00A86B"
            >
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                stroke-width="2"
              />
            </svg>
            <span>{{ template.discount_percentage }}% Discount</span>
          </div>

          <div class="template-actions">
            <button @click="editTemplate(template)" class="btn-secondary">
              Edit
            </button>
            <button
              @click="toggleTemplateStatus(template)"
              :class="[
                'btn-outline',
                template.is_active ? 'danger' : 'success',
              ]"
            >
              {{ template.is_active ? "Deactivate" : "Activate" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Bundles Tab -->
    <div v-if="activeTab === 'active'" class="content-section">
      <div v-if="loading" class="loading">Loading active bundles...</div>

      <div v-else class="bundles-table">
        <table>
          <thead>
            <tr>
              <th>Bundle ID</th>
              <th>Customer</th>
              <th>Services</th>
              <th>Price</th>
              <th>Discount</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bundle in activeBundles" :key="bundle.id">
              <td>
                <code class="bundle-uid">{{ bundle.bundle_uid }}</code>
              </td>
              <td>
                <div class="customer-info">
                  <div class="customer-name">{{ bundle.customer_name }}</div>
                  <div class="customer-uid">{{ bundle.member_uid }}</div>
                </div>
              </td>
              <td>
                <div class="services-list">
                  <span
                    v-for="(service, idx) in bundle.services"
                    :key="idx"
                    class="service-badge"
                  >
                    {{ formatServiceType(service.type) }}
                  </span>
                </div>
              </td>
              <td>
                <div class="price-info">
                  <div class="final-price">
                    ฿{{
                      bundle.total_final_price || bundle.total_estimated_price
                    }}
                  </div>
                  <div v-if="bundle.total_final_price" class="estimated-price">
                    Est: ฿{{ bundle.total_estimated_price }}
                  </div>
                </div>
              </td>
              <td>
                <span class="discount-badge"
                  >-฿{{ bundle.bundle_discount }}</span
                >
              </td>
              <td>
                <span :class="['status-badge', bundle.status]">
                  {{ formatStatus(bundle.status) }}
                </span>
              </td>
              <td>
                <div class="progress-info">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{
                        width: `${
                          (bundle.completed_services_count /
                            bundle.total_services_count) *
                          100
                        }%`,
                      }"
                    ></div>
                  </div>
                  <span class="progress-text">
                    {{ bundle.completed_services_count }}/{{
                      bundle.total_services_count
                    }}
                  </span>
                </div>
              </td>
              <td>{{ formatDate(bundle.created_at) }}</td>
              <td>
                <button @click="viewBundleDetails(bundle)" class="btn-icon">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      stroke-width="2"
                    />
                    <circle cx="12" cy="12" r="3" stroke-width="2" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- History Tab -->
    <div v-if="activeTab === 'history'" class="content-section">
      <div class="filters">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by Bundle ID or Customer..."
          class="search-input"
        />
        <select v-model="statusFilter" class="filter-select">
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      <div v-if="loading" class="loading">Loading history...</div>

      <div v-else class="bundles-table">
        <!-- Similar table structure as active bundles -->
        <p v-if="filteredHistory.length === 0" class="empty-state">
          No bundles found matching your criteria
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAdminAPI } from "../composables/useAdminAPI";
import { supabase } from "@/lib/supabase";

const api = useAdminAPI();

const activeTab = ref("templates");
const showCreateModal = ref(false);
const searchQuery = ref("");
const statusFilter = ref("");
const templates = ref<any[]>([]);
const activeBundles = ref<any[]>([]);
const historyBundles = ref<any[]>([]);
const loading = ref(false);

const stats = ref({
  totalBundles: 0,
  activeBundles: 0,
  totalCustomers: 0,
  totalRevenue: 0,
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    await Promise.all([loadTemplates(), loadActiveBundles(), loadStats()]);
  } finally {
    loading.value = false;
  }
}

async function loadTemplates() {
  try {
    // Use RPC function to bypass RLS
    templates.value = await api.getBundleTemplates();
  } catch (e) {
    console.error("Error loading templates:", e);
    templates.value = [];
  }
}

async function loadActiveBundles() {
  try {
    // Use RPC function to bypass RLS
    const result = await api.getServiceBundles(
      { status: "active" },
      { page: 1, limit: 50 }
    );
    activeBundles.value = result.data;
  } catch (e) {
    console.error("Error loading active bundles:", e);
    activeBundles.value = [];
  }
}

async function loadStats() {
  try {
    // Use RPC function to bypass RLS
    const statsData = await api.getServiceBundlesStats();
    stats.value = {
      totalBundles: statsData.total_bundles || 0,
      activeBundles: statsData.active_bundles || 0,
      totalCustomers: statsData.total_customers || 0,
      totalRevenue: statsData.total_revenue || 0,
    };
  } catch (e) {
    console.error("Error loading stats:", e);
  }
}

const filteredHistory = computed(() => {
  let result = historyBundles.value;

  if (searchQuery.value) {
    result = result.filter(
      (b) =>
        b.bundle_uid.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        b.customer_name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  if (statusFilter.value) {
    result = result.filter((b) => b.status === statusFilter.value);
  }

  return result;
});

function formatServiceType(type: string): string {
  const types: Record<string, string> = {
    ride: "Ride",
    delivery: "Delivery",
    shopping: "Shopping",
    queue: "Queue",
    moving: "Moving",
    laundry: "Laundry",
  };
  return types[type] || type;
}

function formatStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: "Pending",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    partial: "Partial",
  };
  return statuses[status] || status;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function editTemplate(template: any) {
  // TODO: Open edit modal
  console.log("Edit template:", template);
}

async function toggleTemplateStatus(template: any) {
  const { error } = await supabase
    .from("bundle_templates")
    .update({ is_active: !template.is_active })
    .eq("id", template.id);

  if (!error) {
    await loadTemplates();
  }
}

function viewBundleDetails(bundle: any) {
  // TODO: Open details modal
  console.log("View bundle:", bundle);
}
</script>

<style scoped>
.service-bundles-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.view-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #666666;
  margin: 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #008f5b;
  transform: translateY(-1px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 16px;
  border: 1px solid #f0f0f0;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666666;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  color: #666666;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab.active {
  color: #00a86b;
  border-bottom-color: #00a86b;
}

.content-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #f0f0f0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.template-card {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: #00a86b;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.1);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.template-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.template-name-th {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #e8f5ef;
  color: #00a86b;
}

.status-badge.inactive {
  background: #f5f5f5;
  color: #999999;
}

.template-description {
  color: #666666;
  font-size: 14px;
  margin-bottom: 16px;
}

.template-services {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.service-tag {
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 13px;
  color: #1a1a1a;
  font-weight: 500;
}

.template-discount {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #00a86b;
  font-weight: 600;
  margin-bottom: 16px;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary,
.btn-outline {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f5f5f5;
  border: none;
  color: #1a1a1a;
}

.btn-secondary:hover {
  background: #e8e8e8;
}

.btn-outline {
  background: white;
  border: 2px solid #00a86b;
  color: #00a86b;
}

.btn-outline.danger {
  border-color: #e53935;
  color: #e53935;
}

.btn-outline.success {
  border-color: #00a86b;
  color: #00a86b;
}

.bundles-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 12px;
  background: #f5f5f5;
  color: #666666;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
}

td {
  padding: 16px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.bundle-uid {
  font-family: "Monaco", "Courier New", monospace;
  font-size: 13px;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-name {
  font-weight: 600;
  color: #1a1a1a;
}

.customer-uid {
  font-size: 12px;
  color: #999999;
}

.services-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.service-badge {
  padding: 4px 8px;
  background: #e8f5ef;
  color: #00a86b;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.final-price {
  font-weight: 700;
  color: #1a1a1a;
}

.estimated-price {
  font-size: 12px;
  color: #999999;
  text-decoration: line-through;
}

.discount-badge {
  background: #fff4e6;
  color: #f5a623;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  width: 100px;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00a86b;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #666666;
}

.btn-icon {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666666;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f5f5f5;
  color: #00a86b;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input,
.filter-select {
  padding: 10px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
}

.search-input {
  flex: 1;
}

.filter-select {
  min-width: 200px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666666;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999999;
}

.status-badge.pending {
  background: #fff4e6;
  color: #f5a623;
}

.status-badge.completed {
  background: #e8f5ef;
  color: #00a86b;
}

.status-badge.cancelled {
  background: #ffebee;
  color: #e53935;
}

.status-badge.partial {
  background: #e8f5ff;
  color: #2196f3;
}
</style>

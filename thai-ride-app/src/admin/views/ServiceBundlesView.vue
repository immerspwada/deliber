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

    <!-- Create/Edit Bundle Template Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="modal-overlay"
        @click.self="closeModal"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h2>
              {{
                editingTemplate
                  ? "Edit Bundle Template"
                  : "Create Bundle Template"
              }}
            </h2>
            <button @click="closeModal" class="close-btn">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveTemplate" class="modal-body">
            <div class="form-group">
              <label>Name (English) *</label>
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="e.g., Moving + Laundry Package"
              />
            </div>

            <div class="form-group">
              <label>Name (Thai) *</label>
              <input
                v-model="formData.name_th"
                type="text"
                required
                placeholder="e.g., แพ็คเกจขนย้าย + ซักผ้า"
              />
            </div>

            <div class="form-group">
              <label>Description (English)</label>
              <textarea
                v-model="formData.description"
                rows="2"
                placeholder="Brief description..."
              ></textarea>
            </div>

            <div class="form-group">
              <label>Description (Thai)</label>
              <textarea
                v-model="formData.description_th"
                rows="2"
                placeholder="คำอธิบายสั้นๆ..."
              ></textarea>
            </div>

            <div class="form-group">
              <label>Services Included *</label>
              <div class="services-checkboxes">
                <label
                  v-for="service in availableServices"
                  :key="service.id"
                  class="checkbox-label"
                >
                  <input
                    type="checkbox"
                    :value="service.id"
                    v-model="formData.service_types"
                  />
                  <span class="checkbox-text">{{ service.name }}</span>
                </label>
              </div>
              <p
                v-if="formData.service_types.length < 2"
                class="form-hint error"
              >
                Select at least 2 services
              </p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Discount Percentage *</label>
                <div class="input-with-suffix">
                  <input
                    v-model.number="formData.discount_percentage"
                    type="number"
                    min="0"
                    max="50"
                    required
                  />
                  <span class="suffix">%</span>
                </div>
              </div>

              <div class="form-group">
                <label>Display Order</label>
                <input
                  v-model.number="formData.display_order"
                  type="number"
                  min="0"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.is_popular" />
                <span class="checkbox-text">Mark as Popular</span>
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.is_active" />
                <span class="checkbox-text">Active (visible to customers)</span>
              </label>
            </div>
          </form>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              @click="saveTemplate"
              class="btn-primary"
              :disabled="saving || formData.service_types.length < 2"
            >
              <span v-if="saving">Saving...</span>
              <span v-else
                >{{ editingTemplate ? "Update" : "Create" }} Template</span
              >
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
const saving = ref(false);
const editingTemplate = ref<any>(null);

const stats = ref({
  totalBundles: 0,
  activeBundles: 0,
  totalCustomers: 0,
  totalRevenue: 0,
});

// Available services for bundle
const availableServices = [
  { id: "ride", name: "Ride (เรียกรถ)" },
  { id: "delivery", name: "Delivery (ส่งของ)" },
  { id: "shopping", name: "Shopping (ซื้อของ)" },
  { id: "queue", name: "Queue (จองคิว)" },
  { id: "moving", name: "Moving (ขนย้าย)" },
  { id: "laundry", name: "Laundry (ซักรีด)" },
];

// Form data for create/edit
const defaultFormData = {
  name: "",
  name_th: "",
  description: "",
  description_th: "",
  service_types: [] as string[],
  discount_percentage: 10,
  display_order: 0,
  is_popular: false,
  is_active: true,
};

const formData = ref({ ...defaultFormData });

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
  editingTemplate.value = template;
  formData.value = {
    name: template.name || "",
    name_th: template.name_th || "",
    description: template.description || "",
    description_th: template.description_th || "",
    service_types: template.service_types || [],
    discount_percentage: template.discount_percentage || 10,
    display_order: template.display_order || 0,
    is_popular: template.is_popular || false,
    is_active: template.is_active ?? true,
  };
  showCreateModal.value = true;
}

function closeModal() {
  showCreateModal.value = false;
  editingTemplate.value = null;
  formData.value = { ...defaultFormData };
}

async function saveTemplate() {
  if (formData.value.service_types.length < 2) {
    alert("Please select at least 2 services");
    return;
  }

  saving.value = true;
  try {
    const templateData = {
      name: formData.value.name,
      name_th: formData.value.name_th,
      description: formData.value.description || null,
      description_th: formData.value.description_th || null,
      service_types: formData.value.service_types,
      discount_percentage: formData.value.discount_percentage,
      display_order: formData.value.display_order,
      is_popular: formData.value.is_popular,
      is_active: formData.value.is_active,
    };

    if (editingTemplate.value) {
      // Update existing template
      const { error } = await supabase
        .from("bundle_templates")
        .update(templateData)
        .eq("id", editingTemplate.value.id);

      if (error) throw error;
    } else {
      // Create new template
      const { error } = await supabase
        .from("bundle_templates")
        .insert(templateData);

      if (error) throw error;
    }

    closeModal();
    await loadTemplates();
  } catch (e: any) {
    console.error("Error saving template:", e);
    alert("Failed to save template: " + (e.message || "Unknown error"));
  } finally {
    saving.value = false;
  }
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666666;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #1a1a1a;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #00a86b;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-with-suffix {
  display: flex;
  align-items: center;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
}

.input-with-suffix input {
  flex: 1;
  border: none !important;
  border-radius: 0 !important;
}

.input-with-suffix .suffix {
  padding: 12px 16px;
  background: #f5f5f5;
  color: #666666;
  font-weight: 600;
}

.services-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 10px 12px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  transition: all 0.2s;
}

.checkbox-label:has(input:checked) {
  border-color: #00a86b;
  background: #e8f5ef;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #00a86b;
}

.checkbox-text {
  font-size: 14px;
  color: #1a1a1a;
}

.form-hint {
  font-size: 12px;
  color: #666666;
  margin-top: 6px;
}

.form-hint.error {
  color: #e53935;
}

.btn-primary:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
}
</style>

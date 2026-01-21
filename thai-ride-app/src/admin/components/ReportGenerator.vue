<template>
  <div class="report-generator bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Generate Report</h2>

    <!-- Report Configuration -->
    <div class="space-y-4">
      <!-- Date Range -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Service Type Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
        <select
          v-model="filters.serviceType"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Service Types</option>
          <option value="ride">Ride</option>
          <option value="delivery">Delivery</option>
          <option value="shopping">Shopping</option>
          <option value="moving">Moving</option>
          <option value="laundry">Laundry</option>
        </select>
      </div>

      <!-- Status Filter -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Provider Status</label>
        <select
          v-model="filters.status"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending_email">Pending Email</option>
          <option value="pending_documents">Pending Documents</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="approved">Approved</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <!-- Metrics Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Metrics to Include</label>
        <div class="space-y-2">
          <label class="flex items-center">
            <input
              v-model="metrics.providerCount"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Provider Count</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="metrics.earnings"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Earnings Data</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="metrics.trips"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Trip Statistics</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="metrics.ratings"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Ratings & Reviews</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="metrics.performance"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Performance Metrics</span>
          </label>
        </div>
      </div>

      <!-- Export Format -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
        <div class="flex gap-4">
          <label class="flex items-center">
            <input
              v-model="exportFormat"
              type="radio"
              value="csv"
              class="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">CSV</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="exportFormat"
              type="radio"
              value="excel"
              class="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Excel</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="exportFormat"
              type="radio"
              value="pdf"
              class="border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">PDF</span>
          </label>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-4">
        <button
          @click="generateReport"
          :disabled="generating || !isValid"
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="generating" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </span>
          <span v-else>Generate Report</span>
        </button>
        <button
          @click="resetFilters"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="reportData" class="mt-6 pt-6 border-t border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
      <div class="bg-gray-50 rounded-lg p-4 space-y-2">
        <p class="text-sm text-gray-600">
          <span class="font-medium">Date Range:</span>
          {{ formatDate(filters.startDate) }} - {{ formatDate(filters.endDate) }}
        </p>
        <p class="text-sm text-gray-600">
          <span class="font-medium">Total Records:</span>
          {{ reportData.totalRecords }}
        </p>
        <p class="text-sm text-gray-600">
          <span class="font-medium">File Size:</span>
          {{ formatFileSize(reportData.estimatedSize) }}
        </p>
      </div>
      <button
        @click="downloadReport"
        class="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        Download Report
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabase';

interface Filters {
  startDate: string;
  endDate: string;
  serviceType: string;
  status: string;
}

interface Metrics {
  providerCount: boolean;
  earnings: boolean;
  trips: boolean;
  ratings: boolean;
  performance: boolean;
}

interface ReportData {
  totalRecords: number;
  estimatedSize: number;
  data: unknown[];
}

// State
const filters = ref<Filters>({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  serviceType: '',
  status: ''
});

const metrics = ref<Metrics>({
  providerCount: true,
  earnings: true,
  trips: true,
  ratings: false,
  performance: false
});

const exportFormat = ref<'csv' | 'excel' | 'pdf'>('csv');
const generating = ref(false);
const reportData = ref<ReportData | null>(null);

// Computed
const isValid = computed(() => {
  return filters.value.startDate && filters.value.endDate &&
    new Date(filters.value.startDate) <= new Date(filters.value.endDate) &&
    Object.values(metrics.value).some(v => v);
});

// Methods
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function resetFilters(): void {
  filters.value = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    serviceType: '',
    status: ''
  };
  metrics.value = {
    providerCount: true,
    earnings: true,
    trips: true,
    ratings: false,
    performance: false
  };
  reportData.value = null;
}

async function generateReport(): Promise<void> {
  try {
    generating.value = true;

    // Fetch data based on filters and metrics
    const data: unknown[] = [];

    if (metrics.value.providerCount || metrics.value.performance) {
      let query = supabase
        .from('providers')
        .select('*')
        .gte('created_at', filters.value.startDate)
        .lte('created_at', filters.value.endDate);

      if (filters.value.status) {
        query = query.eq('status', filters.value.status);
      }

      const { data: providers } = await query;
      if (providers) data.push(...providers);
    }

    if (metrics.value.earnings || metrics.value.trips) {
      let query = supabase
        .from('earnings')
        .select('*')
        .gte('earned_at', filters.value.startDate)
        .lte('earned_at', filters.value.endDate);

      if (filters.value.serviceType) {
        query = query.eq('service_type', filters.value.serviceType);
      }

      const { data: earnings } = await query;
      if (earnings) data.push(...earnings);
    }

    // Calculate estimated size
    const estimatedSize = JSON.stringify(data).length;

    reportData.value = {
      totalRecords: data.length,
      estimatedSize,
      data
    };
  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    generating.value = false;
  }
}

function downloadReport(): void {
  if (!reportData.value) return;

  const data = reportData.value.data;

  if (exportFormat.value === 'csv') {
    downloadCSV(data);
  } else if (exportFormat.value === 'excel') {
    downloadExcel(data);
  } else if (exportFormat.value === 'pdf') {
    downloadPDF(data);
  }
}

function downloadCSV(data: unknown[]): void {
  if (data.length === 0) return;

  // Convert to CSV
  const headers = Object.keys(data[0] as Record<string, unknown>);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = (row as Record<string, unknown>)[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `provider-report-${filters.value.startDate}-${filters.value.endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcel(data: unknown[]): void {
  // For Excel, we'd use a library like xlsx
  // For now, download as CSV with .xlsx extension
  downloadCSV(data);
}

function downloadPDF(data: unknown[]): void {
  // For PDF, we'd use a library like jsPDF
  // For now, show alert
  alert('PDF export coming soon!');
}
</script>

<style scoped>
.report-generator {
  max-width: 42rem;
  margin-left: auto;
  margin-right: auto;
}
</style>

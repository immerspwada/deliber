<!--
  Admin Table Component - MUNEEF Style
  
  Modern data table with sorting, filtering, pagination
  Features: row selection, actions, responsive design
-->

<template>
  <div class="admin-table">
    <!-- Table Header Actions -->
    <div v-if="$slots.actions || searchable" class="table-header">
      <div v-if="searchable" class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="search-input"
        >
      </div>
      <div v-if="$slots.actions" class="header-actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container">
      <table class="table">
        <!-- Table Head -->
        <thead class="table-head">
          <tr>
            <th v-if="selectable" class="checkbox-cell">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                class="checkbox"
              >
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="['table-header-cell', { sortable: column.sortable }]"
              @click="column.sortable && handleSort(column.key)"
            >
              <div class="header-content">
                <span>{{ column.label }}</span>
                <svg
                  v-if="column.sortable"
                  class="sort-icon"
                  :class="{ active: sortKey === column.key }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path v-if="sortKey === column.key && sortOrder === 'asc'" d="M7 15l5-5 5 5"/>
                  <path v-else-if="sortKey === column.key && sortOrder === 'desc'" d="M17 9l-5 5-5-5"/>
                  <path v-else d="M7 10l5-5 5 5M7 14l5 5 5-5"/>
                </svg>
              </div>
            </th>
            <th v-if="$slots.actions" class="actions-cell">Actions</th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="table-body">
          <tr
            v-for="(row, index) in paginatedData"
            :key="row.id || index"
            class="table-row"
            :class="{ selected: selectedRows.includes(row.id) }"
          >
            <td v-if="selectable" class="checkbox-cell">
              <input
                type="checkbox"
                :checked="selectedRows.includes(row.id)"
                @change="toggleSelectRow(row.id)"
                class="checkbox"
              >
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
              class="table-cell"
            >
              <slot
                :name="`cell-${column.key}`"
                :row="row"
                :value="row[column.key]"
              >
                {{ formatCell(row[column.key], column.format) }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="actions-cell">
              <slot name="row-actions" :row="row" />
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="!paginatedData.length" class="empty-row">
            <td :colspan="totalColumns" class="empty-cell">
              <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
                <p class="empty-text">{{ emptyText }}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="paginated && filteredData.length > pageSize" class="table-footer">
      <div class="pagination-info">
        แสดง {{ startIndex + 1 }}-{{ endIndex }} จาก {{ filteredData.length }} รายการ
      </div>
      <div class="pagination-controls">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="page-number">หน้า {{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useSlots } from 'vue'

const slots = useSlots()

interface Column {
  key: string
  label: string
  sortable?: boolean
  format?: 'date' | 'currency' | 'number' | 'status' | 'custom'
}

interface Props {
  columns: Column[]
  data: any[]
  selectable?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  paginated?: boolean
  pageSize?: number
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'ค้นหา...',
  pageSize: 10,
  emptyText: 'ไม่พบข้อมูล'
})

const emit = defineEmits<{
  'selection-change': [ids: any[]]
  'row-click': [row: any]
}>()

// State
const searchQuery = ref('')
const sortKey = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const selectedRows = ref<any[]>([])

// Computed
const totalColumns = computed(() => {
  let count = props.columns.length
  if (props.selectable) count++
  if (slots.actions) count++
  return count
})

const filteredData = computed(() => {
  let data = [...props.data]

  // Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    data = data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(query)
      )
    )
  }

  // Sort
  if (sortKey.value) {
    data.sort((a, b) => {
      const aVal = a[sortKey.value]
      const bVal = b[sortKey.value]
      
      if (aVal === bVal) return 0
      
      const comparison = aVal > bVal ? 1 : -1
      return sortOrder.value === 'asc' ? comparison : -comparison
    })
  }

  return data
})

const totalPages = computed(() =>
  Math.ceil(filteredData.value.length / props.pageSize)
)

const startIndex = computed(() =>
  (currentPage.value - 1) * props.pageSize
)

const endIndex = computed(() =>
  Math.min(startIndex.value + props.pageSize, filteredData.value.length)
)

const paginatedData = computed(() => {
  if (!props.paginated) return filteredData.value
  return filteredData.value.slice(startIndex.value, endIndex.value)
})

const allSelected = computed(() =>
  paginatedData.value.length > 0 &&
  paginatedData.value.every(row => selectedRows.value.includes(row.id))
)

// Methods
const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedRows.value = selectedRows.value.filter(
      id => !paginatedData.value.find(row => row.id === id)
    )
  } else {
    const newIds = paginatedData.value.map(row => row.id)
    selectedRows.value = [...new Set([...selectedRows.value, ...newIds])]
  }
  emit('selection-change', selectedRows.value)
}

const toggleSelectRow = (id: any) => {
  const index = selectedRows.value.indexOf(id)
  if (index > -1) {
    selectedRows.value.splice(index, 1)
  } else {
    selectedRows.value.push(id)
  }
  emit('selection-change', selectedRows.value)
}

const formatCell = (value: any, format?: string) => {
  if (value === null || value === undefined) return '-'

  switch (format) {
    case 'date':
      return new Date(value).toLocaleDateString('th-TH')
    case 'currency':
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
      }).format(value)
    case 'number':
      return new Intl.NumberFormat('th-TH').format(value)
    default:
      return value
  }
}
</script>

<style scoped>
.admin-table {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #F0F0F0;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #999999;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  background: #FFFFFF;
  color: #1A1A1A;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #00A86B;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table-head {
  background: #F5F5F5;
}

.table-header-cell {
  padding: 16px 24px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  white-space: nowrap;
}

.table-header-cell.sortable {
  cursor: pointer;
  user-select: none;
}

.table-header-cell.sortable:hover {
  background: #EBEBEB;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-icon {
  width: 16px;
  height: 16px;
  color: #CCCCCC;
  transition: color 0.2s;
}

.sort-icon.active {
  color: #00A86B;
}

.checkbox-cell {
  width: 48px;
  padding: 16px 24px;
  text-align: center;
}

.actions-cell {
  width: 120px;
  padding: 16px 24px;
  text-align: right;
}

.checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00A86B;
  cursor: pointer;
}

.table-body {
  background: #FFFFFF;
}

.table-row {
  border-bottom: 1px solid #F0F0F0;
  transition: background 0.2s;
}

.table-row:hover {
  background: #FAFAFA;
}

.table-row.selected {
  background: #F0FFF8;
}

.table-cell {
  padding: 16px 24px;
  font-size: 14px;
  color: #1A1A1A;
}

.empty-row {
  border-bottom: none;
}

.empty-cell {
  padding: 60px 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #CCCCCC;
}

.empty-text {
  font-size: 16px;
  color: #999999;
  margin: 0;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #F0F0F0;
  background: #FAFAFA;
}

.pagination-info {
  font-size: 14px;
  color: #666666;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #00A86B;
  background: #F0FFF8;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-btn svg {
  width: 16px;
  height: 16px;
  color: #666666;
}

.page-number {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Responsive */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .table-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .pagination-controls {
    justify-content: center;
  }
}
</style>
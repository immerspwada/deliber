<script setup lang="ts">
/**
 * Feature: F104 - Data Table
 * Sortable data table component
 */
import { ref, computed } from 'vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface Props {
  columns: Column[]
  data: Record<string, unknown>[]
  loading?: boolean
  emptyText?: string
  striped?: boolean
  hoverable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyText: 'ไม่มีข้อมูล',
  striped: false,
  hoverable: true
})

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>, index: number]
  sort: [key: string, direction: 'asc' | 'desc']
}>()

const sortKey = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const sortedData = computed(() => {
  if (!sortKey.value) return props.data
  
  return [...props.data].sort((a, b) => {
    const aVal = a[sortKey.value]
    const bVal = b[sortKey.value]
    
    if (aVal === bVal) return 0
    
    const comparison = aVal !== null && aVal !== undefined && bVal !== null && bVal !== undefined
      ? String(aVal).localeCompare(String(bVal))
      : 0
    
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

const handleSort = (column: Column) => {
  if (!column.sortable) return
  
  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortDirection.value = 'asc'
  }
  
  emit('sort', sortKey.value, sortDirection.value)
}

const handleRowClick = (row: Record<string, unknown>, index: number) => {
  emit('rowClick', row, index)
}
</script>

<template>
  <div class="data-table-wrapper">
    <table class="data-table" :class="{ striped, hoverable }">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ width: column.width, textAlign: column.align || 'left' }"
            :class="{ sortable: column.sortable, sorted: sortKey === column.key }"
            @click="handleSort(column)"
          >
            <span class="th-content">
              {{ column.label }}
              <svg
                v-if="column.sortable"
                class="sort-icon"
                :class="{ desc: sortKey === column.key && sortDirection === 'desc' }"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </th>
        </tr>
      </thead>
      
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="loading-cell">
            <span class="spinner" />
            <span>กำลังโหลด...</span>
          </td>
        </tr>
        
        <tr v-else-if="sortedData.length === 0">
          <td :colspan="columns.length" class="empty-cell">
            {{ emptyText }}
          </td>
        </tr>
        
        <tr
          v-else
          v-for="(row, index) in sortedData"
          :key="index"
          @click="handleRowClick(row, index)"
        >
          <td
            v-for="column in columns"
            :key="column.key"
            :style="{ textAlign: column.align || 'left' }"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table-wrapper {
  overflow-x: auto;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  padding: 14px 16px;
  background: #f6f6f6;
  font-weight: 600;
  color: #6b6b6b;
  border-bottom: 1px solid #e5e5e5;
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  color: #000;
}

.data-table th.sorted {
  color: #000;
}

.th-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sort-icon {
  opacity: 0.3;
  transition: all 0.2s;
}

.sorted .sort-icon {
  opacity: 1;
}

.sort-icon.desc {
  transform: rotate(180deg);
}

.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #e5e5e5;
  color: #000;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table.striped tbody tr:nth-child(even) {
  background: #f9f9f9;
}

.data-table.hoverable tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}

.data-table.hoverable tbody tr:hover {
  background: #f6f6f6;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 48px 16px;
  color: #6b6b6b;
}

.loading-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

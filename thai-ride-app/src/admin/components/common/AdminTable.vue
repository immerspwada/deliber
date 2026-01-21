<!--
  Admin Table Component
  ====================
  Reusable data table with sorting, filtering, pagination
-->

<template>
  <div class="admin-table">
    <!-- Search & Filters -->
    <div v-if="searchable || $slots.filters" class="admin-table__toolbar">
      <div v-if="searchable" class="admin-table__search">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="admin-table__search-input"
        />
      </div>
      <div v-if="$slots.filters" class="admin-table__filters">
        <slot name="filters" />
      </div>
    </div>

    <!-- Table -->
    <div class="admin-table__wrapper">
      <table class="admin-table__table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[
                'admin-table__th',
                { 'admin-table__th--sortable': column.sortable }
              ]"
              @click="column.sortable && handleSort(column.key)"
            >
              {{ column.label }}
              <span v-if="column.sortable && sortBy === column.key" class="admin-table__sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in paginatedData"
            :key="index"
            class="admin-table__tr"
            @click="$emit('row-click', row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="admin-table__td"
            >
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                {{ row[column.key] }}
              </slot>
            </td>
          </tr>
          <tr v-if="paginatedData.length === 0">
            <td :colspan="columns.length" class="admin-table__empty">
              {{ emptyText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="paginated && totalPages > 1" class="admin-table__pagination">
      <button
        :disabled="currentPage === 1"
        class="admin-table__page-btn"
        @click="currentPage--"
      >
        ก่อนหน้า
      </button>
      <span class="admin-table__page-info">
        หน้า {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        :disabled="currentPage === totalPages"
        class="admin-table__page-btn"
        @click="currentPage++"
      >
        ถัดไป
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
}

interface Props {
  columns: Column[]
  data: any[]
  searchable?: boolean
  searchPlaceholder?: string
  paginated?: boolean
  pageSize?: number
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  searchable: false,
  searchPlaceholder: 'ค้นหา...',
  paginated: true,
  pageSize: 20,
  emptyText: 'ไม่มีข้อมูล'
})

defineEmits<{
  'row-click': [row: any]
}>()

const searchQuery = ref('')
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)

const filteredData = computed(() => {
  let result = [...props.data]

  // Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(query)
      )
    )
  }

  // Sort
  if (sortBy.value) {
    result.sort((a, b) => {
      const aVal = a[sortBy.value!]
      const bVal = b[sortBy.value!]
      const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder.value === 'asc' ? compare : -compare
    })
  }

  return result
})

const totalPages = computed(() =>
  Math.ceil(filteredData.value.length / props.pageSize)
)

const paginatedData = computed(() => {
  if (!props.paginated) return filteredData.value
  const start = (currentPage.value - 1) * props.pageSize
  return filteredData.value.slice(start, start + props.pageSize)
})

const handleSort = (key: string) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
}
</script>

<style scoped>
.admin-table {
  background: white;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
}

.admin-table__toolbar {
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  gap: 16px;
  align-items: center;
}

.admin-table__search {
  flex: 1;
}

.admin-table__search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 14px;
}

.admin-table__wrapper {
  overflow-x: auto;
}

.admin-table__table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table__th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: #6B7280;
  border-bottom: 1px solid #E5E7EB;
  background: #F9FAFB;
}

.admin-table__th--sortable {
  cursor: pointer;
  user-select: none;
}

.admin-table__th--sortable:hover {
  background: #F3F4F6;
}

.admin-table__sort-icon {
  margin-left: 4px;
  color: #00A86B;
}

.admin-table__tr {
  cursor: pointer;
  transition: background 0.15s;
}

.admin-table__tr:hover {
  background: #F9FAFB;
}

.admin-table__td {
  padding: 12px 16px;
  font-size: 14px;
  color: #1F2937;
  border-bottom: 1px solid #F3F4F6;
}

.admin-table__empty {
  padding: 48px 16px;
  text-align: center;
  color: #9CA3AF;
  font-size: 14px;
}

.admin-table__pagination {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border-top: 1px solid #E5E7EB;
}

.admin-table__page-btn {
  padding: 6px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  background: white;
  color: #1F2937;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.admin-table__page-btn:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: #00A86B;
}

.admin-table__page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-table__page-info {
  font-size: 14px;
  color: #6B7280;
}
</style>

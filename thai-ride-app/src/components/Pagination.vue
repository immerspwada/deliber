<script setup lang="ts">
/**
 * Feature: F103 - Pagination
 * Page navigation component
 */
import { computed } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
  maxVisible?: number
  showFirstLast?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 5,
  showFirstLast: true
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
}>()

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const half = Math.floor(props.maxVisible / 2)
  
  let start = Math.max(1, props.currentPage - half)
  let end = Math.min(props.totalPages, start + props.maxVisible - 1)
  
  if (end - start + 1 < props.maxVisible) {
    start = Math.max(1, end - props.maxVisible + 1)
  }
  
  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('...')
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  if (end < props.totalPages) {
    if (end < props.totalPages - 1) pages.push('...')
    pages.push(props.totalPages)
  }
  
  return pages
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('update:currentPage', page)
  }
}

const prevPage = () => goToPage(props.currentPage - 1)
const nextPage = () => goToPage(props.currentPage + 1)
</script>

<template>
  <nav class="pagination" aria-label="Pagination">
    <button
      v-if="showFirstLast"
      class="page-btn"
      :disabled="currentPage === 1"
      @click="goToPage(1)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
      </svg>
    </button>
    
    <button
      class="page-btn"
      :disabled="currentPage === 1"
      @click="prevPage"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    
    <template v-for="page in visiblePages" :key="page">
      <span v-if="page === '...'" class="page-ellipsis">...</span>
      <button
        v-else
        class="page-btn page-number"
        :class="{ active: page === currentPage }"
        @click="goToPage(page as number)"
      >
        {{ page }}
      </button>
    </template>
    
    <button
      class="page-btn"
      :disabled="currentPage === totalPages"
      @click="nextPage"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
    
    <button
      v-if="showFirstLast"
      class="page-btn"
      :disabled="currentPage === totalPages"
      @click="goToPage(totalPages)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
      </svg>
    </button>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f6f6f6;
  border-color: #000;
  color: #000;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: #000;
  border-color: #000;
  color: #fff;
}

.page-number {
  padding: 0 12px;
}

.page-ellipsis {
  padding: 0 8px;
  color: #6b6b6b;
}
</style>

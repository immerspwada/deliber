/**
 * Customer Filters Composable
 * ============================
 * จัดการ filters ขั้นสูงสำหรับ Admin Customers
 */
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

export type CustomerStatus = 'active' | 'suspended' | 'banned'
export type SortField = 'created_at' | 'wallet_balance' | 'total_orders' | 'full_name'
export type SortOrder = 'asc' | 'desc'

export interface DateRange {
  start: Date | null
  end: Date | null
}

export interface NumberRange {
  min: number | null
  max: number | null
}

export interface CustomerFilters {
  searchTerm: string
  status: CustomerStatus[]
  dateRange: DateRange | null
  walletRange: NumberRange | null
  orderRange: NumberRange | null
  ratingRange: NumberRange | null
  sortBy: SortField
  sortOrder: SortOrder
}

export interface FilterStats {
  totalFilters: number
  activeFilters: string[]
}

export function useCustomerFilters() {
  // Filter state
  const filters = ref<CustomerFilters>({
    searchTerm: '',
    status: [],
    dateRange: null,
    walletRange: null,
    orderRange: null,
    ratingRange: null,
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  // UI state
  const showAdvancedFilters = ref(false)
  const isFiltering = ref(false)

  // Computed
  const hasActiveFilters = computed(() => {
    return (
      filters.value.searchTerm.length > 0 ||
      filters.value.status.length > 0 ||
      filters.value.dateRange !== null ||
      filters.value.walletRange !== null ||
      filters.value.orderRange !== null ||
      filters.value.ratingRange !== null
    )
  })

  const filterStats = computed<FilterStats>(() => {
    const active: string[] = []
    
    if (filters.value.searchTerm) active.push('search')
    if (filters.value.status.length > 0) active.push('status')
    if (filters.value.dateRange) active.push('date')
    if (filters.value.walletRange) active.push('wallet')
    if (filters.value.orderRange) active.push('orders')
    if (filters.value.ratingRange) active.push('rating')

    return {
      totalFilters: active.length,
      activeFilters: active
    }
  })

  const filterSummary = computed(() => {
    const parts: string[] = []
    
    if (filters.value.searchTerm) {
      parts.push(`ค้นหา: "${filters.value.searchTerm}"`)
    }
    
    if (filters.value.status.length > 0) {
      parts.push(`สถานะ: ${filters.value.status.join(', ')}`)
    }
    
    if (filters.value.dateRange?.start && filters.value.dateRange?.end) {
      parts.push(`วันที่: ${formatDateShort(filters.value.dateRange.start)} - ${formatDateShort(filters.value.dateRange.end)}`)
    }
    
    if (filters.value.walletRange?.min !== null || filters.value.walletRange?.max !== null) {
      const min = filters.value.walletRange?.min ?? 0
      const max = filters.value.walletRange?.max ?? '∞'
      parts.push(`Wallet: ฿${min} - ฿${max}`)
    }
    
    if (filters.value.orderRange?.min !== null || filters.value.orderRange?.max !== null) {
      const min = filters.value.orderRange?.min ?? 0
      const max = filters.value.orderRange?.max ?? '∞'
      parts.push(`ออเดอร์: ${min} - ${max}`)
    }
    
    if (filters.value.ratingRange?.min !== null || filters.value.ratingRange?.max !== null) {
      const min = filters.value.ratingRange?.min ?? 0
      const max = filters.value.ratingRange?.max ?? 5
      parts.push(`คะแนน: ${min} - ${max} ⭐`)
    }

    return parts.join(' • ')
  })

  // Methods
  function setSearchTerm(term: string) {
    filters.value.searchTerm = term
  }

  function toggleStatus(status: CustomerStatus) {
    const index = filters.value.status.indexOf(status)
    if (index > -1) {
      filters.value.status.splice(index, 1)
    } else {
      filters.value.status.push(status)
    }
  }

  function setDateRange(start: Date | null, end: Date | null) {
    filters.value.dateRange = start && end ? { start, end } : null
  }

  function setWalletRange(min: number | null, max: number | null) {
    filters.value.walletRange = (min !== null || max !== null) ? { min, max } : null
  }

  function setOrderRange(min: number | null, max: number | null) {
    filters.value.orderRange = (min !== null || max !== null) ? { min, max } : null
  }

  function setRatingRange(min: number | null, max: number | null) {
    filters.value.ratingRange = (min !== null || max !== null) ? { min, max } : null
  }

  function setSorting(field: SortField, order: SortOrder) {
    filters.value.sortBy = field
    filters.value.sortOrder = order
  }

  function toggleSortOrder() {
    filters.value.sortOrder = filters.value.sortOrder === 'asc' ? 'desc' : 'asc'
  }

  function clearFilters() {
    filters.value = {
      searchTerm: '',
      status: [],
      dateRange: null,
      walletRange: null,
      orderRange: null,
      ratingRange: null,
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  }

  function clearFilter(filterName: string) {
    switch (filterName) {
      case 'search':
        filters.value.searchTerm = ''
        break
      case 'status':
        filters.value.status = []
        break
      case 'date':
        filters.value.dateRange = null
        break
      case 'wallet':
        filters.value.walletRange = null
        break
      case 'orders':
        filters.value.orderRange = null
        break
      case 'rating':
        filters.value.ratingRange = null
        break
    }
  }

  function toggleAdvancedFilters() {
    showAdvancedFilters.value = !showAdvancedFilters.value
  }

  // Convert filters to API params
  function toAPIParams() {
    const params: Record<string, any> = {}

    if (filters.value.searchTerm) {
      params.search = filters.value.searchTerm
    }

    if (filters.value.status.length > 0) {
      params.status = filters.value.status
    }

    if (filters.value.dateRange?.start && filters.value.dateRange?.end) {
      params.created_after = filters.value.dateRange.start.toISOString()
      params.created_before = filters.value.dateRange.end.toISOString()
    }

    if (filters.value.walletRange?.min !== null) {
      params.wallet_min = filters.value.walletRange.min
    }
    if (filters.value.walletRange?.max !== null) {
      params.wallet_max = filters.value.walletRange.max
    }

    if (filters.value.orderRange?.min !== null) {
      params.orders_min = filters.value.orderRange.min
    }
    if (filters.value.orderRange?.max !== null) {
      params.orders_max = filters.value.orderRange.max
    }

    if (filters.value.ratingRange?.min !== null) {
      params.rating_min = filters.value.ratingRange.min
    }
    if (filters.value.ratingRange?.max !== null) {
      params.rating_max = filters.value.ratingRange.max
    }

    params.sort_by = filters.value.sortBy
    params.sort_order = filters.value.sortOrder

    return params
  }

  // Load filters from URL
  function loadFromURL(params: URLSearchParams) {
    const search = params.get('search')
    if (search) filters.value.searchTerm = search

    const status = params.get('status')
    if (status) {
      filters.value.status = status.split(',') as CustomerStatus[]
    }

    const dateStart = params.get('date_start')
    const dateEnd = params.get('date_end')
    if (dateStart && dateEnd) {
      filters.value.dateRange = {
        start: new Date(dateStart),
        end: new Date(dateEnd)
      }
    }

    const walletMin = params.get('wallet_min')
    const walletMax = params.get('wallet_max')
    if (walletMin || walletMax) {
      filters.value.walletRange = {
        min: walletMin ? parseFloat(walletMin) : null,
        max: walletMax ? parseFloat(walletMax) : null
      }
    }

    const sortBy = params.get('sort_by') as SortField
    if (sortBy) filters.value.sortBy = sortBy

    const sortOrder = params.get('sort_order') as SortOrder
    if (sortOrder) filters.value.sortOrder = sortOrder
  }

  // Save filters to URL
  function saveToURL() {
    const params = new URLSearchParams()

    if (filters.value.searchTerm) {
      params.set('search', filters.value.searchTerm)
    }

    if (filters.value.status.length > 0) {
      params.set('status', filters.value.status.join(','))
    }

    if (filters.value.dateRange?.start && filters.value.dateRange?.end) {
      params.set('date_start', filters.value.dateRange.start.toISOString())
      params.set('date_end', filters.value.dateRange.end.toISOString())
    }

    if (filters.value.walletRange?.min !== null) {
      params.set('wallet_min', filters.value.walletRange.min.toString())
    }
    if (filters.value.walletRange?.max !== null) {
      params.set('wallet_max', filters.value.walletRange.max.toString())
    }

    params.set('sort_by', filters.value.sortBy)
    params.set('sort_order', filters.value.sortOrder)

    const url = new URL(window.location.href)
    url.search = params.toString()
    window.history.replaceState({}, '', url.toString())
  }

  // Debounced search
  const debouncedSearch = useDebounceFn((term: string) => {
    setSearchTerm(term)
  }, 300)

  // Helper functions
  function formatDateShort(date: Date): string {
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  // Watch for filter changes and save to URL
  watch(filters, () => {
    saveToURL()
  }, { deep: true })

  return {
    // State
    filters,
    showAdvancedFilters,
    isFiltering,

    // Computed
    hasActiveFilters,
    filterStats,
    filterSummary,

    // Methods
    setSearchTerm,
    toggleStatus,
    setDateRange,
    setWalletRange,
    setOrderRange,
    setRatingRange,
    setSorting,
    toggleSortOrder,
    clearFilters,
    clearFilter,
    toggleAdvancedFilters,
    toAPIParams,
    loadFromURL,
    saveToURL,
    debouncedSearch
  }
}

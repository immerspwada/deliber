<script setup lang="ts">
/**
 * Feature: F72 - Price Display
 * Formatted price display with currency and styling options
 */
import { computed } from 'vue'

interface Props {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  strikethrough?: boolean
  discount?: number
  showSign?: boolean
  color?: 'default' | 'success' | 'error' | 'muted'
}

const props = withDefaults(defineProps<Props>(), {
  currency: '฿',
  size: 'md',
  strikethrough: false,
  discount: 0,
  showSign: false,
  color: 'default'
})

const formattedAmount = computed(() => {
  const absAmount = Math.abs(props.amount)
  const formatted = absAmount.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  
  if (props.showSign && props.amount !== 0) {
    return props.amount > 0 ? `+${formatted}` : `-${formatted}`
  }
  
  return formatted
})

const discountedAmount = computed(() => {
  if (!props.discount) return null
  const discounted = props.amount - (props.amount * props.discount / 100)
  return discounted.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
})

const discountPercent = computed(() => {
  return `-${props.discount}%`
})
</script>

<template>
  <div class="price-display" :class="[`size-${size}`, `color-${color}`]">
    <div v-if="discount" class="price-with-discount">
      <span class="original-price">{{ currency }}{{ formattedAmount }}</span>
      <span class="discount-badge">{{ discountPercent }}</span>
      <span class="discounted-price">{{ currency }}{{ discountedAmount }}</span>
    </div>
    <span v-else class="price" :class="{ strikethrough }">
      {{ currency }}{{ formattedAmount }}
    </span>
  </div>
</template>

<style scoped>
.price-display {
  display: inline-flex;
  align-items: baseline;
}

.price {
  font-weight: 600;
  color: #000;
}

.price.strikethrough {
  text-decoration: line-through;
  color: #6b6b6b;
}

.price-with-discount {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.original-price {
  text-decoration: line-through;
  color: #6b6b6b;
}

.discount-badge {
  background: #e11900;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.discounted-price {
  font-weight: 600;
  color: #000;
}

/* Size variants */
.size-sm .price,
.size-sm .discounted-price {
  font-size: 14px;
}

.size-sm .original-price {
  font-size: 12px;
}

.size-md .price,
.size-md .discounted-price {
  font-size: 18px;
}

.size-md .original-price {
  font-size: 14px;
}

.size-lg .price,
.size-lg .discounted-price {
  font-size: 24px;
}

.size-lg .original-price {
  font-size: 16px;
}

.size-xl .price,
.size-xl .discounted-price {
  font-size: 32px;
}

.size-xl .original-price {
  font-size: 20px;
}

/* Color variants */
.color-success .price,
.color-success .discounted-price {
  color: #276ef1;
}

.color-error .price,
.color-error .discounted-price {
  color: #e11900;
}

.color-muted .price,
.color-muted .discounted-price {
  color: #6b6b6b;
}
</style>

<script setup lang="ts">
/**
 * Feature: F371 - Virtual List
 * Virtualized list for large datasets
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  items: Array<unknown>
  itemHeight: number
  containerHeight?: number
  overscan?: number
}>(), {
  containerHeight: 400,
  overscan: 3
})

const scrollTop = ref(0)
const container = ref<HTMLElement>()

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan)
  const visibleCount = Math.ceil(props.containerHeight / props.itemHeight) + props.overscan * 2
  const end = Math.min(props.items.length, start + visibleCount)
  return { start, end }
})

const visibleItems = computed(() => 
  props.items.slice(visibleRange.value.start, visibleRange.value.end).map((item, i) => ({
    item,
    index: visibleRange.value.start + i
  }))
)

const totalHeight = computed(() => props.items.length * props.itemHeight)
const offsetY = computed(() => visibleRange.value.start * props.itemHeight)

const onScroll = (e: Event) => {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

onMounted(() => container.value?.addEventListener('scroll', onScroll))
onUnmounted(() => container.value?.removeEventListener('scroll', onScroll))
</script>

<template>
  <div ref="container" class="virtual-list" :style="{ height: containerHeight + 'px' }">
    <div class="virtual-list-spacer" :style="{ height: totalHeight + 'px' }">
      <div class="virtual-list-content" :style="{ transform: `translateY(${offsetY}px)` }">
        <div v-for="{ item, index } in visibleItems" :key="index" class="virtual-list-item" :style="{ height: itemHeight + 'px' }">
          <slot :item="item" :index="index"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-list { overflow-y: auto; }
.virtual-list-spacer { position: relative; }
.virtual-list-content { position: absolute; top: 0; left: 0; right: 0; }
</style>

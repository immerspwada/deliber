<script setup lang="ts">
/**
 * Feature: F85 - Accordion
 * Collapsible content sections
 */
import { ref } from 'vue'

interface AccordionItem {
  id: string
  title: string
  content?: string
}

interface Props {
  items: AccordionItem[]
  multiple?: boolean
  defaultOpen?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  defaultOpen: () => []
})

const openItems = ref<Set<string>>(new Set(props.defaultOpen))

const toggle = (id: string) => {
  if (openItems.value.has(id)) {
    openItems.value.delete(id)
  } else {
    if (!props.multiple) {
      openItems.value.clear()
    }
    openItems.value.add(id)
  }
  // Trigger reactivity
  openItems.value = new Set(openItems.value)
}

const isOpen = (id: string) => openItems.value.has(id)
</script>

<template>
  <div class="accordion">
    <div
      v-for="item in items"
      :key="item.id"
      class="accordion-item"
      :class="{ open: isOpen(item.id) }"
    >
      <button class="accordion-header" @click="toggle(item.id)">
        <span class="accordion-title">{{ item.title }}</span>
        <svg
          class="accordion-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      
      <div class="accordion-content">
        <div class="accordion-body">
          <slot :name="item.id">
            <p v-if="item.content">{{ item.content }}</p>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accordion {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
}

.accordion-item {
  border-bottom: 1px solid #e5e5e5;
}

.accordion-item:last-child {
  border-bottom: none;
}

.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fff;
  border: none;
  font-size: 15px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.accordion-header:hover {
  background: #f6f6f6;
}

.accordion-icon {
  color: #6b6b6b;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.accordion-item.open .accordion-icon {
  transform: rotate(180deg);
}

.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.accordion-item.open .accordion-content {
  max-height: 500px;
}

.accordion-body {
  padding: 0 20px 16px;
  color: #6b6b6b;
  font-size: 14px;
  line-height: 1.6;
}

.accordion-body p {
  margin: 0;
}
</style>

<script setup lang="ts">
/**
 * WhereToGoBanner - Minimal, clean banner for destination exploration
 * Design: Simple, elegant, SVG-based
 */
interface Props {
  title?: string;
  subtitle?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'ไปไหนดี?',
  subtitle: 'ค้นหาสถานที่ยอดนิยม'
});

const emit = defineEmits<{
  click: [];
}>();

const handleClick = () => {
  emit('click');
};
</script>

<template>
  <button
    type="button"
    class="where-to-go-banner"
    @click="handleClick"
    aria-label="ค้นหาสถานที่ยอดนิยม"
  >
    <!-- Map Pin Icon (SVG) -->
    <div class="banner-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </div>
    
    <!-- Text -->
    <div class="banner-text">
      <h3 class="banner-title">{{ title }}</h3>
      <p class="banner-subtitle">{{ subtitle }}</p>
    </div>
    
    <!-- Arrow Icon (SVG) -->
    <div class="banner-arrow" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </div>
  </button>
</template>

<style scoped>
.where-to-go-banner {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border: 1.5px solid #E5E7EB;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.where-to-go-banner:hover {
  border-color: #00A86B;
  background: #F9FAFB;
}

.where-to-go-banner:active {
  transform: scale(0.98);
}

.where-to-go-banner:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

/* Icon */
.banner-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.banner-icon svg {
  width: 24px;
  height: 24px;
}

/* Text */
.banner-text {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.banner-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px 0;
  line-height: 1.3;
}

.banner-subtitle {
  font-size: 13px;
  font-weight: 400;
  color: #6B7280;
  margin: 0;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Arrow */
.banner-arrow {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: #9CA3AF;
  transition: all 0.2s ease;
}

.banner-arrow svg {
  width: 100%;
  height: 100%;
}

.where-to-go-banner:hover .banner-arrow {
  color: #00A86B;
  transform: translateX(2px);
}

/* Accessibility - Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .where-to-go-banner,
  .banner-arrow {
    transition: none;
  }
  
  .where-to-go-banner:hover .banner-arrow {
    transform: none;
  }
  
  .where-to-go-banner:active {
    transform: none;
  }
}

/* Mobile Optimization */
@media (max-width: 640px) {
  .where-to-go-banner {
    padding: 14px 16px;
    gap: 10px;
  }
  
  .banner-icon {
    width: 36px;
    height: 36px;
  }
  
  .banner-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .banner-title {
    font-size: 15px;
  }
  
  .banner-subtitle {
    font-size: 12px;
  }
  
  .banner-arrow {
    width: 18px;
    height: 18px;
  }
}

/* Touch Devices - Larger Touch Target */
@media (hover: none) and (pointer: coarse) {
  .where-to-go-banner {
    min-height: 60px; /* WCAG 2.5.5 - Target Size */
  }
}
</style>

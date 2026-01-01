<script setup lang="ts">
/**
 * PromoInfoBadge - Shows promo discount info in Provider job cards
 * Feature: F10 - Promo Codes (Provider View)
 */
import { ref, onMounted } from "vue";
import { usePromoSystem } from "../../composables/usePromoSystem";

const props = defineProps<{
  serviceType: string;
  requestId: string;
}>();

const promoSystem = usePromoSystem();
const promoInfo = ref<{
  promo_code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  promo_description: string;
} | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    promoInfo.value = await promoSystem.getJobPromoInfo(
      props.serviceType,
      props.requestId
    );
  } catch (err) {
    console.error("[PromoInfoBadge] Error:", err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="!loading && promoInfo?.promo_code" class="promo-badge">
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
    <span class="code">{{ promoInfo.promo_code }}</span>
    <span class="discount"
      >-฿{{ promoInfo.discount_amount?.toLocaleString() || 0 }}</span
    >
  </div>
</template>

<style scoped>
.promo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 16px;
  font-size: 12px;
}

.promo-badge svg {
  flex-shrink: 0;
}

.code {
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.discount {
  font-weight: 600;
  color: #dc2626;
}
</style>

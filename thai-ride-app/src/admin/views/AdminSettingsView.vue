<template>
  <div class="admin-settings-hub">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">การตั้งค่าระบบ</h1>
      <p class="text-gray-600 mt-1">จัดการการตั้งค่าและการกำหนดค่าระบบทั้งหมด</p>
    </div>

    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">ทั่วไป</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SettingCard
          icon="⚙️"
          title="ทั่วไป"
          description="จัดการข้อมูลพื้นฐานของเว็บไซต์, SEO, ชื่อบริษัท การติดต่อ และอื่นๆ"
          @click="navigateTo('/admin/settings/system')"
        />
        <SettingCard
          icon="🎨"
          title="ธีม"
          description="ปรับแต่งรูปลักษณ์และสีสันของแบรนด์"
          @click="navigateTo('/admin/settings/theme')"
        />
        <SettingCard
          icon="🌐"
          title="ภาษา"
          description="ตั้งค่าภาษาที่ต้องการและแปลเนื้อหา"
          @click="navigateTo('/admin/settings/language')"
        />
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">การตั้งค่าการสั่งซื้อ</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SettingCard
          icon="💰"
          title="การเงิน"
          description="เปิดใช้งานและตั้งค่าวิธีการชำระเงิน, ค่าคอมมิชชั่น, การถอนเงิน"
          @click="navigateTo('/admin/settings/financial')"
        />
        <SettingCard
          icon="🔔"
          title="การแจ้งเตือน"
          description="ตั้งค่าการแจ้งเตือนสำหรับผู้ใช้งาน, ผู้ให้บริการ, และลูกค้า"
          @click="navigateTo('/admin/settings/notifications')"
        />
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">การเข้าถึงและความปลอดภัย</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingCard
          icon="🔒"
          title="ความปลอดภัย"
          description="ตั้งค่าสำหรับการยืนยันตัวตนและความปลอดภัยของผู้ใช้"
          @click="navigateTo('/admin/settings/security')"
        />
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">การตั้งค่าแพลตฟอร์ม</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SettingCard
          icon="👥"
          title="พื้นที่บริการ"
          description="ควบคุมพื้นที่ที่ให้บริการในแต่ละประเภท"
          @click="navigateTo('/admin/settings/service-areas')"
        />
        <SettingCard
          icon="🗺️"
          title="Google Maps"
          description="จัดการการตั้งค่าที่เกี่ยวกับ Google Maps และการนำทาง"
          @click="navigateTo('/admin/settings/maps')"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import SettingCard from '@/admin/components/SettingCard.vue'

const router = useRouter()

function navigateTo(path: string): void {
  router.push(path)
}
</script>

<style scoped>
.admin-settings-hub {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .admin-settings-hub {
    padding: 1rem;
  }
}
</style>

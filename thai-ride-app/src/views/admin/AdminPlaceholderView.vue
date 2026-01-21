<template>
  <div class="admin-placeholder p-6">
    <div class="bg-white rounded-lg shadow p-8 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ pageTitle }}</h1>
      <p class="text-gray-600 mb-6">{{ pageDescription }}</p>
      <div class="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        อยู่ระหว่างพัฒนา
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageTitles: Record<string, { title: string; description: string }> = {
  'orders': { title: 'จัดการออเดอร์', description: 'ดูและจัดการออเดอร์ทั้งหมดในระบบ' },
  'live-map': { title: 'แผนที่สด', description: 'ติดตามตำแหน่งผู้ให้บริการแบบ Real-time' },
  'customers': { title: 'จัดการลูกค้า', description: 'ดูและจัดการข้อมูลลูกค้า' },
  'documents': { title: 'จัดการเอกสาร', description: 'ตรวจสอบและอนุมัติเอกสารผู้ให้บริการ' },
  'verification-queue': { title: 'คิวตรวจสอบ', description: 'รายการผู้ให้บริการที่รอการตรวจสอบ' },
  'driver-tracking': { title: 'ติดตามคนขับ', description: 'ติดตามตำแหน่งคนขับแบบ Real-time' },
  'scheduled-rides': { title: 'การนัดหมาย', description: 'จัดการการจองล่วงหน้า' },
  'delivery': { title: 'บริการส่งของ', description: 'จัดการออเดอร์ส่งของ' },
  'shopping': { title: 'บริการช้อปปิ้ง', description: 'จัดการออเดอร์ช้อปปิ้ง' },
  'queue-bookings': { title: 'จองคิว', description: 'จัดการการจองคิว' },
  'moving': { title: 'บริการขนย้าย', description: 'จัดการออเดอร์ขนย้าย' },
  'laundry': { title: 'บริการซักผ้า', description: 'จัดการออเดอร์ซักผ้า' },
  'cancellations': { title: 'การยกเลิก', description: 'ดูรายการที่ถูกยกเลิก' },
  'revenue': { title: 'รายได้', description: 'ดูรายงานรายได้' },
  'payments': { title: 'การชำระเงิน', description: 'จัดการการชำระเงิน' },
  'refunds': { title: 'คืนเงิน', description: 'จัดการการคืนเงิน' },
  'wallets': { title: 'กระเป๋าเงิน', description: 'จัดการกระเป๋าเงินผู้ใช้' },
  'topup-requests': { title: 'คำขอเติมเงิน', description: 'อนุมัติคำขอเติมเงิน' },
  'withdrawals': { title: 'การถอนเงิน', description: 'จัดการการถอนเงิน' },
  'tips': { title: 'ทิป', description: 'ดูรายงานทิป' },
  'promos': { title: 'โปรโมโค้ด', description: 'จัดการโปรโมโค้ด' },
  'referrals': { title: 'แนะนำเพื่อน', description: 'จัดการโปรแกรมแนะนำเพื่อน' },
  'loyalty': { title: 'Loyalty', description: 'จัดการโปรแกรม Loyalty' },
  'incentives': { title: 'โบนัสคนขับ', description: 'จัดการโบนัสและ Incentive' },
  'subscriptions': { title: 'แพ็กเกจ', description: 'จัดการแพ็กเกจสมาชิก' },
  'ratings': { title: 'รีวิว', description: 'ดูและจัดการรีวิว' },
  'feedback': { title: 'Feedback', description: 'ดู Feedback จากผู้ใช้' },
  'support': { title: 'Support Tickets', description: 'จัดการ Ticket สนับสนุน' },
  'fraud-alerts': { title: 'แจ้งเตือนทุจริต', description: 'ตรวจสอบกิจกรรมที่น่าสงสัย' },
  'corporate': { title: 'ลูกค้าองค์กร', description: 'จัดการบัญชีองค์กร' },
  'reports': { title: 'รายงาน', description: 'ดูรายงานต่างๆ' },
  'ux-analytics': { title: 'UX Analytics', description: 'วิเคราะห์พฤติกรรมผู้ใช้' },
  'settings': { title: 'ตั้งค่าทั่วไป', description: 'ตั้งค่าระบบ' },
  'notifications': { title: 'การแจ้งเตือน', description: 'ตั้งค่าการแจ้งเตือน' },
  'push-notifications': { title: 'Push Notifications', description: 'ส่ง Push Notification' },
  'notification-templates': { title: 'Notification Templates', description: 'จัดการ Template แจ้งเตือน' },
  'service-zones': { title: 'พื้นที่บริการ', description: 'กำหนดพื้นที่ให้บริการ' },
  'surge-pricing': { title: 'Surge Pricing', description: 'ตั้งค่าราคาช่วง Peak' },
  'system-health': { title: 'สุขภาพระบบ', description: 'ตรวจสอบสถานะระบบ' },
  'security': { title: 'ความปลอดภัย', description: 'ตั้งค่าความปลอดภัย' },
  'production-dashboard': { title: 'Production KPIs', description: 'ดู KPIs สำหรับ Production' },
  'cross-role-monitor': { title: 'Cross-Role Monitor', description: 'ตรวจสอบการทำงานข้าม Role' },
  'audit-log': { title: 'Audit Log', description: 'ดู Log การเปลี่ยนแปลง' },
  'alerting': { title: 'Alerts', description: 'ตั้งค่าการแจ้งเตือนระบบ' },
  'deployment': { title: 'Deployment', description: 'จัดการการ Deploy' },
  'data-management': { title: 'Data Management', description: 'จัดการข้อมูล' },
  'compliance': { title: 'Compliance', description: 'ตรวจสอบ Compliance' },
  'incidents': { title: 'Incidents', description: 'จัดการ Incident' },
  'readiness': { title: 'Readiness Check', description: 'ตรวจสอบความพร้อมระบบ' }
}

const currentPath = computed(() => {
  const path = route.path.split('/').pop() || ''
  return path
})

const pageTitle = computed(() => {
  return pageTitles[currentPath.value]?.title || 'หน้านี้'
})

const pageDescription = computed(() => {
  return pageTitles[currentPath.value]?.description || 'กำลังพัฒนา'
})
</script>

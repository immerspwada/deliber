<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const expandedFaq = ref<number | null>(null)

// Check if provider route
const isProviderRoute = computed(() => route.path.startsWith('/provider'))

// Customer FAQs
const customerFaqs = [
  {
    question: 'วิธีเรียกรถ',
    answer: 'เปิดแอป > เลือก "เรียกรถ" > ใส่จุดหมาย > เลือกประเภทรถ > กดยืนยัน'
  },
  {
    question: 'วิธีชำระเงิน',
    answer: 'รองรับการชำระเงินด้วยเงินสด, พร้อมเพย์, บัตรเครดิต/เดบิต และ ThaiRide Wallet'
  },
  {
    question: 'วิธียกเลิกการเดินทาง',
    answer: 'กดปุ่ม "ยกเลิก" ในหน้าติดตามการเดินทาง หากคนขับมารับแล้วอาจมีค่าธรรมเนียมยกเลิก'
  },
  {
    question: 'ลืมของไว้ในรถ',
    answer: 'ไปที่ประวัติการเดินทาง > เลือกเที่ยวที่ลืมของ > กด "ติดต่อคนขับ" หรือ "แจ้งปัญหา"'
  },
  {
    question: 'วิธีใช้โค้ดส่วนลด',
    answer: 'ก่อนยืนยันการเดินทาง กดที่ "โปรโมชั่น" > ใส่โค้ด > กด "ใช้"'
  },
  {
    question: 'ปัญหาการชำระเงิน',
    answer: 'ตรวจสอบยอดเงินในบัญชี/บัตร หากยังมีปัญหา ติดต่อฝ่ายสนับสนุน'
  }
]

// Provider FAQs
const providerFaqs = [
  {
    question: 'วิธีเปิด/ปิดรับงาน',
    answer: 'กดปุ่ม "ออนไลน์/ออฟไลน์" ที่หน้าหลัก เมื่อเปิดรับงานระบบจะส่งงานใหม่มาให้อัตโนมัติ'
  },
  {
    question: 'วิธีรับงาน',
    answer: 'เมื่อมีงานใหม่เข้ามา กดปุ่ม "รับงาน" ภายในเวลาที่กำหนด หากไม่กดรับ งานจะถูกส่งต่อให้คนอื่น'
  },
  {
    question: 'วิธีถอนเงิน',
    answer: 'ไปที่หน้ารายได้ > กด "ถอนเงิน" > เลือกบัญชีธนาคาร > ใส่จำนวนเงิน > ยืนยัน'
  },
  {
    question: 'ขั้นต่ำการถอนเงิน',
    answer: 'ถอนขั้นต่ำ 100 บาท ไม่มีค่าธรรมเนียม เงินจะเข้าบัญชีภายใน 1-3 วันทำการ'
  },
  {
    question: 'วิธียกเลิกงาน',
    answer: 'กดปุ่ม "ยกเลิกงาน" และเลือกเหตุผล การยกเลิกบ่อยอาจส่งผลต่อคะแนนและการรับงาน'
  },
  {
    question: 'ปัญหากับผู้โดยสาร',
    answer: 'หากมีปัญหา ให้บันทึกหลักฐานและแจ้งฝ่ายสนับสนุนทันที เราจะช่วยแก้ไขปัญหาให้'
  },
  {
    question: 'อัพเดทเอกสาร',
    answer: 'ไปที่โปรไฟล์ > เอกสาร > ติดต่อฝ่ายสนับสนุนเพื่ออัพเดทเอกสารที่หมดอายุ'
  }
]

const faqs = computed(() => isProviderRoute.value ? providerFaqs : customerFaqs)

const supportOptions = [
  { icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', label: 'โทรหาเรา', desc: '02-xxx-xxxx', action: 'tel:021234567' },
  { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'อีเมล', desc: 'support@thairide.com', action: 'mailto:support@thairide.com' },
  { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'แชทกับเรา', desc: 'ตอบกลับภายใน 5 นาที', action: 'chat' }
]

const toggleFaq = (index: number) => {
  expandedFaq.value = expandedFaq.value === index ? null : index
}

const handleSupport = (action: string) => {
  if (action === 'chat') {
    alert('กำลังเปิดแชท...')
  } else {
    window.location.href = action
  }
}

const goBack = () => router.back()
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>ช่วยเหลือ</h1>
      </div>

      <!-- Support Options -->
      <div class="support-section">
        <h2 class="section-title">ติดต่อเรา</h2>
        <div class="support-grid">
          <button 
            v-for="opt in supportOptions" 
            :key="opt.label"
            @click="handleSupport(opt.action)"
            class="support-card"
          >
            <div class="support-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="opt.icon"/>
              </svg>
            </div>
            <span class="support-label">{{ opt.label }}</span>
            <span class="support-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="faq-section">
        <h2 class="section-title">คำถามที่พบบ่อย</h2>
        <div class="faq-list">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index"
            class="faq-item"
          >
            <button @click="toggleFaq(index)" class="faq-question">
              <span>{{ faq.question }}</span>
              <svg 
                :class="['faq-arrow', { expanded: expandedFaq === index }]"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-if="expandedFaq === index" class="faq-answer">
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </div>

      <!-- Report Issue -->
      <div class="report-section">
        <h2 class="section-title">แจ้งปัญหา</h2>
        <button class="report-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div class="report-text">
            <span class="report-label">แจ้งปัญหาการเดินทาง</span>
            <span class="report-desc">รายงานปัญหาเกี่ยวกับการเดินทางล่าสุด</span>
          </div>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #6B6B6B;
  margin-bottom: 12px;
}

/* Support Section */
.support-section {
  margin-bottom: 24px;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.support-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: #F6F6F6;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 100px;
  transition: all 0.2s ease;
}

.support-card:active {
  transform: scale(0.95);
  background: #EBEBEB;
}

.support-icon {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.support-icon svg {
  width: 22px;
  height: 22px;
}

.support-label {
  font-size: 13px;
  font-weight: 500;
}

.support-desc {
  font-size: 11px;
  color: #6B6B6B;
}

/* FAQ Section */
.faq-section {
  margin-bottom: 24px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.faq-item {
  background: #F6F6F6;
  border-radius: 12px;
  overflow: hidden;
}

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 56px;
  transition: background 0.2s ease;
}

.faq-question:active {
  background: rgba(0,0,0,0.04);
}

.faq-arrow {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
  transition: transform 0.2s;
}

.faq-arrow.expanded {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 16px 14px;
  font-size: 14px;
  color: #6B6B6B;
  line-height: 1.5;
}

/* Report Section */
.report-section {
  margin-bottom: 24px;
}

.report-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: #FEE2E2;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 64px;
  transition: all 0.2s ease;
}

.report-btn:active {
  transform: scale(0.98);
  background: #FECACA;
}

.report-btn > svg:first-child {
  width: 24px;
  height: 24px;
  color: #E11900;
}

.report-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.report-label {
  font-size: 15px;
  font-weight: 500;
  color: #E11900;
}

.report-desc {
  font-size: 12px;
  color: #6B6B6B;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
}
</style>

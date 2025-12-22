/**
 * useMultiLanguage - Multi-language Support
 * Feature: F226 - Multi-language
 */

import { ref, computed } from 'vue'

export type Language = 'th' | 'en' | 'zh' | 'ja'

export interface Translation {
  [key: string]: { th: string; en: string; zh?: string; ja?: string }
}

const translations: Translation = {
  'home': { th: 'หน้าแรก', en: 'Home', zh: '首页', ja: 'ホーム' },
  'ride': { th: 'เรียกรถ', en: 'Ride', zh: '叫车', ja: '配車' },
  'delivery': { th: 'ส่งของ', en: 'Delivery', zh: '配送', ja: '配達' },
  'shopping': { th: 'ซื้อของ', en: 'Shopping', zh: '购物', ja: 'ショッピング' },
  'wallet': { th: 'กระเป๋าเงิน', en: 'Wallet', zh: '钱包', ja: 'ウォレット' },
  'profile': { th: 'โปรไฟล์', en: 'Profile', zh: '个人资料', ja: 'プロフィール' },
  'history': { th: 'ประวัติ', en: 'History', zh: '历史', ja: '履歴' },
  'settings': { th: 'ตั้งค่า', en: 'Settings', zh: '设置', ja: '設定' },
  'logout': { th: 'ออกจากระบบ', en: 'Logout', zh: '退出', ja: 'ログアウト' },
  'cancel': { th: 'ยกเลิก', en: 'Cancel', zh: '取消', ja: 'キャンセル' },
  'confirm': { th: 'ยืนยัน', en: 'Confirm', zh: '确认', ja: '確認' },
  'save': { th: 'บันทึก', en: 'Save', zh: '保存', ja: '保存' },
  'loading': { th: 'กำลังโหลด...', en: 'Loading...', zh: '加载中...', ja: '読み込み中...' },
  'error': { th: 'เกิดข้อผิดพลาด', en: 'Error occurred', zh: '发生错误', ja: 'エラーが発生しました' },
  'success': { th: 'สำเร็จ', en: 'Success', zh: '成功', ja: '成功' },
  'pickup': { th: 'จุดรับ', en: 'Pickup', zh: '上车点', ja: '乗車地点' },
  'dropoff': { th: 'จุดส่ง', en: 'Dropoff', zh: '下车点', ja: '降車地点' },
  'driver': { th: 'คนขับ', en: 'Driver', zh: '司机', ja: 'ドライバー' },
  'fare': { th: 'ค่าโดยสาร', en: 'Fare', zh: '费用', ja: '料金' },
  'rating': { th: 'คะแนน', en: 'Rating', zh: '评分', ja: '評価' }
}

export function useMultiLanguage() {
  const currentLang = ref<Language>('th')
  const availableLanguages = ref<{ code: Language; name: string; nativeName: string }[]>([
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' }
  ])

  const t = (key: string): string => {
    const trans = translations[key]
    if (!trans) return key
    return trans[currentLang.value] || trans.th || key
  }

  const setLanguage = (lang: Language) => {
    currentLang.value = lang
    localStorage.setItem('app_language', lang)
    document.documentElement.lang = lang
  }

  const initLanguage = () => {
    const saved = localStorage.getItem('app_language') as Language
    if (saved && availableLanguages.value.some(l => l.code === saved)) {
      currentLang.value = saved
    }
  }

  const getCurrentLanguageName = computed(() => availableLanguages.value.find(l => l.code === currentLang.value)?.nativeName || 'ไทย')

  return { currentLang, availableLanguages, t, setLanguage, initLanguage, getCurrentLanguageName }
}

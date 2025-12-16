/**
 * Simple i18n composable for Thai Ride App
 * Supports Thai (th) and English (en)
 */

import { ref, computed } from 'vue'

export type Locale = 'th' | 'en'

// Translations
const translations: Record<Locale, Record<string, string>> = {
  th: {
    // Common
    'common.loading': 'กำลังโหลด...',
    'common.error': 'เกิดข้อผิดพลาด',
    'common.retry': 'ลองอีกครั้ง',
    'common.cancel': 'ยกเลิก',
    'common.confirm': 'ยืนยัน',
    'common.save': 'บันทึก',
    'common.delete': 'ลบ',
    'common.edit': 'แก้ไข',
    'common.close': 'ปิด',
    'common.back': 'กลับ',
    'common.next': 'ถัดไป',
    'common.done': 'เสร็จสิ้น',
    'common.skip': 'ข้าม',
    'common.search': 'ค้นหา',
    'common.noData': 'ไม่มีข้อมูล',
    
    // Provider Dashboard
    'provider.online': 'ออนไลน์',
    'provider.offline': 'ออฟไลน์',
    'provider.readyToWork': 'พร้อมรับงาน',
    'provider.turnOnToWork': 'เปิดเพื่อเริ่มรับงาน',
    'provider.todayEarnings': 'รายได้วันนี้',
    'provider.todayTrips': 'เที่ยววันนี้',
    'provider.averageRating': 'คะแนนเฉลี่ย',
    'provider.pendingRequests': 'งานที่รอรับ',
    'provider.youAreOffline': 'คุณออฟไลน์อยู่',
    'provider.turnOnToReceive': 'เปิดสถานะออนไลน์เพื่อเริ่มรับงาน',
    'provider.noRequestsNow': 'ยังไม่มีงานในขณะนี้',
    'provider.pleaseWait': 'รอสักครู่...',
    
    // Ride Request
    'ride.accept': 'รับงาน',
    'ride.decline': 'ปฏิเสธ',
    'ride.standard': 'Standard',
    'ride.premium': 'Premium',
    'ride.shared': 'Shared',
    'ride.pickup': 'จุดรับ',
    'ride.destination': 'จุดหมาย',
    'ride.distance': 'ระยะทาง',
    'ride.duration': 'เวลา',
    'ride.fare': 'ค่าโดยสาร',
    'ride.km': 'กม.',
    'ride.min': 'นาที',
    
    // Active Ride Status
    'status.matched': 'รับงานแล้ว',
    'status.arriving': 'กำลังไปรับ',
    'status.arrived': 'ถึงจุดรับแล้ว',
    'status.pickedUp': 'รับผู้โดยสารแล้ว',
    'status.inProgress': 'กำลังเดินทาง',
    'status.completed': 'เสร็จสิ้น',
    
    // Actions
    'action.startPickup': 'เริ่มไปรับผู้โดยสาร',
    'action.arrivedPickup': 'ถึงจุดรับแล้ว',
    'action.passengerPickedUp': 'รับผู้โดยสารแล้ว',
    'action.startTrip': 'เริ่มเดินทาง',
    'action.arrivedDestination': 'ถึงจุดหมายแล้ว',
    'action.navigate': 'นำทาง',
    'action.call': 'โทร',
    'action.chat': 'แชท',
    
    // Rating
    'rating.ratePassenger': 'ให้คะแนน',
    'rating.tripCompleted': 'เสร็จสิ้นการเดินทาง',
    'rating.earnings': 'รายได้',
    'rating.addComment': 'เพิ่มความคิดเห็น (ไม่บังคับ)',
    'rating.submit': 'ส่งคะแนน',
    'rating.veryBad': 'แย่มาก',
    'rating.bad': 'ไม่ดี',
    'rating.okay': 'พอใช้',
    'rating.good': 'ดี',
    'rating.excellent': 'ดีมาก',
    
    // Earnings
    'earnings.title': 'รายได้',
    'earnings.today': 'วันนี้',
    'earnings.thisWeek': 'สัปดาห์นี้',
    'earnings.thisMonth': 'เดือนนี้',
    'earnings.trips': 'เที่ยว',
    'earnings.dailyEarnings': 'รายได้รายวัน',
    'earnings.tripsThisMonth': 'เที่ยวเดือนนี้',
    'earnings.avgPerTrip': 'เฉลี่ย/เที่ยว',
    'earnings.summary': 'สรุปรายได้',
    'earnings.availableBalance': 'ยอดเงินคงเหลือ',
    'earnings.pendingWithdrawal': 'รอถอน',
    'earnings.withdraw': 'ถอนเงิน',
    
    // History
    'history.title': 'ประวัติงาน',
    'history.noHistory': 'ยังไม่มีประวัติงาน',
    'history.completedWillShow': 'เมื่อคุณทำงานเสร็จ จะแสดงที่นี่',
    
    // Profile
    'profile.title': 'โปรไฟล์',
    'profile.driver': 'คนขับรถ',
    'profile.rider': 'ไรเดอร์',
    'profile.totalTrips': 'เที่ยวทั้งหมด',
    'profile.accountStatus': 'สถานะบัญชี',
    'profile.verified': 'ยืนยันแล้ว',
    'profile.pending': 'รอยืนยัน',
    'profile.contactInfo': 'ข้อมูลติดต่อ',
    'profile.vehicleInfo': 'ข้อมูลยานพาหนะ',
    'profile.vehicleType': 'ประเภท',
    'profile.licensePlate': 'ทะเบียน',
    'profile.color': 'สี',
    'profile.logout': 'ออกจากระบบ',
    
    // Navigation
    'nav.work': 'งาน',
    'nav.earnings': 'รายได้',
    'nav.history': 'ประวัติ',
    'nav.profile': 'โปรไฟล์',
    
    // GPS
    'gps.enableGPS': 'กรุณาเปิด GPS เพื่อรับงาน',
    'gps.locating': 'กำลังระบุตำแหน่ง...',
    'gps.locationError': 'ไม่สามารถระบุตำแหน่งได้'
  },
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',
    'common.skip': 'Skip',
    'common.search': 'Search',
    'common.noData': 'No data',
    
    // Provider Dashboard
    'provider.online': 'Online',
    'provider.offline': 'Offline',
    'provider.readyToWork': 'Ready to work',
    'provider.turnOnToWork': 'Turn on to start working',
    'provider.todayEarnings': "Today's earnings",
    'provider.todayTrips': "Today's trips",
    'provider.averageRating': 'Average rating',
    'provider.pendingRequests': 'Pending requests',
    'provider.youAreOffline': "You're offline",
    'provider.turnOnToReceive': 'Turn on to start receiving requests',
    'provider.noRequestsNow': 'No requests at the moment',
    'provider.pleaseWait': 'Please wait...',
    
    // Ride Request
    'ride.accept': 'Accept',
    'ride.decline': 'Decline',
    'ride.standard': 'Standard',
    'ride.premium': 'Premium',
    'ride.shared': 'Shared',
    'ride.pickup': 'Pickup',
    'ride.destination': 'Destination',
    'ride.distance': 'Distance',
    'ride.duration': 'Duration',
    'ride.fare': 'Fare',
    'ride.km': 'km',
    'ride.min': 'min',
    
    // Active Ride Status
    'status.matched': 'Matched',
    'status.arriving': 'Arriving',
    'status.arrived': 'Arrived at pickup',
    'status.pickedUp': 'Passenger picked up',
    'status.inProgress': 'In progress',
    'status.completed': 'Completed',
    
    // Actions
    'action.startPickup': 'Start pickup',
    'action.arrivedPickup': 'Arrived at pickup',
    'action.passengerPickedUp': 'Passenger picked up',
    'action.startTrip': 'Start trip',
    'action.arrivedDestination': 'Arrived at destination',
    'action.navigate': 'Navigate',
    'action.call': 'Call',
    'action.chat': 'Chat',
    
    // Rating
    'rating.ratePassenger': 'Rate',
    'rating.tripCompleted': 'Trip completed',
    'rating.earnings': 'Earnings',
    'rating.addComment': 'Add comment (optional)',
    'rating.submit': 'Submit rating',
    'rating.veryBad': 'Very bad',
    'rating.bad': 'Bad',
    'rating.okay': 'Okay',
    'rating.good': 'Good',
    'rating.excellent': 'Excellent',
    
    // Earnings
    'earnings.title': 'Earnings',
    'earnings.today': 'Today',
    'earnings.thisWeek': 'This week',
    'earnings.thisMonth': 'This month',
    'earnings.trips': 'trips',
    'earnings.dailyEarnings': 'Daily earnings',
    'earnings.tripsThisMonth': 'Trips this month',
    'earnings.avgPerTrip': 'Avg per trip',
    'earnings.summary': 'Earnings summary',
    'earnings.availableBalance': 'Available balance',
    'earnings.pendingWithdrawal': 'Pending withdrawal',
    'earnings.withdraw': 'Withdraw',
    
    // History
    'history.title': 'History',
    'history.noHistory': 'No history yet',
    'history.completedWillShow': 'Completed trips will appear here',
    
    // Profile
    'profile.title': 'Profile',
    'profile.driver': 'Driver',
    'profile.rider': 'Rider',
    'profile.totalTrips': 'Total trips',
    'profile.accountStatus': 'Account status',
    'profile.verified': 'Verified',
    'profile.pending': 'Pending',
    'profile.contactInfo': 'Contact info',
    'profile.vehicleInfo': 'Vehicle info',
    'profile.vehicleType': 'Type',
    'profile.licensePlate': 'License plate',
    'profile.color': 'Color',
    'profile.logout': 'Logout',
    
    // Navigation
    'nav.work': 'Work',
    'nav.earnings': 'Earnings',
    'nav.history': 'History',
    'nav.profile': 'Profile',
    
    // GPS
    'gps.enableGPS': 'Please enable GPS to receive requests',
    'gps.locating': 'Locating...',
    'gps.locationError': 'Unable to determine location'
  }
}

// Current locale
const currentLocale = ref<Locale>((localStorage.getItem('locale') as Locale) || 'th')

export function useI18n() {
  // Get translation
  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[currentLocale.value][key] || key
    
    // Replace params
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    
    return text
  }
  
  // Set locale
  const setLocale = (locale: Locale) => {
    currentLocale.value = locale
    localStorage.setItem('locale', locale)
  }
  
  // Get current locale
  const locale = computed(() => currentLocale.value)
  
  // Available locales
  const availableLocales: { code: Locale; name: string }[] = [
    { code: 'th', name: 'ไทย' },
    { code: 'en', name: 'English' }
  ]
  
  return {
    t,
    locale,
    setLocale,
    availableLocales
  }
}

/**
 * Feature: F51 - Receipt Generator
 * 
 * ระบบสร้างใบเสร็จ
 * - สร้างใบเสร็จจากข้อมูลการเดินทาง
 * - รองรับ PDF export
 * - ส่งใบเสร็จทาง email
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface ReceiptData {
  receiptNumber: string
  date: Date
  customerName: string
  customerPhone?: string
  
  // Trip details
  pickupAddress: string
  destinationAddress: string
  pickupTime: Date
  dropoffTime: Date
  distance: number
  duration: number
  
  // Driver details
  driverName: string
  vehicleModel: string
  licensePlate: string
  
  // Fare breakdown
  baseFare: number
  distanceFare: number
  timeFare: number
  surgeFare: number
  discount: number
  promoCode?: string
  total: number
  
  // Payment
  paymentMethod: string
  paymentStatus: 'paid' | 'pending' | 'failed'
  
  // Service type
  serviceType: 'ride' | 'delivery' | 'shopping'
  rideType?: 'standard' | 'premium' | 'shared'
}

export function useReceipt() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Generate receipt number
  const generateReceiptNumber = (): string => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `RCP-${year}${month}${day}-${random}`
  }

  // Generate receipt from ride request
  const generateFromRide = async (rideId: string): Promise<ReceiptData | null> => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        // Demo data
        return {
          receiptNumber: generateReceiptNumber(),
          date: new Date(),
          customerName: 'ผู้ใช้ทดสอบ',
          customerPhone: '081-xxx-xxxx',
          pickupAddress: 'สยามพารากอน, ปทุมวัน',
          destinationAddress: 'เซ็นทรัลเวิลด์, ปทุมวัน',
          pickupTime: new Date(Date.now() - 30 * 60000),
          dropoffTime: new Date(),
          distance: 2.5,
          duration: 15,
          driverName: 'สมชาย ใจดี',
          vehicleModel: 'Toyota Camry',
          licensePlate: 'กข 1234',
          baseFare: 35,
          distanceFare: 20,
          timeFare: 30,
          surgeFare: 0,
          discount: 0,
          total: 85,
          paymentMethod: 'เงินสด',
          paymentStatus: 'paid',
          serviceType: 'ride',
          rideType: 'standard'
        }
      }

      const { data: ride, error: fetchError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          users!ride_requests_user_id_fkey(full_name, phone),
          service_providers!ride_requests_provider_id_fkey(
            users(full_name),
            vehicle_model,
            license_plate
          )
        `)
        .eq('id', rideId)
        .single()

      if (fetchError) throw fetchError
      if (!ride) throw new Error('ไม่พบข้อมูลการเดินทาง')

      const rideData = ride as any

      const receipt: ReceiptData = {
        receiptNumber: generateReceiptNumber(),
        date: new Date(),
        customerName: rideData.users?.full_name || 'ไม่ระบุ',
        customerPhone: rideData.users?.phone,
        pickupAddress: rideData.pickup_address || 'ไม่ระบุ',
        destinationAddress: rideData.destination_address || 'ไม่ระบุ',
        pickupTime: new Date(rideData.pickup_time || rideData.created_at),
        dropoffTime: new Date(rideData.completed_at || new Date()),
        distance: rideData.distance || 0,
        duration: rideData.duration || 0,
        driverName: rideData.service_providers?.users?.full_name || 'ไม่ระบุ',
        vehicleModel: rideData.service_providers?.vehicle_model || 'ไม่ระบุ',
        licensePlate: rideData.service_providers?.license_plate || 'ไม่ระบุ',
        baseFare: rideData.base_fare || 35,
        distanceFare: rideData.distance_fare || 0,
        timeFare: rideData.time_fare || 0,
        surgeFare: rideData.surge_fare || 0,
        discount: rideData.discount || 0,
        promoCode: rideData.promo_code,
        total: rideData.total_fare || 0,
        paymentMethod: rideData.payment_method || 'เงินสด',
        paymentStatus: rideData.payment_status || 'paid',
        serviceType: 'ride',
        rideType: rideData.ride_type || 'standard'
      }

      return receipt
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Format receipt for display
  const formatReceipt = (receipt: ReceiptData): string => {
    const lines = [
      '================================',
      '         THAI RIDE APP          ',
      '================================',
      '',
      `ใบเสร็จ: ${receipt.receiptNumber}`,
      `วันที่: ${formatDate(receipt.date)}`,
      '',
      '--------------------------------',
      'รายละเอียดการเดินทาง',
      '--------------------------------',
      `จุดรับ: ${receipt.pickupAddress}`,
      `จุดหมาย: ${receipt.destinationAddress}`,
      `เวลารับ: ${formatTime(receipt.pickupTime)}`,
      `เวลาส่ง: ${formatTime(receipt.dropoffTime)}`,
      `ระยะทาง: ${receipt.distance} กม.`,
      `ระยะเวลา: ${receipt.duration} นาที`,
      '',
      '--------------------------------',
      'ข้อมูลคนขับ',
      '--------------------------------',
      `ชื่อ: ${receipt.driverName}`,
      `รถ: ${receipt.vehicleModel}`,
      `ทะเบียน: ${receipt.licensePlate}`,
      '',
      '--------------------------------',
      'รายละเอียดค่าโดยสาร',
      '--------------------------------',
      `ค่าโดยสารพื้นฐาน:     ฿${receipt.baseFare}`,
      `ค่าระยะทาง:           ฿${receipt.distanceFare}`,
      `ค่าเวลา:              ฿${receipt.timeFare}`,
    ]

    if (receipt.surgeFare > 0) {
      lines.push(`ค่าช่วงเร่งด่วน:       +฿${receipt.surgeFare}`)
    }

    if (receipt.discount > 0) {
      lines.push(`ส่วนลด${receipt.promoCode ? ` (${receipt.promoCode})` : ''}:        -฿${receipt.discount}`)
    }

    lines.push(
      '--------------------------------',
      `รวมทั้งหมด:           ฿${receipt.total}`,
      '================================',
      '',
      `ชำระโดย: ${receipt.paymentMethod}`,
      `สถานะ: ${receipt.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}`,
      '',
      '================================',
      '    ขอบคุณที่ใช้บริการ Thai Ride',
      '================================'
    )

    return lines.join('\n')
  }

  // Format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Format time
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Generate HTML receipt
  const generateHTMLReceipt = (receipt: ReceiptData): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ใบเสร็จ - ${receipt.receiptNumber}</title>
  <style>
    body { font-family: 'Sarabun', sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .receipt-no { color: #666; font-size: 14px; }
    .section { margin: 16px 0; padding: 12px 0; border-top: 1px solid #e5e5e5; }
    .section-title { font-weight: bold; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; }
    .total { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>THAI RIDE</h1>
    <div class="receipt-no">ใบเสร็จ: ${receipt.receiptNumber}</div>
    <div>${formatDate(receipt.date)}</div>
  </div>
  
  <div class="section">
    <div class="section-title">รายละเอียดการเดินทาง</div>
    <div class="row"><span>จุดรับ:</span><span>${receipt.pickupAddress}</span></div>
    <div class="row"><span>จุดหมาย:</span><span>${receipt.destinationAddress}</span></div>
    <div class="row"><span>ระยะทาง:</span><span>${receipt.distance} กม.</span></div>
    <div class="row"><span>ระยะเวลา:</span><span>${receipt.duration} นาที</span></div>
  </div>
  
  <div class="section">
    <div class="section-title">ข้อมูลคนขับ</div>
    <div class="row"><span>ชื่อ:</span><span>${receipt.driverName}</span></div>
    <div class="row"><span>รถ:</span><span>${receipt.vehicleModel}</span></div>
    <div class="row"><span>ทะเบียน:</span><span>${receipt.licensePlate}</span></div>
  </div>
  
  <div class="section">
    <div class="section-title">รายละเอียดค่าโดยสาร</div>
    <div class="row"><span>ค่าโดยสารพื้นฐาน</span><span>฿${receipt.baseFare}</span></div>
    <div class="row"><span>ค่าระยะทาง</span><span>฿${receipt.distanceFare}</span></div>
    <div class="row"><span>ค่าเวลา</span><span>฿${receipt.timeFare}</span></div>
    ${receipt.surgeFare > 0 ? `<div class="row"><span>ค่าช่วงเร่งด่วน</span><span>+฿${receipt.surgeFare}</span></div>` : ''}
    ${receipt.discount > 0 ? `<div class="row"><span>ส่วนลด</span><span>-฿${receipt.discount}</span></div>` : ''}
    <div class="row total"><span>รวมทั้งหมด</span><span>฿${receipt.total}</span></div>
  </div>
  
  <div class="section">
    <div class="row"><span>ชำระโดย:</span><span>${receipt.paymentMethod}</span></div>
    <div class="row"><span>สถานะ:</span><span>${receipt.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}</span></div>
  </div>
  
  <div class="footer">
    <p>ขอบคุณที่ใช้บริการ Thai Ride</p>
    <p>หากมีข้อสงสัย กรุณาติดต่อ support@thairide.com</p>
  </div>
</body>
</html>
    `
  }

  // Download receipt as text file
  const downloadReceipt = (receipt: ReceiptData) => {
    const content = formatReceipt(receipt)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${receipt.receiptNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download HTML receipt
  const downloadHTMLReceipt = (receipt: ReceiptData) => {
    const content = generateHTMLReceipt(receipt)
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${receipt.receiptNumber}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Print receipt
  const printReceipt = (receipt: ReceiptData) => {
    const content = generateHTMLReceipt(receipt)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Share receipt
  const shareReceipt = async (receipt: ReceiptData) => {
    const text = formatReceipt(receipt)
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ใบเสร็จ ${receipt.receiptNumber}`,
          text: text
        })
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text)
    }
  }

  return {
    loading,
    error,
    generateReceiptNumber,
    generateFromRide,
    formatReceipt,
    generateHTMLReceipt,
    downloadReceipt,
    downloadHTMLReceipt,
    printReceipt,
    shareReceipt,
    formatDate,
    formatTime
  }
}

/**
 * 🚨 IMMEDIATE FIX: Rider Job Visibility Issue
 * 
 * ปัญหา: ไรเดอร์ไม่เห็นงานจากลูกค้า
 * สาเหตุ: Docker/Supabase local ไม่ทำงาน
 * 
 * วิธีใช้:
 * 1. เปิด Browser Console (F12)
 * 2. Copy & Paste โค้ดนี้ทั้งหมด
 * 3. กด Enter
 * 4. ระบบจะเปลี่ยนเป็น Mock Mode ทันที
 */

console.log('🔧 Starting Immediate Fix for Rider Job Visibility...')

// Mock job data for testing
const MOCK_JOBS = [
  {
    id: 'mock-1',
    tracking_id: 'MOCK-001',
    user_id: 'customer-1',
    status: 'pending',
    pickup_lat: 13.7563,
    pickup_lng: 100.5018,
    pickup_address: 'สยามพารากอน กรุงเทพฯ',
    destination_lat: 13.7467,
    destination_lng: 100.5342,
    destination_address: 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
    estimated_fare: 150,
    created_at: new Date().toISOString(),
    type: 'ride',
    distance: 1.2,
    customer: {
      id: 'customer-1',
      first_name: 'สมชาย',
      last_name: 'ใจดี',
      phone_number: '081-234-5678'
    }
  },
  {
    id: 'mock-2',
    tracking_id: 'MOCK-002',
    user_id: 'customer-2',
    status: 'pending',
    pickup_lat: 13.7308,
    pickup_lng: 100.5418,
    pickup_address: 'ห้างสรรพสินค้าเอ็มบีเค',
    destination_lat: 13.7650,
    destination_lng: 100.5380,
    destination_address: 'สถานีรถไฟฟ้าชิดลม',
    estimated_fare: 120,
    created_at: new Date(Date.now() - 30000).toISOString(),
    type: 'ride',
    distance: 2.1,
    customer: {
      id: 'customer-2',
      first_name: 'สมหญิง',
      last_name: 'รักสะอาด',
      phone_number: '082-345-6789'
    }
  },
  {
    id: 'mock-3',
    tracking_id: 'MOCK-003',
    user_id: 'customer-3',
    status: 'pending',
    pickup_lat: 13.7441,
    pickup_lng: 100.5325,
    pickup_address: 'สถานีรถไฟฟ้าราชเทวี',
    destination_lat: 13.7200,
    destination_lng: 100.5150,
    destination_address: 'สนามบินน้ำ',
    estimated_fare: 200,
    created_at: new Date(Date.now() - 60000).toISOString(),
    type: 'ride',
    distance: 3.5,
    customer: {
      id: 'customer-3',
      first_name: 'นายแสง',
      last_name: 'ใสใจ',
      phone_number: '083-456-7890'
    }
  }
]

// Function to inject mock jobs into Vue app
function injectMockJobs() {
  // Try to find Vue app instance
  const app = document.querySelector('#app').__vueParentComponent
  
  if (app) {
    console.log('✅ Found Vue app, injecting mock jobs...')
    
    // Find provider job pool composable
    const providerJobPool = app.ctx?.availableJobs || app.setupState?.availableJobs
    
    if (providerJobPool) {
      providerJobPool.value = MOCK_JOBS
      console.log('✅ Mock jobs injected successfully!')
      console.log('📍 Available jobs:', MOCK_JOBS.length)
      
      // Show notification
      showNotification('🎉 Mock Mode เปิดใช้งานแล้ว! พบงาน ' + MOCK_JOBS.length + ' งาน')
      
      return true
    }
  }
  
  return false
}

// Function to show notification
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div')
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `
  
  // Add animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `
  document.head.appendChild(style)
  
  notification.textContent = message
  document.body.appendChild(notification)
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.remove()
  }, 5000)
}

// Function to override Supabase calls with mock data
function enableMockMode() {
  console.log('🔄 Enabling Mock Mode...')
  
  // Override global supabase if available
  if (window.supabase) {
    const originalFrom = window.supabase.from
    
    window.supabase.from = function(table) {
      const originalQuery = originalFrom.call(this, table)
      
      if (table === 'ride_requests') {
        // Override select method for ride_requests
        const originalSelect = originalQuery.select
        originalQuery.select = function() {
          console.log('🎭 Mock: Intercepting ride_requests query')
          
          return {
            eq: () => this,
            is: () => this,
            order: () => this,
            limit: () => this,
            then: (callback) => {
              console.log('🎭 Mock: Returning mock jobs')
              callback({ data: MOCK_JOBS, error: null })
            }
          }
        }
      }
      
      return originalQuery
    }
    
    console.log('✅ Supabase mock mode enabled')
  }
  
  // Try to inject into existing Vue components
  setTimeout(() => {
    injectMockJobs()
  }, 1000)
  
  // Add mock job generator
  let mockJobCounter = 4
  setInterval(() => {
    if (Math.random() > 0.7) { // 30% chance every 10 seconds
      const newJob = {
        id: `mock-${mockJobCounter}`,
        tracking_id: `MOCK-${String(mockJobCounter).padStart(3, '0')}`,
        user_id: `customer-${mockJobCounter}`,
        status: 'pending',
        pickup_lat: 13.7563 + (Math.random() - 0.5) * 0.1,
        pickup_lng: 100.5018 + (Math.random() - 0.5) * 0.1,
        pickup_address: `สถานที่รับ ${mockJobCounter}`,
        destination_lat: 13.7467 + (Math.random() - 0.5) * 0.1,
        destination_lng: 100.5342 + (Math.random() - 0.5) * 0.1,
        destination_address: `สถานที่ส่ง ${mockJobCounter}`,
        estimated_fare: Math.floor(Math.random() * 200) + 100,
        created_at: new Date().toISOString(),
        type: 'ride',
        distance: Math.random() * 5 + 0.5,
        customer: {
          id: `customer-${mockJobCounter}`,
          first_name: `ลูกค้า${mockJobCounter}`,
          last_name: 'ทดสอบ',
          phone_number: `08${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
        }
      }
      
      console.log('🆕 New mock job generated:', newJob.tracking_id)
      MOCK_JOBS.unshift(newJob)
      
      // Keep only latest 10 jobs
      if (MOCK_JOBS.length > 10) {
        MOCK_JOBS.pop()
      }
      
      // Try to update Vue component
      injectMockJobs()
      
      mockJobCounter++
    }
  }, 10000) // Every 10 seconds
}

// Function to add debug panel
function addDebugPanel() {
  const panel = document.createElement('div')
  panel.id = 'debug-panel'
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 15px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    max-width: 300px;
    border: 1px solid #333;
  `
  
  panel.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold; color: #10b981;">
      🔧 Debug Panel - Mock Mode
    </div>
    <div>Jobs Available: <span id="job-count">${MOCK_JOBS.length}</span></div>
    <div>Status: <span style="color: #10b981;">Active</span></div>
    <div style="margin-top: 10px;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
        Close
      </button>
    </div>
  `
  
  document.body.appendChild(panel)
  
  // Update job count periodically
  setInterval(() => {
    const jobCountEl = document.getElementById('job-count')
    if (jobCountEl) {
      jobCountEl.textContent = MOCK_JOBS.length
    }
  }, 1000)
}

// Main execution
try {
  console.log('🚀 Initializing Mock Mode for Provider Jobs...')
  
  // Enable mock mode
  enableMockMode()
  
  // Add debug panel
  addDebugPanel()
  
  // Show success message
  showNotification('🎉 Mock Mode เปิดใช้งานสำเร็จ! ระบบจะแสดงงาน Mock')
  
  console.log('✅ Mock Mode Setup Complete!')
  console.log('📋 Instructions:')
  console.log('   1. ไปที่หน้า Provider Dashboard')
  console.log('   2. ควรเห็นงาน Mock ขึ้นมา')
  console.log('   3. งานใหม่จะเพิ่มทุก 10 วินาที')
  console.log('   4. ใช้ Debug Panel ด้านล่างซ้ายเพื่อตรวจสอบ')
  
} catch (error) {
  console.error('❌ Mock Mode Setup Failed:', error)
  showNotification('❌ ไม่สามารถเปิด Mock Mode ได้: ' + error.message)
}

// Export for manual use
window.mockJobSystem = {
  jobs: MOCK_JOBS,
  addJob: (job) => MOCK_JOBS.unshift(job),
  clearJobs: () => MOCK_JOBS.length = 0,
  injectJobs: injectMockJobs
}

console.log('💡 Tip: ใช้ window.mockJobSystem เพื่อจัดการงาน Mock ด้วยตนเอง')
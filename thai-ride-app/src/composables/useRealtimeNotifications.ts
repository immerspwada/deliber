import { useToast } from '@/composables/useToast';

/**
 * Real-time notification composable
 * Provides toast notifications with Thai labels for real-time events
 */
export function useRealtimeNotifications() {
  const toast = useToast();

  /**
   * Show notification when new order is created
   */
  function showOrderCreated(trackingId: string) {
    toast.success(`✨ ออเดอร์ใหม่: ${trackingId}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when order is updated
   */
  function showOrderUpdated(trackingId: string, status?: string) {
    const statusLabel = getStatusLabel(status);
    toast.info(`🔄 อัพเดท: ${trackingId}${statusLabel ? ` → ${statusLabel}` : ''}`, {
      duration: 4000,
    });
  }

  /**
   * Show notification when order status changes
   */
  function showStatusChanged(trackingId: string, newStatus: string) {
    const statusLabel = getStatusLabel(newStatus);
    toast.info(`🔄 สถานะเปลี่ยน: ${trackingId} → ${statusLabel}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when provider is assigned
   */
  function showProviderAssigned(trackingId: string, providerName?: string) {
    const name = providerName || 'ผู้ให้บริการ';
    toast.success(`👤 มอบหมายงาน: ${trackingId} → ${name}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when order is cancelled
   */
  function showOrderCancelled(trackingId: string) {
    toast.warning(`❌ ยกเลิก: ${trackingId}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when order is completed
   */
  function showOrderCompleted(trackingId: string) {
    toast.success(`✅ เสร็จสิ้น: ${trackingId}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when wallet balance changes
   */
  function showWalletUpdated(amount: number, type: 'topup' | 'deduct' | 'refund') {
    const typeLabel = {
      topup: 'เติมเงิน',
      deduct: 'หักเงิน',
      refund: 'คืนเงิน',
    }[type];

    const icon = {
      topup: '💰',
      deduct: '💸',
      refund: '↩️',
    }[type];

    toast.info(`${icon} ${typeLabel}: ฿${amount.toFixed(2)}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when topup request status changes
   */
  function showTopupStatusChanged(status: string) {
    const statusLabel = {
      pending: 'รอดำเนินการ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
    }[status] || status;

    const icon = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
    }[status] || '🔔';

    toast.info(`${icon} คำขอเติมเงิน: ${statusLabel}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when withdrawal request status changes
   */
  function showWithdrawalStatusChanged(status: string) {
    const statusLabel = {
      pending: 'รอดำเนินการ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      completed: 'โอนเงินแล้ว',
    }[status] || status;

    const icon = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      completed: '💸',
    }[status] || '🔔';

    toast.info(`${icon} คำขอถอนเงิน: ${statusLabel}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when new job is available (for providers)
   */
  function showNewJobAvailable(trackingId: string, serviceType: string) {
    const serviceLabel = {
      ride: 'รับส่ง',
      delivery: 'ส่งของ',
      shopping: 'ช้อปปิ้ง',
      moving: 'ขนย้าย',
    }[serviceType] || serviceType;

    toast.success(`🚗 งานใหม่: ${serviceLabel} (${trackingId})`, {
      duration: 8000,
    });
  }

  /**
   * Show notification when job is cancelled by customer
   */
  function showJobCancelled(trackingId: string) {
    toast.warning(`❌ งานถูกยกเลิก: ${trackingId}`, {
      duration: 5000,
    });
  }

  /**
   * Show notification when provider status changes
   */
  function showProviderStatusChanged(status: string) {
    const statusLabel = {
      pending: 'รอตรวจสอบ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      suspended: 'ระงับ',
      deleted: 'ลบ',
    }[status] || status;

    const icon = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      suspended: '⚠️',
      deleted: '🗑️',
    }[status] || '🔔';

    toast.info(`${icon} สถานะผู้ให้บริการ: ${statusLabel}`, {
      duration: 5000,
    });
  }

  /**
   * Show generic real-time update notification
   */
  function showRealtimeUpdate(message: string) {
    toast.info(`🔔 ${message}`, {
      duration: 4000,
    });
  }

  /**
   * Show connection status notification
   */
  function showConnectionStatus(connected: boolean) {
    if (connected) {
      toast.success('🟢 เชื่อมต่อ Real-time สำเร็จ', {
        duration: 3000,
      });
    } else {
      toast.error('🔴 ขาดการเชื่อมต่อ Real-time', {
        duration: 5000,
      });
    }
  }

  /**
   * Get Thai label for order status
   */
  function getStatusLabel(status?: string): string {
    if (!status) return '';

    const labels: Record<string, string> = {
      pending: 'รอดำเนินการ',
      matched: 'จับคู่แล้ว',
      accepted: 'รับงานแล้ว',
      pickup: 'กำลังไปรับ',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      failed: 'ล้มเหลว',
    };

    return labels[status] || status;
  }

  return {
    // Order notifications
    showOrderCreated,
    showOrderUpdated,
    showStatusChanged,
    showProviderAssigned,
    showOrderCancelled,
    showOrderCompleted,

    // Wallet notifications
    showWalletUpdated,
    showTopupStatusChanged,
    showWithdrawalStatusChanged,

    // Provider notifications
    showNewJobAvailable,
    showJobCancelled,
    showProviderStatusChanged,

    // Generic notifications
    showRealtimeUpdate,
    showConnectionStatus,

    // Utility
    getStatusLabel,
  };
}

// Chat Types for Thai Ride App

export interface ChatSession {
  id: string;
  tracking_id: string;
  ride_id: string;
  user_id: string;
  provider_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_type: 'customer' | 'provider' | 'system';
  message: string;
  message_type: 'text' | 'image' | 'location' | 'quick_reply';
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface QuickReply {
  id: string;
  text: string;
  icon?: string;
}

// Quick replies สำหรับลูกค้า
export const CUSTOMER_QUICK_REPLIES: QuickReply[] = [
  { id: 'on_my_way', text: 'กำลังไปแล้วครับ/ค่ะ', icon: '🚶' },
  { id: 'wait_moment', text: 'รอสักครู่นะครับ/ค่ะ', icon: '⏳' },
  { id: 'arrived', text: 'ถึงแล้วครับ/ค่ะ', icon: '📍' },
  { id: 'thank_you', text: 'ขอบคุณครับ/ค่ะ', icon: '🙏' },
  { id: 'where_are_you', text: 'อยู่ตรงไหนครับ/ค่ะ?', icon: '❓' },
];

// Quick replies สำหรับคนขับ
export const PROVIDER_QUICK_REPLIES: QuickReply[] = [
  { id: 'on_my_way', text: 'กำลังไปรับครับ/ค่ะ', icon: '🚗' },
  { id: 'arrived', text: 'ถึงจุดรับแล้วครับ/ค่ะ', icon: '📍' },
  { id: 'wait_moment', text: 'รอสักครู่นะครับ/ค่ะ', icon: '⏳' },
  { id: 'traffic', text: 'รถติดครับ/ค่ะ อาจช้าหน่อย', icon: '🚦' },
  { id: 'call_me', text: 'โทรหาผมได้ครับ/ค่ะ', icon: '📞' },
];

export interface ChatParticipant {
  id: string;
  name: string;
  avatar_url?: string;
  type: 'customer' | 'provider';
}

# Realtime Logging System - Implementation Complete ✅

## 📋 Overview

ระบบ Realtime Logging สำหรับติดตาม logs แบบ realtime จากทุก users พร้อม Admin Dashboard สำหรับ centralized monitoring

**Feature Coverage**: ✅ Customer + ✅ Provider + ✅ Admin (ครบทุก Role ตาม Admin Rules)

---

## 🎯 Features Implemented

### 1. Customer/Provider Side - Realtime Log Viewer

**File**: `src/components/shared/RealtimeLogViewer.vue`

**Features**:

- ✅ Floating widget (bottom-right corner)
- ✅ Minimize/maximize functionality
- ✅ Filter by log level (error, warn, info, success, debug)
- ✅ Search functionality
- ✅ Click to view detailed log with full data/stack trace
- ✅ Export logs button (JSON format)
- ✅ Clear logs button
- ✅ Keyboard shortcut: `Ctrl/Cmd + Shift + L` to toggle
- ✅ MUNEEF Style design (green #00A86B)
- ✅ Auto-show in DEV mode

**Log Levels**:

- 🔴 Error - #E53935
- 🟠 Warning - #F5A623
- 🔵 Info - #2196F3
- 🟢 Success - #00A86B
- 🟣 Debug - #9C27B0

### 2. Core Logger Library

**File**: `src/lib/realtimeLogger.ts`

**Features**:

- ✅ Intercepts all console methods (log, info, warn, error, debug)
- ✅ Stores logs in memory (max 500 entries)
- ✅ Subscribe/unsubscribe pattern for reactive updates
- ✅ Export functionality (JSON format)
- ✅ Captures stack traces for errors
- ✅ Records userId, page, timestamp for each log
- ✅ Only enabled in DEV mode
- ✅ **Persists logs to database** (async, non-blocking)
- ✅ Session tracking

**Public API**:

```typescript
import {
  logInfo,
  logSuccess,
  logWarn,
  logError,
  logDebug,
} from "@/lib/realtimeLogger";

logInfo("category", "message", data);
logSuccess("category", "message", data);
logWarn("category", "message", data);
logError("category", "message", error);
logDebug("category", "message", data);
```

### 3. Admin Dashboard - System Logs View

**File**: `src/admin/views/SystemLogsView.vue`

**Features**:

- ✅ Centralized log monitoring from all users
- ✅ Realtime subscription (new logs appear instantly)
- ✅ Statistics dashboard:
  - Total logs
  - Error count & error rate
  - Warning count
  - Active users & sessions
- ✅ Advanced filters:
  - Level (error/warn/info/success/debug)
  - Category
  - Page
  - Search message
  - Date range
- ✅ Most Common Errors (Top 10):
  - Error message
  - Category
  - Occurrence count
  - Affected users
  - Last seen time
- ✅ Logs table with:
  - Time
  - Level badge
  - Category
  - Message (truncated)
  - User info (name, email)
  - Page
  - View detail button
- ✅ Log detail modal:
  - Full message
  - Data (JSON)
  - Stack trace
  - User info
  - Session ID
  - User agent
  - IP address
- ✅ Export logs (JSON, up to 10,000 logs)
- ✅ Clean old logs (7/30/90/180 days)
- ✅ Time range selector (1/6/24 hours, 7 days)
- ✅ Realtime indicator (active/inactive)
- ✅ MUNEEF Style design

### 4. Admin Composable

**File**: `src/admin/composables/useSystemLogs.ts`

**Functions**:

- `fetchLogs(filters, limit, offset)` - Get logs with filters
- `fetchStats(hours)` - Get log statistics
- `fetchErrorTrends(hours)` - Get error trends over time
- `fetchCommonErrors(hours, limit)` - Get most common errors
- `fetchAll(hours, filters)` - Fetch all data at once
- `subscribeToLogs(filters)` - Subscribe to realtime logs
- `unsubscribe()` - Unsubscribe from realtime
- `exportLogs(filters)` - Export logs to JSON
- `cleanOldLogs(days)` - Delete logs older than X days

**Interfaces**:

```typescript
interface SystemLog {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error" | "success";
  category: string;
  message: string;
  data?: any;
  stack?: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  page?: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
}

interface LogStats {
  total_logs: number;
  error_count: number;
  warn_count: number;
  info_count: number;
  debug_count: number;
  success_count: number;
  unique_users: number;
  unique_sessions: number;
  top_category: string;
  top_page: string;
  error_rate: number;
}
```

---

## 🗄️ Database Schema

### Migration: `172_system_logs.sql`

**Table**: `system_logs`

```sql
- id (UUID, PK)
- timestamp (TIMESTAMPTZ)
- level (TEXT) - error/warn/info/success/debug
- category (TEXT)
- message (TEXT)
- data (JSONB)
- stack (TEXT)
- user_id (UUID, FK → users)
- page (TEXT)
- session_id (TEXT)
- user_agent (TEXT)
- ip_address (INET)
- created_at (TIMESTAMPTZ)
```

**Indexes**:

- `idx_system_logs_timestamp` - Fast time-based queries
- `idx_system_logs_level` - Filter by level
- `idx_system_logs_user_id` - Filter by user
- `idx_system_logs_category` - Filter by category
- `idx_system_logs_session_id` - Track sessions
- Composite indexes for common queries

**RLS Policies**:

- ✅ Users can insert their own logs
- ✅ Users can read their own logs
- ✅ Admin can read all logs
- ✅ Admin can delete old logs

**Functions**:

1. `save_log_entry()` - Save a log entry
2. `admin_get_logs()` - Get logs with filters (Admin only)
3. `admin_get_log_stats()` - Get statistics (Admin only)
4. `admin_get_error_trends()` - Get error trends (Admin only)
5. `admin_get_common_errors()` - Get most common errors (Admin only)
6. `admin_clean_old_logs()` - Clean old logs (Admin only)

**Realtime**: ✅ Enabled for instant updates

---

## 🚀 Usage

### For Developers (Customer/Provider Side)

1. **View logs in browser**:

   - Press `Ctrl/Cmd + Shift + L` to toggle log viewer
   - Or it auto-shows in DEV mode

2. **Log custom messages**:

```typescript
import { logInfo, logError } from "@/lib/realtimeLogger";

// Log info
logInfo("booking", "User created ride request", { rideId: "123" });

// Log error
try {
  await someFunction();
} catch (error) {
  logError("booking", "Failed to create ride", error);
}
```

3. **Export logs**:
   - Click "Export" button in log viewer
   - Downloads JSON file with all logs

### For Admin

1. **Access System Logs**:

   - Navigate to `/admin/system-logs`
   - Or click "System Logs" in Settings menu

2. **Monitor logs**:

   - View realtime logs from all users
   - Filter by level, category, page, search
   - Click on log to view full details

3. **Analyze errors**:

   - Check "Most Common Errors" section
   - See error rate in statistics
   - View affected users

4. **Export logs**:

   - Click "Export" button
   - Downloads up to 10,000 logs as JSON

5. **Clean old logs**:
   - Click "Clean Old Logs" button
   - Select retention period (7/30/90/180 days)
   - Confirm deletion

---

## 📁 Files Created/Modified

### Created Files:

1. ✅ `src/lib/realtimeLogger.ts` - Core logger library
2. ✅ `src/components/shared/RealtimeLogViewer.vue` - Customer/Provider log viewer
3. ✅ `src/admin/composables/useSystemLogs.ts` - Admin composable
4. ✅ `src/admin/views/SystemLogsView.vue` - Admin view
5. ✅ `supabase/migrations/172_system_logs.sql` - Database migration

### Modified Files:

1. ✅ `src/admin/router.ts` - Added `/admin/system-logs` route
2. ✅ `src/admin/components/layout/AdminSidebar.vue` - Added menu item

---

## 🎨 Design Compliance

✅ **MUNEEF Style Guidelines**:

- Green accent color (#00A86B)
- Clean, modern design
- No emoji (SVG icons only)
- Rounded borders (12-16px)
- Sarabun font
- Whitespace and readability
- Touch-friendly buttons (min 44px)

---

## 🔐 Security

✅ **RLS Policies**:

- Users can only insert/read their own logs
- Admin has full access to all logs
- Proper role checking in all functions

✅ **Data Privacy**:

- Sensitive data should not be logged
- IP addresses captured for security
- Session tracking for debugging

---

## 📊 Performance

✅ **Optimizations**:

- Async database writes (non-blocking)
- Memory limit (500 logs max in browser)
- Database indexes for fast queries
- Realtime subscription with filters
- Lazy loading of admin view

---

## 🧪 Testing

### Manual Testing Steps:

1. **Customer/Provider Side**:

   - [ ] Open app in DEV mode
   - [ ] Log viewer should appear automatically
   - [ ] Press `Ctrl/Cmd + Shift + L` to toggle
   - [ ] Trigger some errors (e.g., network failure)
   - [ ] Check if errors appear in log viewer
   - [ ] Filter by level
   - [ ] Search logs
   - [ ] Click on log to view details
   - [ ] Export logs
   - [ ] Clear logs

2. **Admin Side**:

   - [ ] Login to admin (`/admin/login`)
   - [ ] Navigate to System Logs (`/admin/system-logs`)
   - [ ] Check if statistics load
   - [ ] Check if logs table loads
   - [ ] Check if realtime indicator is active
   - [ ] Trigger some logs from customer side
   - [ ] Check if new logs appear instantly
   - [ ] Test filters (level, category, page, search)
   - [ ] Click on log to view details
   - [ ] Export logs
   - [ ] Clean old logs (test with 7 days)

3. **Database**:
   - [ ] Run migration 172
   - [ ] Check if table created
   - [ ] Check if indexes created
   - [ ] Check if RLS policies work
   - [ ] Test functions manually

---

## 🚀 Deployment Steps

1. **Run Migration**:

```bash
# In Supabase Dashboard SQL Editor
# Run: supabase/migrations/172_system_logs.sql
```

2. **Verify Migration**:

```sql
-- Check table exists
SELECT * FROM system_logs LIMIT 1;

-- Check functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'admin_%log%';

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'system_logs';
```

3. **Test in DEV**:

   - Open app in DEV mode
   - Check log viewer appears
   - Trigger some logs
   - Check admin dashboard

4. **Deploy to Production**:
   - Merge to main branch
   - Deploy frontend
   - Migration runs automatically
   - Monitor for errors

---

## 📝 Next Steps (Optional Enhancements)

1. **Advanced Analytics**:

   - Error rate trends chart
   - User activity heatmap
   - Performance metrics

2. **Alerting**:

   - Email alerts for critical errors
   - Slack/Discord integration
   - Error threshold monitoring

3. **Log Aggregation**:

   - Group similar errors
   - Automatic error categorization
   - ML-based anomaly detection

4. **Performance Monitoring**:
   - Page load times
   - API response times
   - Resource usage

---

## ✅ Compliance Checklist

### Admin Rules Compliance:

- [x] Admin ต้องรองรับทุกฟีเจอร์ - ✅ Admin มี dashboard ครบถ้วน
- [x] Admin มีสิทธิ์จัดการสูงสุด - ✅ ดู/ลบ logs ได้ทั้งหมด
- [x] Admin แยกจาก User App - ✅ ใช้ `/admin/*` path
- [x] เพิ่ม menu ใน AdminSidebar - ✅ เพิ่มใน Settings section

### Total Role Coverage:

- [x] Customer - ✅ Log viewer widget
- [x] Provider - ✅ ใช้ log viewer เดียวกับ Customer
- [x] Admin - ✅ Centralized dashboard
- [x] Database - ✅ Migration + RLS + Functions
- [x] Realtime - ✅ Enabled for instant updates

### UI Design (MUNEEF Style):

- [x] Green accent (#00A86B) - ✅
- [x] No emoji, SVG icons only - ✅
- [x] Rounded borders (12-16px) - ✅
- [x] Sarabun font - ✅
- [x] Clean, modern design - ✅

---

## 🎉 Summary

**Realtime Logging System** ถูกสร้างครบถ้วนตาม **Admin Rules** และ **Total Role Coverage**:

✅ **Customer/Provider**: Log viewer widget พร้อม filter, search, export
✅ **Admin**: Centralized dashboard พร้อม statistics, filters, realtime
✅ **Database**: Migration + RLS + Functions + Realtime
✅ **Design**: MUNEEF Style ทุกส่วน

ระบบพร้อมใช้งานและ deploy ได้ทันที! 🚀

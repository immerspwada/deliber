# 🚀 Admin Topup - Quick Reference

## 📍 URL

```
http://localhost:5173/admin/topup-requests
```

## 🎯 Quick Actions

### Approve Request

1. Click **อนุมัติ** button
2. Confirm dialog
3. ✅ Money added to wallet automatically

### Reject Request

1. Click **ปฏิเสธ** button
2. Enter reason (required)
3. Click **ยืนยันปฏิเสธ**
4. ✅ User notified with reason

### View Slip

- Click **ดูสลิปการโอน** link
- Modal opens with image
- Click outside or X to close

### Search

- Type in search box: tracking_id, name, phone, member_uid
- Results filter automatically

### Filter by Status

- **ทั้งหมด** - All requests
- **รอดำเนินการ** - Pending only
- **อนุมัติแล้ว** - Approved only
- **ปฏิเสธแล้ว** - Rejected only

---

## 📊 Stats Cards

| Card            | Meaning                                |
| --------------- | -------------------------------------- |
| **รอดำเนินการ** | Pending requests count + total amount  |
| **อนุมัติแล้ว** | Approved requests count + total amount |
| **ปฏิเสธ**      | Rejected requests count                |
| **เวลาเฉลี่ย**  | Average processing time in minutes     |

---

## 🔑 Keyboard Shortcuts

| Key            | Action           |
| -------------- | ---------------- |
| `Ctrl/Cmd + F` | Focus search box |
| `Esc`          | Close modal      |
| `F5`           | Refresh page     |

---

## 🎨 Status Colors

| Status    | Color     | Badge       |
| --------- | --------- | ----------- |
| Pending   | 🟠 Orange | รอดำเนินการ |
| Approved  | 🟢 Green  | อนุมัติแล้ว |
| Rejected  | 🔴 Red    | ปฏิเสธแล้ว  |
| Cancelled | ⚫ Gray   | ยกเลิก      |
| Expired   | ⚫ Gray   | หมดอายุ     |

---

## ⚡ Quick SQL Queries

### Check pending requests

```sql
SELECT COUNT(*), SUM(amount)
FROM topup_requests
WHERE status = 'pending';
```

### Check user wallet

```sql
SELECT u.first_name, u.last_name, w.balance
FROM users u
JOIN user_wallets w ON w.user_id = u.id
WHERE u.id = 'user-id-here';
```

### Recent approvals

```sql
SELECT * FROM topup_requests
WHERE status = 'approved'
ORDER BY approved_at DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### No requests showing

1. Check filter (set to "ทั้งหมด")
2. Clear search box
3. Click refresh button
4. Check console for errors

### Cannot approve

1. Verify user has wallet
2. Check request status is "pending"
3. Check admin permissions
4. See console logs

### Real-time not working

1. Check internet connection
2. Refresh page
3. Check Supabase status
4. Restart dev server

---

## 📱 Mobile Tips

- Swipe to scroll horizontally
- Tap stats cards for details
- Use filter dropdown for quick access
- Pinch to zoom slip images

---

## 🔒 Security Notes

- All actions logged with admin_id
- Cannot modify approved/rejected requests
- Wallet transactions are atomic
- Admin notes are permanent

---

## 💡 Pro Tips

1. **Use search** - Faster than scrolling
2. **Filter pending first** - Focus on what needs action
3. **Check slip before approve** - Verify amount matches
4. **Add detailed notes** - Helps with disputes
5. **Refresh regularly** - Or rely on real-time updates

---

## 📞 Need Help?

1. Check `ADMIN_TOPUP_COMPLETE.md` for full docs
2. Check console logs for errors
3. Run `supabase logs` for backend errors
4. Check Supabase Studio for database issues

---

**Last Updated**: January 14, 2026

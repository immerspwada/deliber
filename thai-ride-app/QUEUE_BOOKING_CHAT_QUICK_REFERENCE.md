# 🚀 Queue Booking Chat - Quick Reference

**Date**: 2026-01-27  
**Status**: ✅ Ready

---

## ⚡ Quick Start

### 1. Clear Browser Cache (CRITICAL!)

```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

### 2. Test URLs

- Customer: `http://localhost:5173/customer/queue-booking`
- Provider: `http://localhost:5173/provider`
- Admin: `http://localhost:5173/admin/orders`

### 3. Test Flow

1. Customer creates booking → Provider accepts → Status: `confirmed`
2. Both click "แชท" (Chat) button
3. Send messages back and forth
4. Verify realtime updates (< 1 second)

---

## ✅ System Status

### Backend ✅

- ✅ 3 Helper functions
- ✅ 3 RLS policies
- ✅ 3 RPC functions
- ✅ Realtime enabled

### Frontend ✅

- ✅ Composables ready
- ✅ Components ready
- ✅ Chat buttons in place
- ✅ Booking type passed

---

## 🎭 Role Access

| Role     | Can View          | Can Send | Can Mark Read |
| -------- | ----------------- | -------- | ------------- |
| Customer | Own bookings      | ✅       | ✅            |
| Provider | Assigned bookings | ✅       | ✅            |
| Admin    | All bookings      | ✅       | ✅            |

---

## 📊 Booking Status

| Status        | Chat Allowed? |
| ------------- | ------------- |
| `pending`     | ❌ No         |
| `confirmed`   | ✅ Yes        |
| `in_progress` | ✅ Yes        |
| `completed`   | ✅ Yes        |
| `cancelled`   | ❌ No         |

---

## 🔍 Debug Checklist

If chat not working:

- [ ] Browser cache cleared?
- [ ] Booking status is `confirmed`?
- [ ] Provider assigned?
- [ ] User is participant?
- [ ] Console errors?
- [ ] Network 403/500 errors?

---

## 📞 Common Issues

### "Chat button not showing"

→ Check booking status (must be confirmed/in_progress/completed)

### "Failed to send message"

→ Clear browser cache + check booking status

### "Messages not appearing"

→ Check realtime subscription in console

### "403 Forbidden"

→ Clear browser cache (CRITICAL!)

---

## ✅ Success Criteria

- ✅ Customer can chat with provider
- ✅ Provider can chat with customer
- ✅ Admin can chat with both
- ✅ Realtime updates < 1 second
- ✅ No console errors
- ✅ No 403/500 errors

---

## 📝 Test Results

### Customer Role

- [ ] Chat opens
- [ ] Send message works
- [ ] Receive message works
- [ ] Realtime works
- [ ] No errors

### Provider Role

- [ ] Chat opens
- [ ] Send message works
- [ ] Receive message works
- [ ] Realtime works
- [ ] No errors

### Admin Role

- [ ] Chat opens
- [ ] Send message works
- [ ] See all messages
- [ ] Realtime works
- [ ] No errors

---

**Ready**: ✅ Yes  
**Test Time**: 15-20 minutes  
**Next**: Clear cache + test all roles

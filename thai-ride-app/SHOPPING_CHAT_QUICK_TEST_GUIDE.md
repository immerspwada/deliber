# Shopping Chat - Quick Test Guide

**Status**: Ready for Testing ✅  
**Date**: 2026-01-27

---

## 🚀 Quick Start

### 1. Create Test Shopping Order

```sql
-- Get a test customer and provider
SELECT id, email FROM users WHERE role = 'customer' LIMIT 1;
SELECT id, user_id FROM providers_v2 WHERE status = 'active' LIMIT 1;

-- Create test shopping order
INSERT INTO shopping_requests (
  user_id,
  store_name,
  store_address,
  store_lat,
  store_lng,
  delivery_address,
  delivery_lat,
  delivery_lng,
  item_list,
  budget_limit,
  service_fee,
  status
) VALUES (
  '<customer_user_id>',
  'Test Store',
  '123 Test St',
  13.7563,
  100.5018,
  '456 Delivery St',
  13.7563,
  100.5018,
  'Test items',
  500,
  50,
  'pending'
) RETURNING id, tracking_id;
```

### 2. Test Customer Chat (Pending Status)

```javascript
// Login as customer
// Navigate to: /tracking/shopping/<tracking_id>
// Click chat button
// Try sending message - Should work ✅
```

### 3. Accept Order as Provider

```sql
UPDATE shopping_requests
SET
  provider_id = '<provider_id>',
  status = 'matched',
  matched_at = NOW()
WHERE id = '<shopping_request_id>';
```

### 4. Test Provider Chat (Matched Status)

```javascript
// Login as provider (using provider's user_id)
// Navigate to provider orders
// Open shopping order
// Click chat button
// Try sending message - Should work ✅
```

---

## 🧪 Test Scenarios

### Scenario 1: Customer Sends First Message

```
1. Customer creates shopping order (status: pending)
2. Customer opens tracking page
3. Customer clicks chat button
4. Customer sends: "Hello, can you help me?"
   ✅ Message should be sent
   ✅ Message should appear in chat
```

### Scenario 2: Provider Cannot Chat Before Accepting

```
1. Provider views pending shopping order
2. Provider tries to open chat
   ❌ Chat should be disabled or show error
   ❌ Provider cannot send messages
```

### Scenario 3: Provider Accepts and Chats

```
1. Provider accepts shopping order (status: matched)
2. Provider opens chat
3. Provider sends: "Yes, I can help!"
   ✅ Message should be sent
   ✅ Customer should see message
   ✅ Unread count should update
```

### Scenario 4: Real-time Updates

```
1. Customer and provider both have chat open
2. Customer sends message
   ✅ Provider sees message immediately
3. Provider sends message
   ✅ Customer sees message immediately
```

### Scenario 5: Mark as Read

```
1. Customer sends message
2. Provider opens chat
   ✅ Message marked as read automatically
   ✅ Unread count decreases
3. Provider sends message
4. Customer opens chat
   ✅ Message marked as read automatically
```

### Scenario 6: Status Progression

```
1. Order status: pending
   ✅ Customer can chat
   ❌ Provider cannot chat

2. Order status: matched
   ✅ Customer can chat
   ✅ Provider can chat

3. Order status: shopping
   ✅ Customer can chat
   ✅ Provider can chat

4. Order status: delivering
   ✅ Customer can chat
   ✅ Provider can chat

5. Order status: completed
   ❌ Customer cannot chat
   ❌ Provider cannot chat
```

---

## 🔍 Debug Queries

### Check Chat Messages

```sql
SELECT
  cm.id,
  cm.sender_id,
  cm.sender_type,
  cm.message,
  cm.is_read,
  cm.created_at,
  u.email as sender_email
FROM chat_messages cm
LEFT JOIN users u ON u.id = cm.sender_id
WHERE cm.shopping_request_id = '<shopping_request_id>'
ORDER BY cm.created_at DESC;
```

### Check User Role

```sql
-- Check if user is customer
SELECT EXISTS (
  SELECT 1 FROM shopping_requests
  WHERE id = '<shopping_request_id>'
  AND user_id = '<user_id>'
) as is_customer;

-- Check if user is provider
SELECT EXISTS (
  SELECT 1 FROM shopping_requests sr
  INNER JOIN providers_v2 p ON p.id = sr.provider_id
  WHERE sr.id = '<shopping_request_id>'
  AND p.user_id = '<user_id>'
) as is_provider;
```

### Check Unread Count

```sql
SELECT COUNT(*) as unread_count
FROM chat_messages
WHERE shopping_request_id = '<shopping_request_id>'
AND sender_id != '<user_id>'
AND is_read = false;
```

---

## 🐛 Common Issues

### Issue 1: "Chat not allowed"

**Cause**: Order status doesn't allow chat  
**Fix**: Check order status and user role

```sql
SELECT
  sr.status,
  sr.user_id as customer_id,
  sr.provider_id,
  p.user_id as provider_user_id
FROM shopping_requests sr
LEFT JOIN providers_v2 p ON p.id = sr.provider_id
WHERE sr.id = '<shopping_request_id>';
```

### Issue 2: "Permission denied"

**Cause**: RLS policy blocking access  
**Fix**: Verify user is participant

```sql
-- Test as customer
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "<customer_user_id>"}';

SELECT * FROM chat_messages
WHERE shopping_request_id = '<shopping_request_id>';
```

### Issue 3: Messages not appearing

**Cause**: Realtime subscription not working  
**Fix**: Check browser console for errors

```javascript
// Check subscription status
console.log("Chat subscription:", chatSubscription.value);
console.log("Messages:", messages.value);
```

---

## ✅ Success Criteria

- [ ] Customer can send message when order is pending
- [ ] Provider can send message after accepting order
- [ ] Messages appear in real-time for both parties
- [ ] Unread count updates correctly
- [ ] Messages marked as read when viewed
- [ ] Chat disabled after order completed/cancelled
- [ ] No permission errors in console
- [ ] No RLS policy violations

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check database logs for RLS violations
3. Verify user authentication status
4. Confirm order status and participants
5. Review RPC function responses

---

**Last Updated**: 2026-01-27  
**Status**: Ready for Testing ✅

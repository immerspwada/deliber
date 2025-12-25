# Quick Deploy Guide - Wallet Topup Admin

## 🚀 Deploy in 3 Steps

### Step 1: Run SQL Script

```bash
# Copy the SQL script content
cat scripts/fix-all-errors.sql

# Then paste and run in Supabase SQL Editor
# Or use Supabase CLI:
supabase db push
```

### Step 2: Test Customer Flow

1. Login as customer at `/login`
2. Go to `/customer/wallet`
3. Click "เติมเงิน" (Top-up)
4. Enter amount (min 20 baht)
5. Upload slip image
6. Submit request

### Step 3: Test Admin Flow

1. Login as admin at `/admin/login`
2. Go to `/admin/wallets`
3. Click "Topup Requests" tab
4. See the pending request (badge shows count)
5. Click on request to view details
6. Click "ดูสลิป" to verify slip
7. Add optional note
8. Click "อนุมัติ" to approve

### Verify

- Customer receives notification
- Wallet balance updated
- Transaction appears in history

## ✅ Done!

The complete 3-role topup system is now live.

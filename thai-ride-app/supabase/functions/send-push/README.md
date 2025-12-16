# Push Notification Edge Function

## Setup VAPID Keys

### 1. Generate VAPID Keys

```bash
# Using web-push npm package
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BNxRWaABSffzQDr4ndnIHvI...
Private Key: 3KzvKasA2SoCxsp0iIG_o9...
```

### 2. Set Supabase Secrets

```bash
# Set VAPID keys as secrets
supabase secrets set VAPID_PUBLIC_KEY="BNxRWaABSffzQDr4ndnIHvI..."
supabase secrets set VAPID_PRIVATE_KEY="3KzvKasA2SoCxsp0iIG_o9..."
supabase secrets set VAPID_SUBJECT="mailto:admin@thairide.app"
```

### 3. Add Public Key to Frontend

Add to `.env`:
```
VITE_VAPID_PUBLIC_KEY=BNxRWaABSffzQDr4ndnIHvI...
```

### 4. Deploy Edge Function

```bash
supabase functions deploy send-push
```

## API Usage

### Send to User
```typescript
await supabase.functions.invoke('send-push', {
  body: {
    action: 'send_to_user',
    userId: 'user-uuid',
    payload: {
      title: 'Hello',
      body: 'This is a test notification',
      icon: '/pwa-192x192.png',
      url: '/notifications'
    }
  }
})
```

### Process Queue
```typescript
// Call periodically via cron or webhook
await supabase.functions.invoke('send-push', {
  body: { action: 'process_queue' }
})
```

### Get VAPID Public Key
```typescript
const { data } = await supabase.functions.invoke('send-push', {
  body: { action: 'get_vapid_public_key' }
})
console.log(data.publicKey)
```

## Cron Setup (Optional)

To process the notification queue automatically, set up a cron job:

```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'process-push-queue',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-push',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "process_queue"}'::jsonb
  );
  $$
);
```

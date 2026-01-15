# 🚀 Quick Setup Commands

## Prerequisites Check

```bash
# Check if Docker is running
docker ps

# Check if Supabase CLI is installed
npx supabase --version

# Check Node.js version (should be 18+)
node --version
```

## 1. Generate VAPID Keys

```bash
# Install web-push if not already installed
npm install -D web-push

# Generate keys
npx web-push generate-vapid-keys
```

**Save the output!** You'll need both keys.

## 2. Update Environment Variables

```bash
# Copy example if .env doesn't exist
cp .env.example .env

# Add VAPID public key to .env
echo "VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE" >> .env
```

## 3. Start Supabase

```bash
# Start Supabase local instance
npx supabase start

# Check status
npx supabase status
```

## 4. Apply Migration

```bash
# Apply push_subscriptions table migration
npx supabase db push --local

# Verify migration applied
npx supabase migration list --local
```

## 5. Generate TypeScript Types

```bash
# Generate types from database schema
npx supabase gen types typescript --local > src/types/database.ts
```

## 6. Start Development Server

```bash
# Start Vite dev server
npm run dev
```

## 7. Test Features

### Test Push Notifications:

1. Open http://localhost:5173/provider/dashboard
2. Login as provider
3. Toggle online status
4. Wait for push notification prompt
5. Click "เปิดใช้งาน" (Enable)
6. Grant browser permission

### Test Navigation:

1. View available jobs
2. Click navigation button (🧭)
3. Verify map app opens

### Test Earnings Dashboard:

1. Navigate to http://localhost:5173/provider/earnings
2. Switch between periods
3. Switch between views

## Troubleshooting Commands

```bash
# Reset Supabase (if needed)
npx supabase db reset --local

# View Supabase logs
npx supabase logs --local

# Check database connection
npx supabase db ping --local

# Restart Supabase
npx supabase stop
npx supabase start

# Check TypeScript errors
npm run type-check

# Run linter
npm run lint
```

## Quick Test Script

```bash
#!/bin/bash

echo "🔍 Checking prerequisites..."
docker ps > /dev/null 2>&1 || { echo "❌ Docker not running"; exit 1; }
echo "✅ Docker running"

echo "🚀 Starting Supabase..."
npx supabase start

echo "📦 Applying migrations..."
npx supabase db push --local

echo "🔧 Generating types..."
npx supabase gen types typescript --local > src/types/database.ts

echo "✅ Setup complete!"
echo "Run 'npm run dev' to start development server"
```

Save as `setup.sh` and run:

```bash
chmod +x setup.sh
./setup.sh
```

## Production Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
vercel --prod

# Apply migrations to production
npx supabase db push --linked

# Generate production types
npx supabase gen types typescript --linked > src/types/database.ts
```

## Environment Variables Checklist

```bash
# Required for Push Notifications
VITE_VAPID_PUBLIC_KEY=

# Required for Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Optional for Google Maps
VITE_GOOGLE_MAPS_API_KEY=

# Optional for Sentry
VITE_SENTRY_DSN=
```

## Database Verification

```bash
# Check if push_subscriptions table exists
npx supabase db execute --local "SELECT * FROM push_subscriptions LIMIT 1;"

# Check providers_v2 table
npx supabase db execute --local "SELECT id, user_id, status FROM providers_v2 LIMIT 5;"

# Check RLS policies
npx supabase db execute --local "SELECT * FROM pg_policies WHERE tablename = 'push_subscriptions';"
```

## Common Issues

### Issue: Docker not running

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Windows
# Start Docker Desktop from Start Menu
```

### Issue: Port already in use

```bash
# Find process using port 54321
lsof -i :54321

# Kill process
kill -9 <PID>

# Or use different port
npx supabase start --port 54322
```

### Issue: Migration already applied

```bash
# Check migration status
npx supabase migration list --local

# If needed, reset database
npx supabase db reset --local
```

### Issue: TypeScript errors

```bash
# Regenerate types
npx supabase gen types typescript --local > src/types/database.ts

# Check for errors
npm run type-check

# Fix auto-fixable issues
npm run lint -- --fix
```

## Quick Links

- Local Supabase Studio: http://localhost:54323
- Local API: http://localhost:54321
- Dev Server: http://localhost:5173
- Supabase Docs: https://supabase.com/docs
- Web Push Docs: https://web.dev/push-notifications/

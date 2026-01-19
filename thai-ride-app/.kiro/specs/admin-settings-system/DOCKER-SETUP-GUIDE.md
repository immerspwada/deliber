# 🐳 Docker Setup Guide for Admin Settings System

## Current Status

✅ **Admin Settings System is READY and WORKING with Mock Data**

- UI is fully functional at `http://localhost:5173/admin/settings`
- All 50+ settings are available for testing
- Changes are tracked in memory
- No database required for development/testing

❌ **Docker is NOT installed**

- Migration 310 is ready but not applied
- Real database features are waiting for Docker

---

## Why You Need Docker

Docker is required to run Supabase locally, which provides:

- PostgreSQL database
- Authentication
- Real-time subscriptions
- Storage
- Edge Functions

---

## Installation Options

### Option 1: Docker Desktop (Recommended for Mac)

1. **Download Docker Desktop:**
   - Visit: https://www.docker.com/products/docker-desktop
   - Download for macOS (Apple Silicon or Intel)
   - File size: ~500MB

2. **Install:**

   ```bash
   # Open the downloaded .dmg file
   # Drag Docker to Applications folder
   # Launch Docker from Applications
   ```

3. **Verify Installation:**
   ```bash
   docker --version
   # Should show: Docker version 24.x.x
   ```

### Option 2: Homebrew (Command Line)

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Docker
brew install --cask docker

# Launch Docker
open -a Docker

# Wait for Docker to start (check menu bar icon)
```

### Option 3: Colima (Lightweight Alternative)

```bash
# Install Colima
brew install colima docker

# Start Colima
colima start

# Verify
docker --version
```

---

## After Docker Installation

### Step 1: Start Supabase

```bash
# Navigate to project directory
cd /path/to/your/project

# Start Supabase (first time will download images ~2GB)
npx supabase start

# This will:
# - Download PostgreSQL, PostgREST, GoTrue, etc.
# - Start all services
# - Show you the credentials
```

**Expected Output:**

```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGc...
service_role key: eyJhbGc...
```

### Step 2: Apply Migration 310

```bash
# Apply the admin settings migration
npx supabase db push --local

# Expected output:
# Applying migration 310_comprehensive_admin_settings_system.sql...
# ✓ Migration applied successfully
```

### Step 3: Generate TypeScript Types

```bash
# Generate types from database schema
npx supabase gen types --local > src/types/database.ts

# This updates your TypeScript types to match the database
```

### Step 4: Verify Installation

```bash
# Run verification script
npx supabase db execute --local -f .kiro/specs/admin-settings-system/verify-installation.sql

# Expected output:
# ✓ system_settings table exists
# ✓ settings_audit_log table exists
# ✓ 50 default settings inserted
# ✓ RPC functions created
# ✓ RLS policies active
```

### Step 5: Switch to Real Database

Edit `src/views/AdminSettingsView.vue`:

```typescript
// Change this line:
const USE_MOCK = true;

// To:
const USE_MOCK = false;
```

### Step 6: Test the Real System

1. **Start dev server:**

   ```bash
   npm run dev
   ```

2. **Navigate to:**

   ```
   http://localhost:5173/admin/settings
   ```

3. **Test features:**
   - ✅ Load settings from database
   - ✅ Update a setting
   - ✅ Check audit log
   - ✅ Search settings
   - ✅ Save changes

---

## Troubleshooting

### Docker Won't Start

**Problem:** "Cannot connect to Docker daemon"

**Solutions:**

1. Check if Docker Desktop is running (menu bar icon)
2. Restart Docker Desktop
3. Check system resources (Docker needs ~4GB RAM)
4. Try: `docker ps` to verify Docker is responding

### Supabase Won't Start

**Problem:** "Port already in use"

**Solutions:**

```bash
# Check what's using the ports
lsof -i :54321
lsof -i :54322

# Stop Supabase
npx supabase stop

# Start again
npx supabase start
```

### Migration Fails

**Problem:** "Migration already applied" or "Syntax error"

**Solutions:**

```bash
# Check migration status
npx supabase migration list --local

# Reset database (WARNING: deletes all data)
npx supabase db reset --local

# Apply migrations again
npx supabase db push --local
```

### Types Not Generated

**Problem:** "Command not found" or "Permission denied"

**Solutions:**

```bash
# Make sure Supabase is running
npx supabase status

# Try with full path
npx supabase gen types typescript --local > src/types/database.ts

# Check file was created
ls -la src/types/database.ts
```

---

## Quick Commands Reference

```bash
# Docker
docker --version              # Check Docker version
docker ps                     # List running containers
docker system prune -a        # Clean up Docker (frees space)

# Supabase
npx supabase start           # Start local Supabase
npx supabase stop            # Stop local Supabase
npx supabase status          # Check status
npx supabase db reset        # Reset database (WARNING: deletes data)
npx supabase db push         # Apply migrations
npx supabase gen types       # Generate TypeScript types

# Project
npm run dev                  # Start dev server
npm run build               # Build for production
npm run type-check          # Check TypeScript
```

---

## System Requirements

### Minimum:

- macOS 10.15 or later
- 4GB RAM
- 10GB free disk space
- Internet connection (for initial download)

### Recommended:

- macOS 12 or later
- 8GB RAM
- 20GB free disk space
- Fast internet (Docker images are ~2GB)

---

## Alternative: Use Mock Data (Current Setup)

If you can't install Docker right now, the mock data system works perfectly:

✅ **What Works:**

- Full UI functionality
- All 50+ settings
- Search and filtering
- Inline editing
- Audit log (in-memory)
- Category navigation
- Validation

❌ **What Doesn't Work:**

- Data persistence (resets on page reload)
- Multi-user access
- Real audit trail
- Database queries from other parts of app

**This is fine for:**

- UI development
- Testing layouts
- Demonstrating features
- Training
- Screenshots/videos

---

## Production Deployment

When deploying to production, you'll use Supabase Cloud (not local Docker):

1. **Create Supabase Project:**
   - Visit: https://supabase.com
   - Create new project
   - Note your project URL and keys

2. **Link Project:**

   ```bash
   npx supabase link --project-ref your-project-ref
   ```

3. **Push Migrations:**

   ```bash
   npx supabase db push
   ```

4. **Update Environment Variables:**

   ```bash
   # .env.production
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Deploy:**
   ```bash
   npm run build
   # Deploy dist/ folder to Vercel/Netlify/etc.
   ```

---

## Next Steps

### Immediate (No Docker Required)

- ✅ Test UI with mock data
- ✅ Review default settings
- ✅ Customize settings values
- ✅ Test on mobile devices
- ✅ Take screenshots for documentation

### After Docker Installation

1. Install Docker Desktop
2. Start Supabase: `npx supabase start`
3. Apply migration: `npx supabase db push --local`
4. Generate types: `npx supabase gen types --local`
5. Switch USE_MOCK to false
6. Test with real database

### Production Ready

1. Create Supabase Cloud project
2. Link local to cloud
3. Push migrations to production
4. Update environment variables
5. Deploy application
6. Test in production
7. Monitor audit logs

---

## Support

### Documentation

- 📖 [README.md](.kiro/specs/admin-settings-system/README.md)
- 📖 [COMPLETE-SUMMARY.md](.kiro/specs/admin-settings-system/COMPLETE-SUMMARY.md)
- 📖 [DEPLOYMENT-GUIDE.md](.kiro/specs/admin-settings-system/DEPLOYMENT-GUIDE.md)

### Resources

- Docker: https://docs.docker.com/desktop/install/mac-install/
- Supabase: https://supabase.com/docs/guides/local-development
- Project: See MIGRATION_GUIDE.md

### Common Issues

- Docker installation: https://docs.docker.com/desktop/troubleshoot/overview/
- Supabase CLI: https://supabase.com/docs/guides/cli/getting-started
- Migration issues: See DEPLOYMENT-GUIDE.md

---

**Status:** 📝 Docker not installed, using mock data
**Next Action:** Install Docker Desktop from https://www.docker.com/products/docker-desktop
**Time Required:** ~15 minutes (download + install + setup)
**Disk Space:** ~3GB (Docker + Supabase images)

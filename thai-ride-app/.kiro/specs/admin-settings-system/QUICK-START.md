# ⚡ Quick Start - Admin Settings System

## 🎯 Use It Right Now (No Setup Required!)

The admin settings system is **already working** with mock data!

### Step 1: Start Dev Server

```bash
npm run dev
```

### Step 2: Navigate to Settings

Open your browser:

```
http://localhost:5173/admin/settings
```

### Step 3: Explore!

✅ **What you can do right now:**

- Browse 50+ settings across 9 categories
- Search for specific settings
- Edit values (boolean toggles, numbers, text)
- See changes highlighted in yellow
- Save individual settings or bulk save
- View audit log (in-memory)
- Test on mobile devices

⚠️ **Limitations (mock data):**

- Changes reset on page reload
- No persistence to database
- Audit log is temporary

---

## 📱 Try These Features

### 1. Toggle a Feature Flag

- Click "Feature Flags" category
- Toggle "Delivery Service" on/off
- See the change highlighted
- Click save button

### 2. Update Pricing

- Click "Ride Settings" category
- Change "Base Fare" from 35 to 40
- Notice validation (must be 10-100)
- Click save

### 3. Search Settings

- Type "phone" in search box
- See filtered results
- Clear search to see all

### 4. View Audit Log

- Make some changes
- Click "Audit Log" button
- See history of changes

### 5. Bulk Operations

- Make multiple changes
- Click "Save All Changes"
- Or click "Reset" to undo

---

## 🐳 Want Real Database?

To enable persistence and real database features:

1. **Install Docker Desktop:**
   - Download: https://www.docker.com/products/docker-desktop
   - Install and launch

2. **Start Supabase:**

   ```bash
   npx supabase start
   ```

3. **Apply Migration:**

   ```bash
   npx supabase db push --local
   npx supabase gen types --local > src/types/database.ts
   ```

4. **Switch to Real Database:**
   Edit `src/views/AdminSettingsView.vue`:

   ```typescript
   const USE_MOCK = false; // Change from true to false
   ```

5. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

**Full guide:** [DOCKER-SETUP-GUIDE.md](./DOCKER-SETUP-GUIDE.md)

---

## 📚 Documentation

| File                                             | Purpose                            |
| ------------------------------------------------ | ---------------------------------- |
| [README.md](./README.md)                         | Overview and features              |
| [DOCKER-SETUP-GUIDE.md](./DOCKER-SETUP-GUIDE.md) | Install Docker and enable database |
| [COMPLETE-SUMMARY.md](./COMPLETE-SUMMARY.md)     | Technical details and statistics   |
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)     | Production deployment              |
| [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)       | Common tasks and code examples     |

---

## 🎨 UI Preview

### Desktop View

```
┌─────────────────────────────────────────────────────────┐
│  System Settings                    [Audit] [Reset] [Save]│
├──────────┬──────────────────────────────────────────────┤
│ ⚙️ General│ Base Fare                              [35] │
│ 🚗 Ride   │ ค่าโดยสารขั้นต่ำ                            │
│ 💳 Payment│ Minimum ride fare in THB                   │
│ 👤 Provider│                                            │
│ 🔔 Notif  │ Per KM Rate                             [8] │
│ 🔒 Security│ ค่าระยะทางต่อกม.                           │
│ 🎯 Features│ Rate per kilometer in THB                  │
│ 🗺️ Map    │                                            │
│ 📊 Analytics│ Cancellation Fee                      [20] │
└──────────┴──────────────────────────────────────────────┘
```

### Mobile View

```
┌─────────────────────────┐
│ System Settings    [≡]  │
├─────────────────────────┤
│ 🔍 Search...            │
├─────────────────────────┤
│ ⚙️ General Settings (6) │
│ 🚗 Ride Settings (8)    │
│ 💳 Payment Settings (8) │
│ 👤 Provider Settings (5)│
│ 🔔 Notifications (4)    │
│ 🔒 Security (5)         │
│ 🎯 Feature Flags (8)    │
│ 🗺️ Map Settings (3)     │
│ 📊 Analytics (3)        │
└─────────────────────────┘
```

---

## 🎯 Common Tasks

### Change App Name

1. Go to "General Settings"
2. Find "Application Name"
3. Change value
4. Click save

### Enable/Disable Feature

1. Go to "Feature Flags"
2. Toggle the switch
3. Changes save automatically

### Update Pricing

1. Go to "Ride Settings"
2. Update fare values
3. Click "Save All Changes"

### View Change History

1. Click "Audit Log" button
2. See who changed what and when
3. View old vs new values

---

## 🚀 Next Steps

### For Development

- ✅ Test all UI features
- ✅ Customize default values
- ✅ Test on different screen sizes
- ✅ Take screenshots for docs

### For Production

- 📦 Install Docker
- 🗄️ Apply database migration
- 🔄 Switch to real database
- 🚀 Deploy to production

---

## 💡 Tips

### Keyboard Shortcuts

- `Ctrl/Cmd + F` - Focus search
- `Enter` - Save current setting
- `Esc` - Close modal

### Best Practices

- Test changes in development first
- Document why you changed settings
- Review audit log regularly
- Keep backup of important settings

### Performance

- Search is instant (client-side)
- Changes are validated before save
- UI updates are optimistic
- Audit log loads on demand

---

## 🆘 Need Help?

### Issues

- Settings not loading? Check console for errors
- Can't save? Check validation rules
- Page blank? Check if dev server is running

### Resources

- Full docs: See README.md
- Docker setup: See DOCKER-SETUP-GUIDE.md
- Code examples: See QUICK-REFERENCE.md

---

**Status:** ✅ Working with mock data
**Access:** http://localhost:5173/admin/settings
**Time to start:** < 1 minute
**Setup required:** None (dev server only)

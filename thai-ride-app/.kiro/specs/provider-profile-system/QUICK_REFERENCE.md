# 🚀 Provider Profile System - Quick Reference

## 📋 Checklist: What's Missing?

### ❌ Missing Features (Priority Order)

#### 🔴 Critical (Must Have for MVP)

- [ ] Personal info editing form
- [ ] Profile photo upload & crop
- [ ] Vehicle add/edit/delete
- [ ] Document upload interface
- [ ] Bank account management
- [ ] Profile completeness indicator

#### 🟡 Important (Should Have)

- [ ] Emergency contact form
- [ ] Notification preferences
- [ ] Working hours scheduler
- [ ] Service area map
- [ ] Security settings
- [ ] Password change

#### 🟢 Nice to Have (Can Wait)

- [ ] Help & FAQ system
- [ ] Support ticket system
- [ ] Referral code display
- [ ] Language switcher
- [ ] Offline support
- [ ] 2FA setup

## 🗂️ File Structure

```
src/
├── views/provider/
│   └── ProviderProfileView.vue (✅ EXISTS - needs expansion)
├── components/provider/
│   ├── profile/
│   │   ├── ProfileHeader.vue (NEW)
│   │   ├── StatusBadge.vue (NEW)
│   │   ├── PerformanceStats.vue (NEW)
│   │   └── ProfileCompletenessBar.vue (NEW)
│   ├── personal/
│   │   ├── PersonalInfoSection.vue (NEW)
│   │   ├── ProfilePhotoUpload.vue (NEW)
│   │   └── EmergencyContactForm.vue (NEW)
│   ├── vehicle/
│   │   ├── VehicleInfoSection.vue (NEW)
│   │   ├── VehicleForm.vue (NEW)
│   │   └── VehicleCard.vue (NEW)
│   ├── documents/
│   │   ├── DocumentsSection.vue (NEW)
│   │   ├── DocumentUploadModal.vue (NEW)
│   │   ├── DocumentCard.vue (NEW)
│   │   └── DocumentPreviewModal.vue (NEW)
│   ├── bank/
│   │   ├── BankAccountSection.vue (NEW)
│   │   ├── BankAccountForm.vue (NEW)
│   │   └── BankAccountCard.vue (NEW)
│   └── settings/
│       ├── NotificationSettings.vue (NEW)
│       ├── WorkingHoursSettings.vue (NEW)
│       ├── ServiceAreaSettings.vue (NEW)
│       └── SecuritySettings.vue (NEW)
├── composables/
│   ├── useProviderProfile.ts (NEW)
│   ├── useVehicleManagement.ts (NEW)
│   ├── useDocumentManager.ts (NEW)
│   ├── useBankAccount.ts (NEW)
│   └── useProfileSettings.ts (NEW)
└── types/
    └── profile.ts (NEW)
```

## 🗄️ Database Migrations Needed

### Priority 1: Core Tables

```bash
# Create these first
supabase/migrations/XXX_provider_vehicles.sql
supabase/migrations/XXX_provider_documents.sql
supabase/migrations/XXX_provider_bank_accounts.sql
```

### Priority 2: Settings Tables

```bash
supabase/migrations/XXX_provider_settings.sql
supabase/migrations/XXX_provider_service_areas.sql
supabase/migrations/XXX_provider_emergency_contacts.sql
```

### Priority 3: Support Tables

```bash
supabase/migrations/XXX_provider_support_tickets.sql
supabase/migrations/XXX_add_profile_columns.sql
```

## 🔌 API Endpoints to Create

### Supabase Edge Functions

```bash
supabase/functions/
├── provider-profile/
│   ├── get-profile/index.ts
│   ├── update-personal/index.ts
│   └── upload-photo/index.ts
├── provider-vehicles/
│   ├── list/index.ts
│   ├── create/index.ts
│   ├── update/index.ts
│   └── delete/index.ts
├── provider-documents/
│   ├── list/index.ts
│   ├── upload/index.ts
│   └── delete/index.ts
├── provider-bank/
│   ├── list/index.ts
│   ├── create/index.ts
│   ├── update/index.ts
│   └── delete/index.ts
└── provider-settings/
    ├── get/index.ts
    ├── update-notifications/index.ts
    ├── update-working-hours/index.ts
    └── update-security/index.ts
```

## 🎨 Component Props Quick Reference

### ProfileHeader.vue

```typescript
interface Props {
  provider: Provider;
  loading?: boolean;
}

interface Emits {
  (e: "edit"): void;
  (e: "upload-photo"): void;
}
```

### VehicleForm.vue

```typescript
interface Props {
  vehicle?: VehicleInfo; // undefined for new
  mode: "create" | "edit";
}

interface Emits {
  (e: "submit", vehicle: VehicleInfo): void;
  (e: "cancel"): void;
}
```

### DocumentUploadModal.vue

```typescript
interface Props {
  documentType: DocumentType;
  isOpen: boolean;
}

interface Emits {
  (e: "close"): void;
  (e: "uploaded", document: Document): void;
}
```

### BankAccountForm.vue

```typescript
interface Props {
  account?: BankAccount; // undefined for new
  mode: "create" | "edit";
}

interface Emits {
  (e: "submit", account: BankAccount): void;
  (e: "cancel"): void;
}
```

## 🔧 Composable Usage Examples

### useProviderProfile

```typescript
import { useProviderProfile } from "@/composables/useProviderProfile";

const {
  profile,
  loading,
  error,
  loadProfile,
  updatePersonalInfo,
  uploadProfilePhoto,
  completeness,
} = useProviderProfile();

// Load profile
await loadProfile();

// Update info
await updatePersonalInfo({
  firstName: "John",
  lastName: "Doe",
});

// Upload photo
await uploadProfilePhoto(file);
```

### useVehicleManagement

```typescript
import { useVehicleManagement } from "@/composables/useVehicleManagement";

const {
  vehicles,
  loading,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  setPrimaryVehicle,
} = useVehicleManagement();

// Add vehicle
await addVehicle({
  type: "car",
  plateNumber: "กข-1234",
  brand: "Toyota",
  model: "Camry",
  year: 2023,
  color: "white",
});
```

### useDocumentManager

```typescript
import { useDocumentManager } from "@/composables/useDocumentManager";

const { documents, loading, uploadDocument, deleteDocument, checkExpiryDates } =
  useDocumentManager();

// Upload document
await uploadDocument({
  type: "national_id",
  frontImage: file1,
  backImage: file2,
});

// Check expiry
const expiring = checkExpiryDates(30); // 30 days
```

## 🎯 Validation Rules Quick Reference

### Personal Info

```typescript
const personalInfoSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^0\d{1}-\d{4}-\d{4}$/),
  dateOfBirth: z.string().optional(),
});
```

### Vehicle

```typescript
const vehicleSchema = z.object({
  type: z.enum(["motorcycle", "car", "van", "truck"]),
  plateNumber: z.string().regex(/^[ก-ฮ]{1,2}-?\d{1,4}$/),
  year: z.number().min(1990).max(new Date().getFullYear()),
  color: z.string().min(2),
});
```

### Bank Account

```typescript
const bankAccountSchema = z.object({
  bankCode: z.string().length(3),
  accountNumber: z.string().min(10).max(15),
  accountHolderName: z.string().min(3).max(100),
});
```

## 🔐 Security Checklist

### Before Deployment

- [ ] All sensitive data encrypted
- [ ] RLS policies enabled
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] HTTPS enforced
- [ ] Session timeout implemented
- [ ] Audit logging enabled
- [ ] Error messages don't leak info
- [ ] File upload validation

## 🧪 Testing Checklist

### Unit Tests

- [ ] useProviderProfile composable
- [ ] useVehicleManagement composable
- [ ] useDocumentManager composable
- [ ] useBankAccount composable
- [ ] All validation functions
- [ ] Encryption/decryption helpers

### Component Tests

- [ ] ProfileHeader renders correctly
- [ ] VehicleForm validation works
- [ ] DocumentUploadModal handles files
- [ ] BankAccountForm masks numbers
- [ ] All forms submit correctly

### Integration Tests

- [ ] Complete profile setup flow
- [ ] Vehicle add/edit/delete flow
- [ ] Document upload flow
- [ ] Bank account management flow
- [ ] Settings update flow

### E2E Tests

- [ ] New provider onboarding
- [ ] Profile completion journey
- [ ] Document verification flow
- [ ] Role switching
- [ ] Logout flow

## 📱 Mobile Considerations

### Touch Targets

- Minimum 44x44px for all buttons
- Adequate spacing between elements
- Large, easy-to-tap form inputs

### Responsive Design

- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px
- Stack sections vertically on mobile
- Hide/show elements based on screen size

### Performance

- Lazy load images
- Compress uploads before sending
- Use skeleton loaders
- Minimize bundle size

## 🎨 Design Tokens

### Colors

```css
--primary: #000000
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
```

### Spacing

```css
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
```

### Border Radius

```css
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 20px
```

## 🚀 Quick Start Commands

### Development

```bash
# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Test
npm run test
```

### Database

```bash
# Create migration
supabase migration new provider_profile_tables

# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/types/database.ts
```

### Deployment

```bash
# Build
npm run build

# Deploy Edge Functions
supabase functions deploy provider-profile

# Deploy to Vercel
vercel --prod
```

## 📚 Useful Resources

### Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Vue 3 Docs](https://vuejs.org/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

### Tools

- [Zod Validation](https://zod.dev/)
- [Leaflet Maps](https://leafletjs.com/)
- [date-fns](https://date-fns.org/)

---

**Quick Tip:** Start with Task 1 in `tasks.md` and work sequentially. Each task builds on the previous one!

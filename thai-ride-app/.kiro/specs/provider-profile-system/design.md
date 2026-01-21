# Design Document: Provider Profile System

## Overview

Provider Profile System เป็นระบบจัดการข้อมูลโปรไฟล์แบบ Multi-Section ที่ออกแบบมาเพื่อรองรับการจัดการข้อมูลผู้ให้บริการอย่างครอบคลุม ระบบประกอบด้วย 6 หมวดหลัก: Personal Info, Vehicle Info, Documents, Bank Account, Settings, และ Help & Support

ระบบนี้ใช้ Vue 3 Composition API, TypeScript, และ Supabase เป็นหลัก โดยเน้นการออกแบบที่ Scalable, Maintainable, และ User-Friendly

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Provider Profile View                     │
│                  (ProviderProfileView.vue)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Personal   │  │   Vehicle   │  │  Documents  │
│    Info     │  │    Info     │  │   Manager   │
│  Component  │  │  Component  │  │  Component  │
└─────────────┘  └─────────────┘  └─────────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Bank Account│  │  Settings   │  │    Help     │
│  Component  │  │  Component  │  │  Component  │
└─────────────┘  └─────────────┘  └─────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   useProviderProfile          │
         │   (Composable)                │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Supabase   │  │   Storage   │  │  Realtime   │
│  Database   │  │   Bucket    │  │  Channel    │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Component Hierarchy

```
ProviderProfileView.vue (Main Container)
├── ProfileHeader.vue (Avatar, Name, Status Badge)
├── PerformanceStats.vue (Rating, Jobs, Earnings)
├── NotificationToggle.vue (Push Notification Control)
├── ProfileMenu.vue (Navigation Menu)
│   ├── PersonalInfoSection.vue
│   ├── VehicleInfoSection.vue
│   ├── DocumentsSection.vue
│   ├── BankAccountSection.vue
│   ├── SettingsSection.vue
│   └── HelpSection.vue
├── RoleSwitcher.vue (Switch to Customer Mode)
└── LogoutButton.vue
```

### Nested Routes Structure

```
/provider/profile (Main Profile Page)
├── /provider/profile/personal (Personal Information Edit)
├── /provider/profile/vehicle (Vehicle Management)
│   ├── /provider/profile/vehicle/add (Add New Vehicle)
│   └── /provider/profile/vehicle/:id/edit (Edit Vehicle)
├── /provider/profile/documents (Document Upload & Management)
│   ├── /provider/profile/documents/identity (Identity Documents)
│   ├── /provider/profile/documents/license (Driver's License)
│   └── /provider/profile/documents/vehicle (Vehicle Documents)
├── /provider/profile/bank (Bank Account Management)
│   ├── /provider/profile/bank/add (Add Bank Account)
│   └── /provider/profile/bank/:id/edit (Edit Bank Account)
├── /provider/profile/settings (Settings)
│   ├── /provider/profile/settings/notifications (Notification Preferences)
│   ├── /provider/profile/settings/working-hours (Working Hours)
│   ├── /provider/profile/settings/service-area (Service Area)
│   ├── /provider/profile/settings/security (Security & Privacy)
│   └── /provider/profile/settings/language (Language Settings)
└── /provider/profile/help (Help & Support)
    ├── /provider/profile/help/faq (FAQ)
    ├── /provider/profile/help/contact (Contact Support)
    └── /provider/profile/help/tickets (Support Tickets)
```

## Components and Interfaces

### 1. ProfileHeader Component

**Purpose:** Display provider's avatar, name, and verification status

**Props:**

```typescript
interface ProfileHeaderProps {
  provider: Provider;
  loading?: boolean;
}
```

**Features:**

- Avatar with initials fallback
- Profile photo upload on click
- Status badge with color coding
- Edit button for quick access

**UI Elements:**

- 64x64px rounded avatar
- Name (20px, bold)
- Status badge (12px, rounded pill)
- Edit icon button

### 2. PerformanceStats Component

**Purpose:** Display key performance metrics

**Props:**

```typescript
interface PerformanceStatsProps {
  stats: {
    rating: number;
    totalJobs: number;
    totalEarnings: number;
  };
  loading?: boolean;
}
```

**Features:**

- Three-column layout
- Animated number transitions
- Dividers between stats
- Tap to view detailed stats

**UI Elements:**

- Rating (18px, bold) with star icon
- Total jobs count
- Total earnings with currency symbol

### 3. PersonalInfoSection Component

**Purpose:** Manage personal information

**Data Model:**

```typescript
interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}
```

**Features:**

- Inline editing
- Real-time validation
- Auto-save on blur
- Error messages per field

**Validation Rules:**

- First name: required, 2-50 characters, Thai/English only
- Last name: required, 2-50 characters, Thai/English only
- Email: required, valid email format
- Phone: required, Thai format (0X-XXXX-XXXX)
- Date of birth: optional, must be 18+ years old

### 4. VehicleInfoSection Component

**Purpose:** Manage vehicle information

**Data Model:**

```typescript
interface VehicleInfo {
  id: string;
  type: VehicleType;
  plateNumber: string;
  province: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  isPrimary: boolean;
  photos?: string[];
}

type VehicleType = "motorcycle" | "car" | "van" | "truck";
```

**Features:**

- Multiple vehicle support
- Primary vehicle selection
- Vehicle photo gallery
- Plate number validation

**Validation Rules:**

- Plate number: Thai format (กข-1234 or 1กข-1234)
- Year: 1990-current year
- Color: required, from predefined list
- Photos: max 5 photos, 5MB each

### 5. DocumentsSection Component

**Purpose:** Upload and manage verification documents

**Data Model:**

```typescript
interface Document {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  frontImage: string;
  backImage?: string;
  expiryDate?: string;
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

type DocumentType =
  | "national_id"
  | "drivers_license"
  | "vehicle_registration"
  | "vehicle_insurance"
  | "background_check";

type DocumentStatus =
  | "pending_upload"
  | "uploaded"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired";
```

**Features:**

- Drag & drop upload
- Camera capture on mobile
- OCR for data extraction
- Expiry date tracking
- Document preview
- Re-upload for rejected docs

**Upload Flow:**

1. Select document type
2. Upload front image
3. Upload back image (if required)
4. OCR extracts data
5. User confirms extracted data
6. Submit for verification

### 6. BankAccountSection Component

**Purpose:** Manage bank account information

**Data Model:**

```typescript
interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchName?: string;
  isPrimary: boolean;
  verificationStatus: "pending" | "verified" | "failed";
  verifiedAt?: string;
}
```

**Features:**

- Bank selection dropdown
- Account number masking
- Name verification
- Primary account selection
- Re-authentication for changes

**Security:**

- Encrypt account number in database
- Mask display (show last 4 digits only)
- Require password confirmation for edits
- Log all changes to audit trail

### 7. NotificationSettings Component

**Purpose:** Control notification preferences

**Data Model:**

```typescript
interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  categories: {
    newJobs: boolean;
    jobUpdates: boolean;
    earnings: boolean;
    promotions: boolean;
    systemAlerts: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  jobAlertFilters?: {
    minEarnings?: number;
    maxDistance?: number;
    serviceTypes?: ServiceType[];
  };
}
```

**Features:**

- Toggle switches for each category
- Quiet hours scheduler
- Job alert filters
- Sound selection
- Test notification button

### 8. WorkingHoursSettings Component

**Purpose:** Configure working schedule

**Data Model:**

```typescript
interface WorkingSchedule {
  enabled: boolean;
  flexibleMode: boolean;
  schedule: {
    [key in DayOfWeek]: TimeSlot[];
  };
}

interface TimeSlot {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
```

**Features:**

- Weekly calendar view
- Multiple slots per day
- Copy schedule to other days
- Flexible mode toggle
- Auto-offline outside hours

**UI:**

- 7-day grid layout
- Time picker for each slot
- Add/remove slot buttons
- Visual timeline preview

### 9. ServiceAreaSettings Component

**Purpose:** Define service coverage area

**Data Model:**

```typescript
interface ServiceArea {
  id: string;
  name: string;
  type: "radius" | "polygon";
  center?: { lat: number; lng: number };
  radius?: number; // meters
  polygon?: Array<{ lat: number; lng: number }>;
  isActive: boolean;
}
```

**Features:**

- Interactive map (Leaflet)
- Draw polygon tool
- Radius circle tool
- Multiple areas support
- Area size calculation
- Restricted zone warnings

**Map Controls:**

- Draw polygon button
- Draw circle button
- Edit mode toggle
- Delete area button
- Save button

### 10. SecuritySettings Component

**Purpose:** Manage security and privacy

**Data Model:**

```typescript
interface SecuritySettings {
  twoFactorEnabled: boolean;
  hidePhoneNumber: boolean;
  shareLocationHistory: boolean;
  allowDataAnalytics: boolean;
  loginHistory: LoginRecord[];
}

interface LoginRecord {
  timestamp: string;
  device: string;
  location: string;
  ipAddress: string;
  success: boolean;
}
```

**Features:**

- Password change
- 2FA setup
- Privacy toggles
- Login history viewer
- Active sessions manager
- Account deletion

## Data Models

### Provider Profile (Extended)

```typescript
interface ProviderProfile extends Provider {
  // Personal Info
  personalInfo: PersonalInfo;

  // Vehicle Info
  vehicles: VehicleInfo[];
  primaryVehicleId?: string;

  // Documents
  documents: Document[];
  documentCompleteness: number; // 0-100

  // Bank Accounts
  bankAccounts: BankAccount[];
  primaryBankAccountId?: string;

  // Settings
  notificationPreferences: NotificationPreferences;
  workingSchedule: WorkingSchedule;
  serviceAreas: ServiceArea[];
  securitySettings: SecuritySettings;
  languagePreference: "th" | "en";

  // Metadata
  profileCompleteness: number; // 0-100
  lastUpdated: string;
  referralCode: string;
  referralStats: {
    totalReferrals: number;
    earnedBonus: number;
  };
}
```

### Profile Completeness Calculation

```typescript
interface CompletenessWeights {
  personalInfo: 20; // Required
  vehicle: 20; // Required
  documents: 30; // Required
  bankAccount: 15; // Required
  emergencyContact: 10; // Optional
  profilePhoto: 5; // Optional
}

function calculateCompleteness(profile: ProviderProfile): number {
  let score = 0;

  // Personal Info (20%)
  if (
    profile.personalInfo.firstName &&
    profile.personalInfo.lastName &&
    profile.personalInfo.email &&
    profile.personalInfo.phone
  ) {
    score += 20;
  }

  // Vehicle (20%)
  if (profile.vehicles.length > 0) {
    score += 20;
  }

  // Documents (30%)
  const requiredDocs = [
    "national_id",
    "drivers_license",
    "vehicle_registration",
  ];
  const verifiedDocs = profile.documents.filter(
    (d) => requiredDocs.includes(d.type) && d.status === "verified"
  );
  score += (verifiedDocs.length / requiredDocs.length) * 30;

  // Bank Account (15%)
  if (profile.bankAccounts.length > 0) {
    score += 15;
  }

  // Emergency Contact (10%)
  if (profile.personalInfo.emergencyContact) {
    score += 10;
  }

  // Profile Photo (5%)
  if (profile.profile_image_url) {
    score += 5;
  }

  return Math.round(score);
}
```

## API Endpoints

### Profile Management

#### GET /api/provider/profile

**Purpose:** Get complete provider profile

**Response:**

```typescript
{
  success: boolean;
  data: ProviderProfile;
  completeness: number;
}
```

#### PATCH /api/provider/profile/personal

**Purpose:** Update personal information

**Request:**

```typescript
{
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  address?: string
}
```

**Response:**

```typescript
{
  success: boolean;
  data: PersonalInfo;
  message: string;
}
```

#### POST /api/provider/profile/photo

**Purpose:** Upload profile photo

**Request:** FormData with image file

**Response:**

```typescript
{
  success: boolean;
  data: {
    url: string;
    thumbnailUrl: string;
  }
  message: string;
}
```

### Vehicle Management

#### GET /api/provider/vehicles

**Purpose:** Get all vehicles

**Response:**

```typescript
{
  success: boolean
  data: VehicleInfo[]
}
```

#### POST /api/provider/vehicles

**Purpose:** Add new vehicle

**Request:**

```typescript
{
  type: VehicleType;
  plateNumber: string;
  province: string;
  brand: string;
  model: string;
  year: number;
  color: string;
}
```

**Response:**

```typescript
{
  success: boolean;
  data: VehicleInfo;
  message: string;
}
```

#### PATCH /api/provider/vehicles/:id

**Purpose:** Update vehicle

**Request:** Partial VehicleInfo

**Response:**

```typescript
{
  success: boolean;
  data: VehicleInfo;
  message: string;
}
```

#### DELETE /api/provider/vehicles/:id

**Purpose:** Delete vehicle

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

#### POST /api/provider/vehicles/:id/set-primary

**Purpose:** Set vehicle as primary

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

### Document Management

#### GET /api/provider/documents

**Purpose:** Get all documents

**Response:**

```typescript
{
  success: boolean
  data: Document[]
  requiredDocuments: DocumentType[]
}
```

#### POST /api/provider/documents

**Purpose:** Upload document

**Request:** FormData

```typescript
{
  type: DocumentType
  frontImage: File
  backImage?: File
  expiryDate?: string
}
```

**Response:**

```typescript
{
  success: boolean
  data: Document
  extractedData?: {
    idNumber?: string
    name?: string
    expiryDate?: string
  }
  message: string
}
```

#### DELETE /api/provider/documents/:id

**Purpose:** Delete document

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

### Bank Account Management

#### GET /api/provider/bank-accounts

**Purpose:** Get all bank accounts

**Response:**

```typescript
{
  success: boolean
  data: BankAccount[] // Account numbers masked
}
```

#### POST /api/provider/bank-accounts

**Purpose:** Add bank account

**Request:**

```typescript
{
  bankCode: string
  accountNumber: string
  accountHolderName: string
  branchName?: string
  password: string // For verification
}
```

**Response:**

```typescript
{
  success: boolean;
  data: BankAccount;
  message: string;
}
```

#### PATCH /api/provider/bank-accounts/:id

**Purpose:** Update bank account

**Request:**

```typescript
{
  branchName?: string
  password: string // Required
}
```

**Response:**

```typescript
{
  success: boolean;
  data: BankAccount;
  message: string;
}
```

#### DELETE /api/provider/bank-accounts/:id

**Purpose:** Delete bank account

**Request:**

```typescript
{
  password: string; // Required
}
```

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

#### POST /api/provider/bank-accounts/:id/set-primary

**Purpose:** Set bank account as primary

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

### Settings Management

#### GET /api/provider/settings

**Purpose:** Get all settings

**Response:**

```typescript
{
  success: boolean
  data: {
    notifications: NotificationPreferences
    workingSchedule: WorkingSchedule
    serviceAreas: ServiceArea[]
    security: SecuritySettings
    language: string
  }
}
```

#### PATCH /api/provider/settings/notifications

**Purpose:** Update notification preferences

**Request:** Partial NotificationPreferences

**Response:**

```typescript
{
  success: boolean;
  data: NotificationPreferences;
  message: string;
}
```

#### PATCH /api/provider/settings/working-hours

**Purpose:** Update working schedule

**Request:** WorkingSchedule

**Response:**

```typescript
{
  success: boolean;
  data: WorkingSchedule;
  message: string;
}
```

#### POST /api/provider/settings/service-areas

**Purpose:** Add service area

**Request:**

```typescript
{
  name: string
  type: 'radius' | 'polygon'
  center?: { lat: number; lng: number }
  radius?: number
  polygon?: Array<{ lat: number; lng: number }>
}
```

**Response:**

```typescript
{
  success: boolean;
  data: ServiceArea;
  message: string;
}
```

#### PATCH /api/provider/settings/service-areas/:id

**Purpose:** Update service area

**Request:** Partial ServiceArea

**Response:**

```typescript
{
  success: boolean;
  data: ServiceArea;
  message: string;
}
```

#### DELETE /api/provider/settings/service-areas/:id

**Purpose:** Delete service area

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

#### PATCH /api/provider/settings/security

**Purpose:** Update security settings

**Request:**

```typescript
{
  twoFactorEnabled?: boolean
  hidePhoneNumber?: boolean
  shareLocationHistory?: boolean
  allowDataAnalytics?: boolean
  currentPassword?: string // Required for sensitive changes
}
```

**Response:**

```typescript
{
  success: boolean;
  data: SecuritySettings;
  message: string;
}
```

#### POST /api/provider/settings/change-password

**Purpose:** Change password

**Request:**

```typescript
{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

### Help & Support

#### GET /api/provider/help/faq

**Purpose:** Get FAQ articles

**Query Parameters:**

- category?: string
- search?: string

**Response:**

```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    question: string;
    answer: string;
    category: string;
    helpful: number;
  }>;
}
```

#### POST /api/provider/help/tickets

**Purpose:** Create support ticket

**Request:**

```typescript
{
  subject: string
  category: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  attachments?: string[]
}
```

**Response:**

```typescript
{
  success: boolean;
  data: {
    ticketId: string;
    status: string;
    createdAt: string;
  }
  message: string;
}
```

#### GET /api/provider/help/tickets

**Purpose:** Get support tickets

**Response:**

```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    subject: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    createdAt: string;
    updatedAt: string;
    lastReply?: string;
  }>;
}
```

### Referral System

#### GET /api/provider/referral

**Purpose:** Get referral code and stats

**Response:**

```typescript
{
  success: boolean;
  data: {
    code: string;
    totalReferrals: number;
    earnedBonus: number;
    pendingBonus: number;
    referrals: Array<{
      name: string;
      joinedAt: string;
      status: "pending" | "active";
      bonusEarned: number;
    }>;
  }
}
```

#### POST /api/provider/referral/share

**Purpose:** Track referral share

**Request:**

```typescript
{
  method: "sms" | "whatsapp" | "line" | "facebook" | "copy";
}
```

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Not authorized for this action
- `NOT_FOUND`: Resource not found
- `DUPLICATE`: Resource already exists
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `INVALID_FILE_TYPE`: Unsupported file type
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

### Validation Error Example

```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: {
      plateNumber: ["Invalid plate number format"],
      year: ["Year must be between 1990 and 2026"]
    }
  }
}
```

## Testing Strategy

### Unit Tests

**Components to Test:**

- ProfileHeader: Avatar display, status badge colors
- PerformanceStats: Number formatting, stat calculations
- PersonalInfoSection: Form validation, auto-save
- VehicleInfoSection: Plate number validation, primary selection
- DocumentsSection: Upload flow, OCR extraction
- BankAccountSection: Account masking, encryption
- NotificationSettings: Toggle functionality, quiet hours
- WorkingHoursSettings: Time slot validation, schedule copy
- ServiceAreaSettings: Map interactions, area calculations

**Test Cases:**

- Valid input acceptance
- Invalid input rejection
- Edge cases (empty, max length, special characters)
- Error message display
- Loading states
- Success confirmations

### Integration Tests

**Flows to Test:**

1. Complete profile setup (new provider)
2. Update personal information
3. Add and verify vehicle
4. Upload and verify documents
5. Add bank account
6. Configure working hours
7. Set service area
8. Change notification preferences
9. Switch roles
10. Logout

### Property-Based Tests

**Properties to Test:**

Property 1: Profile completeness calculation
_For any_ provider profile, the completeness percentage should be between 0 and 100, and should increase when required fields are filled
**Validates: Requirements 10.1, 10.2**

Property 2: Vehicle plate number validation
_For any_ Thai vehicle plate number format, the validation should accept valid formats and reject invalid ones
**Validates: Requirements 2.2**

Property 3: Document expiry tracking
_For any_ document with expiry date, the system should warn when expiry is within 30 days
**Validates: Requirements 3.8**

Property 4: Bank account masking
_For any_ bank account number, the display should show only the last 4 digits
**Validates: Requirements 4.6**

Property 5: Working hours validation
_For any_ time slot, the end time should be after the start time
**Validates: Requirements 6.3**

Property 6: Service area size calculation
_For any_ polygon or radius, the calculated area should be positive and within maximum limits
**Validates: Requirements 7.3**

Property 7: Notification preference persistence
_For any_ notification setting change, the preference should persist across sessions
**Validates: Requirements 5.6**

Property 8: Profile photo compression
_For any_ uploaded image, the compressed version should be smaller than the original while maintaining quality
**Validates: Requirements 1.6**

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading:**

   - Load profile sections on demand
   - Defer non-critical data (referral stats, login history)
   - Use route-based code splitting

2. **Caching:**

   - Cache profile data in Pinia store
   - Cache uploaded images in IndexedDB
   - Use stale-while-revalidate for non-critical data

3. **Image Optimization:**

   - Compress uploads before sending
   - Generate multiple sizes (thumbnail, medium, large)
   - Use WebP format with JPEG fallback
   - Lazy load images below fold

4. **API Optimization:**

   - Batch related requests
   - Use GraphQL for flexible data fetching
   - Implement request debouncing for auto-save
   - Use optimistic updates for better UX

5. **Bundle Size:**
   - Code split by route
   - Tree-shake unused libraries
   - Use dynamic imports for heavy components
   - Minimize third-party dependencies

### Performance Targets

- Initial load: < 2s
- Route transition: < 300ms
- Form submission: < 500ms
- Image upload: < 3s (for 5MB file)
- Auto-save: < 200ms (debounced)

## Security Considerations

### Data Protection

1. **Encryption:**

   - Encrypt bank account numbers at rest
   - Use HTTPS for all API calls
   - Encrypt sensitive data in transit

2. **Authentication:**

   - Require re-authentication for sensitive changes
   - Implement session timeout
   - Support 2FA

3. **Authorization:**

   - Verify provider ownership before updates
   - Implement RLS policies in Supabase
   - Validate all inputs server-side

4. **Privacy:**

   - Mask sensitive data in UI
   - Allow users to control data sharing
   - Implement data deletion

5. **Audit Trail:**
   - Log all profile changes
   - Track document uploads
   - Monitor suspicious activities

### Security Checklist

- [ ] Input validation on all fields
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] File upload validation
- [ ] Secure password storage
- [ ] Session management
- [ ] Audit logging
- [ ] Data encryption

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation:**

   - All interactive elements focusable
   - Logical tab order
   - Keyboard shortcuts for common actions

2. **Screen Reader Support:**

   - Semantic HTML
   - ARIA labels for icons
   - Form field labels
   - Error announcements

3. **Visual Design:**

   - Sufficient color contrast (4.5:1)
   - Focus indicators
   - Text resizing support
   - No color-only information

4. **Forms:**
   - Clear labels
   - Error messages
   - Required field indicators
   - Autocomplete attributes

## Internationalization

### Supported Languages

- Thai (th)
- English (en)

### Translation Keys

```typescript
{
  "profile.header.title": "โปรไฟล์",
  "profile.personal.title": "ข้อมูลส่วนตัว",
  "profile.vehicle.title": "ข้อมูลยานพาหนะ",
  "profile.documents.title": "เอกสาร",
  "profile.bank.title": "บัญชีธนาคาร",
  "profile.settings.title": "ตั้งค่า",
  "profile.help.title": "ช่วยเหลือ",
  // ... more keys
}
```

### Localization Considerations

- Date/time formatting
- Number formatting
- Currency display
- Address formats
- Phone number formats
- Name order (Thai vs Western)

## Future Enhancements

### Phase 2 Features

1. **Advanced Verification:**

   - Facial recognition
   - Live document verification
   - Background check integration

2. **Enhanced Analytics:**

   - Performance insights
   - Earnings predictions
   - Optimization suggestions

3. **Social Features:**

   - Provider community
   - Tips sharing
   - Mentorship program

4. **Gamification:**

   - Achievement badges
   - Leaderboards
   - Challenges and rewards

5. **AI Features:**
   - Smart scheduling suggestions
   - Optimal service area recommendations
   - Earnings optimization tips

### Scalability Considerations

- Microservices architecture for heavy operations
- CDN for static assets
- Database sharding for large user base
- Message queue for async operations
- Caching layer (Redis)
- Load balancing

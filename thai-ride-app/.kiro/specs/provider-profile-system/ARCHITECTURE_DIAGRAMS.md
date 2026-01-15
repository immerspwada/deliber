# 🏗️ Provider Profile System - Architecture Diagrams

## System Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Vue Components]
        Store[Pinia Store]
        Comp[Composables]
    end

    subgraph "API Layer"
        Edge[Edge Functions]
        RPC[RPC Functions]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
        Storage[Storage Buckets]
        RT[Realtime]
    end

    UI --> Store
    UI --> Comp
    Comp --> Edge
    Comp --> RPC
    Edge --> DB
    Edge --> Storage
    RPC --> DB
    RT --> Store
```

## Component Hierarchy

```mermaid
graph TD
    Main[ProviderProfileView.vue]

    Main --> Header[ProfileHeader.vue]
    Main --> Stats[PerformanceStats.vue]
    Main --> Notif[NotificationToggle.vue]
    Main --> Menu[ProfileMenu.vue]
    Main --> Switch[RoleSwitcher.vue]
    Main --> Logout[LogoutButton.vue]

    Menu --> Personal[PersonalInfoSection]
    Menu --> Vehicle[VehicleInfoSection]
    Menu --> Docs[DocumentsSection]
    Menu --> Bank[BankAccountSection]
    Menu --> Settings[SettingsSection]
    Menu --> Help[HelpSection]

    Personal --> Photo[ProfilePhotoUpload]
    Personal --> Emergency[EmergencyContactForm]

    Vehicle --> VForm[VehicleForm]
    Vehicle --> VCard[VehicleCard]

    Docs --> DUpload[DocumentUploadModal]
    Docs --> DCard[DocumentCard]
    Docs --> DPreview[DocumentPreviewModal]

    Bank --> BForm[BankAccountForm]
    Bank --> BCard[BankAccountCard]

    Settings --> SNot[NotificationSettings]
    Settings --> SWork[WorkingHoursSettings]
    Settings --> SArea[ServiceAreaSettings]
    Settings --> SSec[SecuritySettings]
```

## Data Flow: Profile Update

```mermaid
sequenceDiagram
    participant User
    participant Component
    participant Composable
    participant API
    participant Database

    User->>Component: Edit Personal Info
    Component->>Component: Validate Input
    Component->>Composable: updatePersonalInfo()
    Composable->>API: PATCH /api/provider/profile/personal
    API->>API: Validate & Sanitize
    API->>Database: UPDATE providers_v2
    Database-->>API: Success
    API-->>Composable: Updated Data
    Composable->>Composable: Update Store
    Composable-->>Component: Success
    Component-->>User: Show Confirmation
```

## Data Flow: Document Upload

```mermaid
sequenceDiagram
    participant User
    participant Component
    participant Composable
    participant API
    participant Storage
    participant Database

    User->>Component: Select Document
    Component->>Component: Validate File
    Component->>Composable: uploadDocument()
    Composable->>API: POST /api/provider/documents
    API->>Storage: Upload Images
    Storage-->>API: Image URLs
    API->>API: OCR Extraction
    API->>Database: INSERT provider_documents
    Database-->>API: Document Record
    API-->>Composable: Document Data
    Composable->>Composable: Update Store
    Composable-->>Component: Success
    Component-->>User: Show Preview
```

## Database Schema Relationships

```mermaid
erDiagram
    providers_v2 ||--o{ provider_vehicles : has
    providers_v2 ||--o{ provider_documents : has
    providers_v2 ||--o{ provider_bank_accounts : has
    providers_v2 ||--|| provider_settings : has
    providers_v2 ||--o{ provider_service_areas : has
    providers_v2 ||--o{ provider_emergency_contacts : has
    providers_v2 ||--o{ provider_support_tickets : has

    providers_v2 {
        uuid id PK
        uuid user_id FK
        string first_name
        string last_name
        string email
        string phone_number
        string profile_image_url
        int profile_completeness
        string referral_code
        string language_preference
    }

    provider_vehicles {
        uuid id PK
        uuid provider_id FK
        enum type
        string plate_number
        string brand
        string model
        int year
        string color
        boolean is_primary
    }

    provider_documents {
        uuid id PK
        uuid provider_id FK
        enum type
        enum status
        string front_image_url
        string back_image_url
        date expiry_date
    }

    provider_bank_accounts {
        uuid id PK
        uuid provider_id FK
        string bank_code
        string account_number_encrypted
        string account_holder_name
        boolean is_primary
    }

    provider_settings {
        uuid id PK
        uuid provider_id FK
        jsonb notification_preferences
        jsonb working_schedule
        jsonb security_settings
    }

    provider_service_areas {
        uuid id PK
        uuid provider_id FK
        string name
        enum type
        geography center
        int radius
        geography polygon
        boolean is_active
    }
```

## State Management Flow

```mermaid
graph LR
    subgraph "Component"
        C1[PersonalInfoSection]
        C2[VehicleInfoSection]
        C3[DocumentsSection]
    end

    subgraph "Composable"
        Comp1[useProviderProfile]
        Comp2[useVehicleManagement]
        Comp3[useDocumentManager]
    end

    subgraph "Pinia Store"
        Store[providerStore]
    end

    subgraph "API"
        API1[Profile API]
        API2[Vehicle API]
        API3[Document API]
    end

    C1 --> Comp1
    C2 --> Comp2
    C3 --> Comp3

    Comp1 --> Store
    Comp2 --> Store
    Comp3 --> Store

    Comp1 --> API1
    Comp2 --> API2
    Comp3 --> API3

    API1 --> Store
    API2 --> Store
    API3 --> Store
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client Side"
        Input[User Input]
        Validate[Client Validation]
        Encrypt[Client Encryption]
    end

    subgraph "Network"
        HTTPS[HTTPS/TLS]
    end

    subgraph "Server Side"
        Auth[Authentication]
        RLS[Row Level Security]
        ServerValidate[Server Validation]
        ServerEncrypt[Server Encryption]
    end

    subgraph "Database"
        EncryptedData[(Encrypted Data)]
        AuditLog[(Audit Log)]
    end

    Input --> Validate
    Validate --> Encrypt
    Encrypt --> HTTPS
    HTTPS --> Auth
    Auth --> RLS
    RLS --> ServerValidate
    ServerValidate --> ServerEncrypt
    ServerEncrypt --> EncryptedData
    ServerEncrypt --> AuditLog
```

## Profile Completeness Calculation

```mermaid
graph TD
    Start[Start Calculation]

    Start --> Personal{Personal Info<br/>Complete?}
    Personal -->|Yes| P20[+20%]
    Personal -->|No| P0[+0%]

    P20 --> Vehicle{Vehicle<br/>Added?}
    P0 --> Vehicle
    Vehicle -->|Yes| V20[+20%]
    Vehicle -->|No| V0[+0%]

    V20 --> Docs{Documents<br/>Verified?}
    V0 --> Docs
    Docs -->|All| D30[+30%]
    Docs -->|Partial| D15[+15%]
    Docs -->|None| D0[+0%]

    D30 --> Bank{Bank Account<br/>Added?}
    D15 --> Bank
    D0 --> Bank
    Bank -->|Yes| B15[+15%]
    Bank -->|No| B0[+0%]

    B15 --> Emergency{Emergency<br/>Contact?}
    B0 --> Emergency
    Emergency -->|Yes| E10[+10%]
    Emergency -->|No| E0[+0%]

    E10 --> Photo{Profile<br/>Photo?}
    E0 --> Photo
    Photo -->|Yes| Ph5[+5%]
    Photo -->|No| Ph0[+0%]

    Ph5 --> Total[Calculate Total]
    Ph0 --> Total
    Total --> Result[Return %]
```

## Document Verification Flow

```mermaid
stateDiagram-v2
    [*] --> PendingUpload: Initial State

    PendingUpload --> Uploaded: User Uploads
    Uploaded --> UnderReview: Auto Submit

    UnderReview --> Verified: Admin Approves
    UnderReview --> Rejected: Admin Rejects

    Rejected --> Uploaded: User Re-uploads

    Verified --> Expired: Expiry Date Passed
    Expired --> Uploaded: User Re-uploads

    Verified --> [*]: Active
```

## Working Hours Configuration

```mermaid
graph LR
    subgraph "Weekly Schedule"
        Mon[Monday]
        Tue[Tuesday]
        Wed[Wednesday]
        Thu[Thursday]
        Fri[Friday]
        Sat[Saturday]
        Sun[Sunday]
    end

    subgraph "Time Slots"
        Slot1[08:00-12:00]
        Slot2[13:00-17:00]
        Slot3[18:00-22:00]
    end

    subgraph "Auto Actions"
        Online[Set Online]
        Offline[Set Offline]
        Notify[Send Notification]
    end

    Mon --> Slot1
    Mon --> Slot2
    Tue --> Slot1
    Tue --> Slot3

    Slot1 --> Online
    Slot2 --> Online
    Slot3 --> Online

    Online --> Notify
    Offline --> Notify
```

## Service Area Selection

```mermaid
graph TB
    Start[Start]

    Start --> Type{Select Type}

    Type -->|Radius| Radius[Draw Circle]
    Type -->|Polygon| Polygon[Draw Polygon]

    Radius --> Center[Set Center Point]
    Center --> RadiusValue[Set Radius]
    RadiusValue --> CalcArea1[Calculate Area]

    Polygon --> Points[Add Points]
    Points --> Close[Close Polygon]
    Close --> CalcArea2[Calculate Area]

    CalcArea1 --> Validate{Area Valid?}
    CalcArea2 --> Validate

    Validate -->|Yes| Save[Save Area]
    Validate -->|No| Error[Show Error]

    Error --> Type
    Save --> End[End]
```

## API Request Flow with Rate Limiting

```mermaid
sequenceDiagram
    participant Client
    participant RateLimit
    participant Auth
    participant API
    participant Database

    Client->>RateLimit: Request

    alt Rate Limit Exceeded
        RateLimit-->>Client: 429 Too Many Requests
    else Within Limit
        RateLimit->>Auth: Check Auth

        alt Not Authenticated
            Auth-->>Client: 401 Unauthorized
        else Authenticated
            Auth->>API: Process Request
            API->>Database: Query/Update
            Database-->>API: Result
            API-->>Client: 200 Success
        end
    end
```

## Offline Support Architecture

```mermaid
graph TB
    subgraph "Online Mode"
        API1[API Calls]
        DB1[(Database)]
        Cache1[Update Cache]
    end

    subgraph "Offline Mode"
        Cache2[Read Cache]
        Queue[Update Queue]
    end

    subgraph "Sync"
        Detect[Detect Online]
        Process[Process Queue]
        Resolve[Resolve Conflicts]
    end

    API1 --> DB1
    DB1 --> Cache1

    Cache2 --> Queue

    Detect --> Process
    Process --> Resolve
    Resolve --> API1
```

## Performance Optimization Strategy

```mermaid
graph LR
    subgraph "Load Time"
        Lazy[Lazy Loading]
        Split[Code Splitting]
        Preload[Resource Preload]
    end

    subgraph "Runtime"
        Cache[Caching]
        Debounce[Debouncing]
        Optimize[Optimistic Updates]
    end

    subgraph "Assets"
        Compress[Image Compression]
        WebP[WebP Format]
        CDN[CDN Delivery]
    end

    subgraph "API"
        Batch[Batch Requests]
        Pagination[Pagination]
        GraphQL[GraphQL]
    end

    Lazy --> Fast[Fast Load]
    Split --> Fast
    Preload --> Fast

    Cache --> Smooth[Smooth UX]
    Debounce --> Smooth
    Optimize --> Smooth

    Compress --> Small[Small Size]
    WebP --> Small
    CDN --> Small

    Batch --> Efficient[Efficient API]
    Pagination --> Efficient
    GraphQL --> Efficient
```

---

**Note:** These diagrams provide a visual overview of the system architecture. Refer to the detailed design document for implementation specifics.

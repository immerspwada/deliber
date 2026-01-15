# Implementation Plan: Provider Profile System

## Overview

Implementation plan สำหรับ Provider Profile System แบ่งออกเป็น 15 phases หลัก ครอบคลุมตั้งแต่การสร้าง infrastructure, components, API endpoints, ไปจนถึง testing และ optimization

## Tasks

- [ ] 1. Setup Infrastructure and Database Schema

  - Create database migrations for new tables
  - Add columns to providers_v2 table: profile_completeness, referral_code, language_preference
  - Create provider_vehicles table
  - Create provider_documents table
  - Create provider_bank_accounts table (with encryption)
  - Create provider_settings table
  - Create provider_service_areas table
  - Create provider_emergency_contacts table
  - Create provider_support_tickets table
  - Setup RLS policies for all new tables
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 7.1, 17.1, 13.4_

- [ ] 2. Create Core Composables

  - [ ] 2.1 Create useProviderProfile composable

    - Implement loadProfile() function
    - Implement updatePersonalInfo() function
    - Implement uploadProfilePhoto() function
    - Implement calculateCompleteness() function
    - Add reactive state management
    - _Requirements: 1.1, 1.2, 1.4, 10.1, 10.2_

  - [ ] 2.2 Create useVehicleManagement composable

    - Implement loadVehicles() function
    - Implement addVehicle() function
    - Implement updateVehicle() function
    - Implement deleteVehicle() function
    - Implement setPrimaryVehicle() function
    - Add plate number validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 2.3 Create useDocumentManager composable

    - Implement loadDocuments() function
    - Implement uploadDocument() function
    - Implement deleteDocument() function
    - Implement checkExpiryDates() function
    - Add file validation (type, size)
    - Add OCR integration placeholder
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8_

  - [ ] 2.4 Create useBankAccount composable

    - Implement loadBankAccounts() function
    - Implement addBankAccount() function
    - Implement updateBankAccount() function
    - Implement deleteBankAccount() function
    - Implement setPrimaryBankAccount() function
    - Add account number masking
    - Add encryption helpers
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 2.5 Create useProfileSettings composable
    - Implement loadSettings() function
    - Implement updateNotificationPreferences() function
    - Implement updateWorkingSchedule() function
    - Implement updateSecuritySettings() function
    - Implement updateLanguage() function
    - _Requirements: 5.1, 5.2, 5.6, 6.1, 6.2, 11.1, 12.1_

- [ ] 3. Build Profile Header Components

  - [ ] 3.1 Create ProfileHeader.vue component

    - Display avatar with initials fallback
    - Show provider name
    - Display status badge with color coding
    - Add click handler for photo upload
    - _Requirements: 1.1, 9.1, 9.2, 9.3, 16.5_

  - [ ] 3.2 Create StatusBadge.vue component

    - Implement color coding logic
    - Add status text mapping
    - Add click handler for status details
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 3.3 Create PerformanceStats.vue component
    - Display rating, jobs, earnings
    - Add number formatting
    - Add dividers between stats
    - Add click handler for detailed view
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 4. Build Personal Information Section

  - [ ] 4.1 Create PersonalInfoSection.vue component

    - Create form layout
    - Add input fields with validation
    - Implement inline editing
    - Add auto-save on blur
    - Show validation errors
    - _Requirements: 1.1, 1.2, 1.3, 1.7_

  - [ ] 4.2 Create ProfilePhotoUpload.vue component

    - Add file input with preview
    - Implement drag & drop
    - Add image cropping tool
    - Implement compression
    - Show upload progress
    - _Requirements: 1.5, 1.6, 16.1, 16.2, 16.3, 16.4, 16.6_

  - [ ] 4.3 Create EmergencyContactForm.vue component
    - Add contact fields
    - Implement validation
    - Allow multiple contacts (max 3)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.6_

- [ ] 5. Build Vehicle Management Section

  - [ ] 5.1 Create VehicleInfoSection.vue component

    - Display vehicle list
    - Add "Add Vehicle" button
    - Show primary vehicle indicator
    - Add edit/delete actions
    - _Requirements: 2.1, 2.5, 2.6_

  - [ ] 5.2 Create VehicleForm.vue component

    - Add vehicle type selector
    - Add plate number input with validation
    - Add province selector
    - Add brand/model/year inputs
    - Add color selector
    - Implement Thai plate format validation
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 5.3 Create VehicleCard.vue component
    - Display vehicle info
    - Show primary badge
    - Add edit/delete buttons
    - Add photo gallery
    - _Requirements: 2.1, 2.5, 2.6_

- [ ] 6. Build Document Management Section

  - [ ] 6.1 Create DocumentsSection.vue component

    - Display required documents list
    - Show document status for each
    - Add upload buttons
    - Show expiry warnings
    - _Requirements: 3.1, 3.8_

  - [ ] 6.2 Create DocumentUploadModal.vue component

    - Add file upload interface
    - Support front/back image upload
    - Add camera capture on mobile
    - Show upload progress
    - Display OCR extracted data
    - Allow data confirmation
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ] 6.3 Create DocumentCard.vue component

    - Display document type and status
    - Show expiry date
    - Add preview button
    - Add re-upload button for rejected
    - Show rejection reason
    - _Requirements: 3.1, 3.6, 3.7, 3.8_

  - [ ] 6.4 Create DocumentPreviewModal.vue component
    - Display document images
    - Add zoom functionality
    - Show extracted data
    - _Requirements: 3.1_

- [ ] 7. Build Bank Account Section

  - [ ] 7.1 Create BankAccountSection.vue component

    - Display bank account list
    - Add "Add Account" button
    - Show primary account indicator
    - Add edit/delete actions
    - _Requirements: 4.1, 4.5_

  - [ ] 7.2 Create BankAccountForm.vue component

    - Add bank selector dropdown
    - Add account number input
    - Add account holder name input
    - Add branch name input
    - Implement validation
    - Add password confirmation
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

  - [ ] 7.3 Create BankAccountCard.vue component
    - Display masked account number
    - Show bank name and logo
    - Show primary badge
    - Add edit/delete buttons
    - _Requirements: 4.5, 4.6_

- [ ] 8. Build Notification Settings

  - [ ] 8.1 Create NotificationSettings.vue component

    - Add push notification toggle
    - Show permission status
    - Add category toggles
    - Add quiet hours settings
    - Add job alert filters
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ] 8.2 Create NotificationToggle.vue component

    - Implement toggle switch UI
    - Handle permission request
    - Show permission denied message
    - Add loading state
    - _Requirements: 5.2, 5.3, 5.5_

  - [ ] 8.3 Create QuietHoursSettings.vue component

    - Add time pickers
    - Add enable/disable toggle
    - Validate time range
    - _Requirements: 5.1_

  - [ ] 8.4 Create JobAlertFilters.vue component
    - Add min earnings input
    - Add max distance slider
    - Add service type checkboxes
    - _Requirements: 5.1_

- [ ] 9. Build Working Hours Settings

  - [ ] 9.1 Create WorkingHoursSettings.vue component

    - Display weekly calendar grid
    - Add flexible mode toggle
    - Show time slots for each day
    - Add "Copy to other days" feature
    - _Requirements: 6.1, 6.2, 6.6, 6.7_

  - [ ] 9.2 Create DaySchedule.vue component

    - Display day name
    - Show time slots
    - Add "Add Slot" button
    - Add remove slot button
    - _Requirements: 6.2, 6.7_

  - [ ] 9.3 Create TimeSlotPicker.vue component
    - Add start time picker
    - Add end time picker
    - Validate time range
    - _Requirements: 6.2, 6.3_

- [ ] 10. Build Service Area Settings

  - [ ] 10.1 Create ServiceAreaSettings.vue component

    - Display interactive map
    - Show existing service areas
    - Add drawing tools
    - Add area list
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ] 10.2 Create ServiceAreaMap.vue component

    - Initialize Leaflet map
    - Add draw polygon tool
    - Add draw circle tool
    - Add edit mode
    - Calculate area size
    - Highlight restricted zones
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 7.7_

  - [ ] 10.3 Create ServiceAreaCard.vue component
    - Display area name
    - Show area size
    - Add active/inactive toggle
    - Add edit/delete buttons
    - _Requirements: 7.4_

- [ ] 11. Build Security Settings

  - [ ] 11.1 Create SecuritySettings.vue component

    - Add password change section
    - Add 2FA setup section
    - Add privacy toggles
    - Add login history viewer
    - Add account deletion section
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ] 11.2 Create PasswordChangeForm.vue component

    - Add current password input
    - Add new password input
    - Add confirm password input
    - Implement validation
    - Show password strength
    - _Requirements: 11.3_

  - [ ] 11.3 Create TwoFactorSetup.vue component

    - Show QR code
    - Add verification code input
    - Add backup codes display
    - _Requirements: 11.4_

  - [ ] 11.4 Create LoginHistoryList.vue component
    - Display login records
    - Show device and location
    - Show timestamp
    - Highlight suspicious logins
    - _Requirements: 11.5_

- [ ] 12. Build Help & Support Section

  - [ ] 12.1 Create HelpSection.vue component

    - Display help categories
    - Add search bar
    - Show FAQ list
    - Add contact support button
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 12.2 Create FAQList.vue component

    - Display FAQ items
    - Add expand/collapse
    - Add search filter
    - Track helpful votes
    - _Requirements: 13.1, 13.2, 13.7_

  - [ ] 12.3 Create SupportTicketForm.vue component

    - Add subject input
    - Add category selector
    - Add description textarea
    - Add priority selector
    - Add file attachments
    - _Requirements: 13.3, 13.4_

  - [ ] 12.4 Create SupportTicketList.vue component
    - Display ticket list
    - Show status badges
    - Add filter by status
    - Add click to view details
    - _Requirements: 13.5_

- [ ] 13. Build Additional Features

  - [ ] 13.1 Create RoleSwitcher.vue component

    - Check if user has dual roles
    - Add switch button
    - Handle navigation
    - Prevent switch during active job
    - _Requirements: 14.1, 14.2, 14.3, 14.6, 14.7_

  - [ ] 13.2 Create LogoutButton.vue component

    - Add confirmation dialog
    - Handle logout
    - Clear session data
    - Set provider offline
    - Redirect to login
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.7_

  - [ ] 13.3 Create ReferralCodeDisplay.vue component

    - Display referral code
    - Add share buttons
    - Show referral stats
    - Track sharing method
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [ ] 13.4 Create ProfileCompletenessBar.vue component

    - Display completion percentage
    - Show progress bar
    - Add checklist of missing items
    - Highlight required items
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 13.5 Create LanguageSelector.vue component
    - Display language options
    - Handle language change
    - Persist preference
    - Reload content
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 14. Implement API Endpoints (Supabase Edge Functions)

  - [ ] 14.1 Create profile management endpoints

    - GET /api/provider/profile
    - PATCH /api/provider/profile/personal
    - POST /api/provider/profile/photo
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ] 14.2 Create vehicle management endpoints

    - GET /api/provider/vehicles
    - POST /api/provider/vehicles
    - PATCH /api/provider/vehicles/:id
    - DELETE /api/provider/vehicles/:id
    - POST /api/provider/vehicles/:id/set-primary
    - _Requirements: 2.1, 2.3, 2.4, 2.6_

  - [ ] 14.3 Create document management endpoints

    - GET /api/provider/documents
    - POST /api/provider/documents
    - DELETE /api/provider/documents/:id
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ] 14.4 Create bank account endpoints

    - GET /api/provider/bank-accounts
    - POST /api/provider/bank-accounts
    - PATCH /api/provider/bank-accounts/:id
    - DELETE /api/provider/bank-accounts/:id
    - POST /api/provider/bank-accounts/:id/set-primary
    - _Requirements: 4.1, 4.4, 4.5, 4.7_

  - [ ] 14.5 Create settings endpoints

    - GET /api/provider/settings
    - PATCH /api/provider/settings/notifications
    - PATCH /api/provider/settings/working-hours
    - POST /api/provider/settings/service-areas
    - PATCH /api/provider/settings/service-areas/:id
    - DELETE /api/provider/settings/service-areas/:id
    - PATCH /api/provider/settings/security
    - POST /api/provider/settings/change-password
    - _Requirements: 5.1, 5.6, 6.1, 6.2, 7.1, 7.2, 11.1, 11.3_

  - [ ] 14.6 Create help & support endpoints

    - GET /api/provider/help/faq
    - POST /api/provider/help/tickets
    - GET /api/provider/help/tickets
    - _Requirements: 13.1, 13.2, 13.4, 13.5_

  - [ ] 14.7 Create referral endpoints
    - GET /api/provider/referral
    - POST /api/provider/referral/share
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [ ] 15. Implement Validation and Security

  - [ ] 15.1 Add input validation schemas (Zod)

    - Personal info validation
    - Vehicle info validation
    - Bank account validation
    - Document validation
    - Settings validation
    - _Requirements: 1.3, 1.7, 2.2, 4.2, 4.3_

  - [ ] 15.2 Implement encryption for sensitive data

    - Bank account number encryption
    - Tax ID encryption
    - Emergency contact encryption
    - _Requirements: 4.4, 18.2_

  - [ ] 15.3 Add RLS policies

    - Provider can only access own data
    - Admin can access all data
    - Audit log for sensitive changes
    - _Requirements: 4.4, 11.1_

  - [ ] 15.4 Implement rate limiting
    - Profile updates: 10/minute
    - Photo uploads: 5/minute
    - Document uploads: 10/minute
    - Password changes: 3/hour
    - _Requirements: 11.6_

- [ ] 16. Add Offline Support

  - [ ] 16.1 Implement profile data caching

    - Cache profile in IndexedDB
    - Cache photos in IndexedDB
    - Cache documents in IndexedDB
    - _Requirements: 20.1, 20.6_

  - [ ] 16.2 Add offline indicators

    - Show offline badge
    - Disable edit functionality
    - Show "requires internet" messages
    - _Requirements: 20.2, 20.7_

  - [ ] 16.3 Implement sync queue
    - Queue updates when offline
    - Auto-sync when online
    - Handle sync conflicts
    - _Requirements: 20.3, 20.4, 20.5_

- [ ] 17. Implement Realtime Features

  - [ ] 17.1 Add realtime profile updates

    - Subscribe to profile changes
    - Update UI on changes
    - Show "updated by admin" notification
    - _Requirements: 1.4_

  - [ ] 17.2 Add realtime document status updates

    - Subscribe to document verification
    - Show notification on approval/rejection
    - Update status badge
    - _Requirements: 3.6, 3.7_

  - [ ] 17.3 Add realtime notification for expiry
    - Check document expiry daily
    - Send push notification
    - Show in-app alert
    - _Requirements: 3.8_

- [ ] 18. Add Internationalization

  - [ ] 18.1 Create translation files

    - Create th.json for Thai
    - Create en.json for English
    - Add all translation keys
    - _Requirements: 12.1, 12.2_

  - [ ] 18.2 Implement i18n in components

    - Use $t() for all text
    - Format dates by locale
    - Format numbers by locale
    - Format currency by locale
    - _Requirements: 12.3, 12.4, 12.5_

  - [ ] 18.3 Add language switcher
    - Persist language preference
    - Reload content on change
    - Update document title
    - _Requirements: 12.1, 12.2, 12.3, 12.6_

- [ ] 19. Optimize Performance

  - [ ] 19.1 Implement lazy loading

    - Lazy load profile sections
    - Lazy load images
    - Lazy load heavy components
    - _Requirements: Performance_

  - [ ] 19.2 Add image optimization

    - Compress uploads
    - Generate thumbnails
    - Use WebP format
    - Implement lazy loading
    - _Requirements: 1.6, 16.3_

  - [ ] 19.3 Implement request optimization
    - Batch related requests
    - Debounce auto-save
    - Use optimistic updates
    - Cache API responses
    - _Requirements: Performance_

- [ ] 20. Add Analytics and Monitoring

  - [ ] 20.1 Implement event tracking

    - Track profile views
    - Track section visits
    - Track form submissions
    - Track errors
    - _Requirements: Analytics_

  - [ ] 20.2 Add performance monitoring

    - Track page load time
    - Track API response time
    - Track image load time
    - Track user interactions
    - _Requirements: Performance_

  - [ ] 20.3 Implement error logging
    - Log API errors
    - Log validation errors
    - Log upload errors
    - Send to error tracking service
    - _Requirements: Error Handling_

- [ ] 21. Testing

  - [ ]\* 21.1 Write unit tests for composables

    - Test useProviderProfile
    - Test useVehicleManagement
    - Test useDocumentManager
    - Test useBankAccount
    - Test useProfileSettings
    - _Requirements: All_

  - [ ]\* 21.2 Write unit tests for components

    - Test ProfileHeader
    - Test PerformanceStats
    - Test PersonalInfoSection
    - Test VehicleInfoSection
    - Test DocumentsSection
    - Test BankAccountSection
    - Test NotificationSettings
    - Test WorkingHoursSettings
    - Test ServiceAreaSettings
    - Test SecuritySettings
    - _Requirements: All_

  - [ ]\* 21.3 Write integration tests

    - Test complete profile setup flow
    - Test vehicle add/edit/delete flow
    - Test document upload flow
    - Test bank account add/edit flow
    - Test settings update flow
    - _Requirements: All_

  - [ ]\* 21.4 Write property-based tests

    - Test profile completeness calculation
    - Test vehicle plate validation
    - Test document expiry tracking
    - Test bank account masking
    - Test working hours validation
    - Test service area calculation
    - _Requirements: 10.1, 2.2, 3.8, 4.6, 6.3, 7.3_

  - [ ]\* 21.5 Write E2E tests
    - Test full profile setup journey
    - Test role switching
    - Test logout flow
    - Test offline mode
    - _Requirements: All_

- [ ] 22. Documentation

  - [ ]\* 22.1 Write component documentation

    - Document all props
    - Document all events
    - Document all slots
    - Add usage examples
    - _Requirements: Documentation_

  - [ ]\* 22.2 Write API documentation

    - Document all endpoints
    - Document request/response formats
    - Document error codes
    - Add example requests
    - _Requirements: Documentation_

  - [ ]\* 22.3 Write user guide
    - Create setup guide
    - Create feature guides
    - Create troubleshooting guide
    - Add screenshots
    - _Requirements: Documentation_

- [ ] 23. Final Integration and Polish

  - [ ] 23.1 Integrate with existing provider system

    - Update ProviderLayout navigation
    - Add profile link to menu
    - Update provider store
    - Test with existing features
    - _Requirements: Integration_

  - [ ] 23.2 Add loading states

    - Add skeleton loaders
    - Add progress indicators
    - Add spinners
    - _Requirements: UX_

  - [ ] 23.3 Add error states

    - Add error messages
    - Add retry buttons
    - Add fallback UI
    - _Requirements: Error Handling_

  - [ ] 23.4 Add empty states

    - Add empty vehicle list state
    - Add empty document list state
    - Add empty bank account state
    - Add helpful messages
    - _Requirements: UX_

  - [ ] 23.5 Polish UI/UX
    - Add animations
    - Add transitions
    - Add haptic feedback
    - Improve accessibility
    - Test on mobile devices
    - _Requirements: UX, Accessibility_

- [ ] 24. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Testing tasks are marked optional but highly recommended
- Documentation tasks are optional but improve maintainability
- Focus on core functionality first (tasks 1-14) before optimization
- Security implementation (task 15) is critical and should not be skipped
- Offline support (task 16) can be deferred to Phase 2
- Realtime features (task 17) can be deferred to Phase 2
- Performance optimization (task 19) should be done after core features work

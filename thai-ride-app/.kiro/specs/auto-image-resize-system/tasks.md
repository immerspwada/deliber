# Auto Image Resize & Upload System - Tasks

## ✅ Phase 1: Core Implementation (COMPLETED)

### Task 1.1: Setup Dependencies ✅

- [x] Install `browser-image-compression@^2.0.2`
- [x] Install `heic2any@^0.0.4`
- [x] Update package.json

### Task 1.2: Create Utility Function ✅

- [x] Create `src/utils/imageResize.ts`
- [x] Implement `resizeImage()` function
- [x] Add HEIC conversion support
- [x] Add logging and error handling
- [x] Add file size formatting helper

**Files Created:**

- `src/utils/imageResize.ts`

### Task 1.3: Create Storage Bucket ✅

- [x] Create migration file
- [x] Create `ride-evidence` bucket
- [x] Configure bucket settings (5MB limit, MIME types)
- [x] Create RLS policies (5 policies)
- [x] Test bucket access

**Files Created:**

- `supabase/migrations/269_ride_evidence_storage.sql`

**MCP Actions:**

- ✅ Used supabase-hosted MCP
- ✅ Applied migration via `apply_migration`
- ✅ Verified bucket configuration
- ✅ Verified RLS policies
- ✅ Checked security advisors

### Task 1.4: Update PhotoEvidence Component ✅

- [x] Import `resizeImage` utility
- [x] Add resize logic before upload
- [x] Add progress indicators
- [x] Add error handling
- [x] Add file size display

**Files Modified:**

- `src/components/provider/PhotoEvidence.vue`

### Task 1.5: Documentation ✅

- [x] Create implementation guide
- [x] Create storage bucket setup guide
- [x] Document testing steps

**Files Created:**

- `IMAGE_RESIZE_AUTO_IMPLEMENTATION.md`
- `STORAGE_BUCKET_SETUP.md`

## 🚧 Phase 2: Enhanced UX (NEXT)

### Task 2.1: Improve Progress Indicators

- [ ] Add detailed progress bar component
- [ ] Show percentage during resize
- [ ] Show percentage during upload
- [ ] Add smooth animations
- [ ] Add success/error animations

**Estimated Time:** 2 hours

**Files to Modify:**

- `src/components/provider/PhotoEvidence.vue`

**Acceptance Criteria:**

- Progress bar shows 0-100%
- Smooth transitions between states
- Clear visual feedback

### Task 2.2: Add Image Preview Modal

- [ ] Create `ImagePreviewModal.vue` component
- [ ] Show full-size preview
- [ ] Display file metadata (size, dimensions, format)
- [ ] Add zoom controls
- [ ] Add close button

**Estimated Time:** 3 hours

**Files to Create:**

- `src/components/provider/ImagePreviewModal.vue`

**Acceptance Criteria:**

- Modal opens on image click
- Shows full-size image
- Displays metadata
- Responsive on mobile

### Task 2.3: Improve Error Messages

- [ ] Create error message component
- [ ] Add specific error messages for each case
- [ ] Add retry button
- [ ] Add help text/links
- [ ] Add error logging

**Estimated Time:** 2 hours

**Files to Modify:**

- `src/components/provider/PhotoEvidence.vue`
- `src/utils/imageResize.ts`

**Error Cases:**

- Invalid file type
- File too large
- HEIC conversion failed
- Network timeout
- Storage quota exceeded
- RLS policy violation

### Task 2.4: Add Retry Mechanism

- [ ] Implement exponential backoff
- [ ] Add retry counter (max 3 attempts)
- [ ] Show retry status
- [ ] Handle network offline/online
- [ ] Persist failed uploads

**Estimated Time:** 3 hours

**Files to Create:**

- `src/composables/useRetryUpload.ts`

**Acceptance Criteria:**

- Auto-retry on network errors
- Max 3 retry attempts
- Exponential backoff (1s, 2s, 4s)
- Clear retry status

## 📋 Phase 3: Advanced Features (FUTURE)

### Task 3.1: Batch Upload

- [ ] Support multiple file selection
- [ ] Show upload queue
- [ ] Upload files in parallel (max 3)
- [ ] Show overall progress
- [ ] Handle partial failures

**Estimated Time:** 5 hours

**Files to Create:**

- `src/composables/useBatchUpload.ts`
- `src/components/provider/UploadQueue.vue`

### Task 3.2: Image Editing Tools

- [ ] Add crop tool
- [ ] Add rotate tool
- [ ] Add brightness/contrast
- [ ] Add filters
- [ ] Preview before upload

**Estimated Time:** 8 hours

**Dependencies:**

- `cropperjs` or similar library

### Task 3.3: Thumbnail Generation

- [ ] Create Edge Function for thumbnail generation
- [ ] Generate thumbnails on upload
- [ ] Store thumbnails in separate folder
- [ ] Update RLS policies
- [ ] Use thumbnails in list views

**Estimated Time:** 4 hours

**Files to Create:**

- `supabase/functions/generate-thumbnail/index.ts`

### Task 3.4: Image Watermark

- [ ] Create Edge Function for watermarking
- [ ] Add watermark to uploaded images
- [ ] Configure watermark settings
- [ ] Support text and image watermarks

**Estimated Time:** 4 hours

**Files to Create:**

- `supabase/functions/add-watermark/index.ts`

## 🧪 Phase 4: Testing & Quality (ONGOING)

### Task 4.1: Unit Tests

- [ ] Test `imageResize.ts` utility
  - [ ] Test resize logic
  - [ ] Test HEIC conversion
  - [ ] Test error handling
  - [ ] Test file size validation
- [ ] Test `PhotoEvidence.vue` component
  - [ ] Test file selection
  - [ ] Test upload flow
  - [ ] Test error states
  - [ ] Test success states

**Estimated Time:** 4 hours

**Files to Create:**

- `src/tests/imageResize.unit.test.ts`
- `src/tests/PhotoEvidence.unit.test.ts`

### Task 4.2: Integration Tests

- [ ] Test full upload flow
- [ ] Test RLS policies
- [ ] Test storage bucket configuration
- [ ] Test error scenarios
- [ ] Test network offline/online

**Estimated Time:** 3 hours

**Files to Create:**

- `src/tests/photo-evidence.integration.test.ts`

### Task 4.3: E2E Tests

- [ ] Test upload from Provider Job Detail
- [ ] Test multiple uploads
- [ ] Test error recovery
- [ ] Test on different devices
- [ ] Test on different browsers

**Estimated Time:** 4 hours

**Files to Create:**

- `e2e/photo-evidence.spec.ts`

### Task 4.4: Performance Testing

- [ ] Benchmark resize times
- [ ] Benchmark upload times
- [ ] Test with various file sizes (1MB - 50MB)
- [ ] Test with various formats (JPEG, PNG, HEIC)
- [ ] Optimize bottlenecks

**Estimated Time:** 3 hours

### Task 4.5: Security Audit

- [ ] Review RLS policies
- [ ] Test unauthorized access
- [ ] Test file type validation
- [ ] Test file size limits
- [ ] Review EXIF data handling

**Estimated Time:** 2 hours

## 📊 Phase 5: Monitoring & Analytics (FUTURE)

### Task 5.1: Add Analytics

- [ ] Track upload success rate
- [ ] Track average file size
- [ ] Track average upload time
- [ ] Track error types
- [ ] Track user satisfaction

**Estimated Time:** 3 hours

**Files to Create:**

- `src/composables/useUploadAnalytics.ts`

### Task 5.2: Add Monitoring

- [ ] Setup Sentry error tracking
- [ ] Add custom error events
- [ ] Add performance monitoring
- [ ] Setup alerts for high error rates

**Estimated Time:** 2 hours

### Task 5.3: Add User Feedback

- [ ] Add rating prompt after upload
- [ ] Add feedback form
- [ ] Track user satisfaction
- [ ] Analyze feedback

**Estimated Time:** 3 hours

## 🔄 Maintenance Tasks

### Regular Tasks

- [ ] Monitor storage usage
- [ ] Review error logs
- [ ] Update dependencies
- [ ] Optimize compression settings
- [ ] Review user feedback

### Monthly Tasks

- [ ] Analyze upload metrics
- [ ] Review performance benchmarks
- [ ] Update documentation
- [ ] Plan improvements

## 📝 Task Dependencies

```
Phase 1 (Core) ✅
    ↓
Phase 2 (Enhanced UX) 🚧
    ↓
Phase 3 (Advanced Features) 📋
    ↓
Phase 4 (Testing) 🧪
    ↓
Phase 5 (Monitoring) 📊
```

## 🎯 Priority Matrix

| Task                | Priority | Impact | Effort | Status     |
| ------------------- | -------- | ------ | ------ | ---------- |
| Core Implementation | P0       | High   | Medium | ✅ Done    |
| Progress Indicators | P1       | Medium | Low    | 🚧 Next    |
| Error Messages      | P1       | High   | Low    | 🚧 Next    |
| Retry Mechanism     | P1       | High   | Medium | 📋 Planned |
| Image Preview       | P2       | Medium | Medium | 📋 Planned |
| Batch Upload        | P2       | Medium | High   | 📋 Future  |
| Image Editing       | P3       | Low    | High   | 📋 Future  |
| Thumbnails          | P2       | Medium | Medium | 📋 Future  |
| Watermark           | P3       | Low    | Medium | 📋 Future  |
| Unit Tests          | P1       | High   | Medium | 📋 Planned |
| Integration Tests   | P1       | High   | Medium | 📋 Planned |
| E2E Tests           | P2       | Medium | Medium | 📋 Planned |
| Analytics           | P2       | Medium | Low    | 📋 Future  |
| Monitoring          | P1       | High   | Low    | 📋 Planned |

## 📅 Timeline

### Week 1 (Current) ✅

- [x] Phase 1: Core Implementation

### Week 2 (Next)

- [ ] Task 2.1: Progress Indicators
- [ ] Task 2.3: Error Messages
- [ ] Task 4.1: Unit Tests

### Week 3

- [ ] Task 2.4: Retry Mechanism
- [ ] Task 2.2: Image Preview
- [ ] Task 4.2: Integration Tests

### Week 4

- [ ] Task 4.3: E2E Tests
- [ ] Task 4.4: Performance Testing
- [ ] Task 4.5: Security Audit

### Month 2

- [ ] Phase 3: Advanced Features (as needed)
- [ ] Phase 5: Monitoring & Analytics

## 🚀 Quick Start (For Developers)

### To Test Current Implementation:

```bash
# 1. Refresh browser
# 2. Go to Provider Job Detail
# 3. Click "ถ่ายรูป/เลือกรูป"
# 4. Select a large image (5-50MB)
# 5. Check console for resize logs
# 6. Verify upload success
```

### To Work on Phase 2:

```bash
# 1. Create new branch
git checkout -b feature/photo-evidence-ux

# 2. Start with Task 2.1 (Progress Indicators)
# 3. Test thoroughly
# 4. Create PR
```

### To Add Tests:

```bash
# 1. Create test file
touch src/tests/imageResize.unit.test.ts

# 2. Write tests
# 3. Run tests
npm run test

# 4. Check coverage
npm run test:coverage
```

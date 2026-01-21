# 📝 Naming Consistency Plan - Remove "New" Suffix

## Executive Summary

**Goal**: Remove "New" suffix from provider files after migration is complete
**Status**: Ready for planning, NOT ready for execution
**Risk Level**: Medium ⚠️ (requires router updates)

---

## 📊 Current State

### Files with "New" Suffix (6 files)

#### Components (1 file)

```
src/components/
└── ProviderLayoutNew.vue  →  ProviderLayout.vue
```

#### Views (5 files)

```
src/views/provider/
├── ProviderHomeNew.vue     →  ProviderHomeView.vue
├── ProviderOrdersNew.vue   →  ProviderOrdersView.vue
├── ProviderChatNew.vue     →  ProviderChatView.vue
└── ProviderProfileNew.vue  →  ProviderProfileView.vue
```

**Note**: `ProviderWalletView.vue` already has correct naming (no "New" suffix)

---

## 🎯 Naming Convention Standards

### Current Inconsistencies

| Current Name             | Issues                           | Correct Name              |
| ------------------------ | -------------------------------- | ------------------------- |
| `ProviderLayoutNew.vue`  | Has "New" suffix, missing "View" | `ProviderLayout.vue`      |
| `ProviderHomeNew.vue`    | Has "New" suffix, missing "View" | `ProviderHomeView.vue`    |
| `ProviderOrdersNew.vue`  | Has "New" suffix, missing "View" | `ProviderOrdersView.vue`  |
| `ProviderChatNew.vue`    | Has "New" suffix, missing "View" | `ProviderChatView.vue`    |
| `ProviderProfileNew.vue` | Has "New" suffix, missing "View" | `ProviderProfileView.vue` |
| `ProviderWalletView.vue` | ✅ Correct                       | ✅ No change needed       |

### Naming Standards

#### Layouts

```
Pattern: [Feature]Layout.vue
Example: ProviderLayout.vue, AdminLayout.vue, CustomerLayout.vue
Location: src/components/
```

#### Views

```
Pattern: [Feature][Page]View.vue
Example: ProviderHomeView.vue, ProviderOrdersView.vue
Location: src/views/[feature]/
```

#### Components

```
Pattern: [Feature][Component].vue
Example: ProviderCard.vue, OrderList.vue
Location: src/components/[feature]/
```

---

## 🚨 Why NOT Ready for Execution

### Reason 1: Router Dependencies

All these files are actively used in router configuration:

```typescript
// src/router/index.ts (lines 117-149)
{
  path: '/provider',
  component: () => import('../components/ProviderLayoutNew.vue'),  // ← Used here
  children: [
    {
      path: '',
      name: 'ProviderHome',
      component: () => import('../views/provider/ProviderHomeNew.vue'),  // ← Used here
    },
    {
      path: 'orders',
      name: 'ProviderOrders',
      component: () => import('../views/provider/ProviderOrdersNew.vue'),  // ← Used here
    },
    {
      path: 'chat',
      name: 'ProviderChat',
      component: () => import('../views/provider/ProviderChatNew.vue'),  // ← Used here
    },
    {
      path: 'profile',
      name: 'ProviderProfile',
      component: () => import('../views/provider/ProviderProfileNew.vue'),  // ← Used here
    }
  ]
}
```

### Reason 2: Import Dependencies

These files may be imported in other components:

```typescript
// Potential imports to check
import ProviderLayoutNew from "@/components/ProviderLayoutNew.vue";
import { useProviderLayout } from "@/composables/useProviderLayout";
```

### Reason 3: Test Files

Unit tests may reference these files:

```typescript
// Test files to update
import ProviderHomeNew from "@/views/provider/ProviderHomeNew.vue";
```

---

## 📋 Pre-Execution Checklist

Before renaming, we MUST:

### 1. Search for All References

```bash
# Search for imports
grep -r "ProviderLayoutNew" src/
grep -r "ProviderHomeNew" src/
grep -r "ProviderOrdersNew" src/
grep -r "ProviderChatNew" src/
grep -r "ProviderProfileNew" src/

# Search in tests
grep -r "ProviderLayoutNew" src/tests/
grep -r "ProviderHomeNew" src/tests/
# ... etc
```

### 2. Check Router Configuration

```bash
# Verify router imports
grep -r "import.*ProviderLayoutNew" src/router/
grep -r "import.*ProviderHomeNew" src/router/
# ... etc
```

### 3. Check Component Dependencies

```bash
# Find components that import these files
grep -r "from.*ProviderLayoutNew" src/components/
grep -r "from.*ProviderHomeNew" src/views/
# ... etc
```

### 4. Verify No External References

```bash
# Check documentation
grep -r "ProviderLayoutNew" docs/
grep -r "ProviderHomeNew" docs/

# Check specs
grep -r "ProviderLayoutNew" .kiro/specs/
```

---

## 🔄 Execution Plan (When Ready)

### Phase 1: Preparation (30 minutes)

#### Step 1.1: Create Backup Branch

```bash
git checkout -b refactor/remove-new-suffix
git push -u origin refactor/remove-new-suffix
```

#### Step 1.2: Document All References

```bash
# Create reference map
cat > rename-references.txt << EOF
# Files to rename
ProviderLayoutNew.vue → ProviderLayout.vue
ProviderHomeNew.vue → ProviderHomeView.vue
ProviderOrdersNew.vue → ProviderOrdersView.vue
ProviderChatNew.vue → ProviderChatView.vue
ProviderProfileNew.vue → ProviderProfileView.vue

# Files to update (router)
src/router/index.ts

# Files to update (tests)
[List test files here after search]

# Files to update (components)
[List component files here after search]
EOF
```

### Phase 2: Rename Files (15 minutes)

```bash
# Rename component
git mv src/components/ProviderLayoutNew.vue src/components/ProviderLayout.vue

# Rename views
git mv src/views/provider/ProviderHomeNew.vue src/views/provider/ProviderHomeView.vue
git mv src/views/provider/ProviderOrdersNew.vue src/views/provider/ProviderOrdersView.vue
git mv src/views/provider/ProviderChatNew.vue src/views/provider/ProviderChatView.vue
git mv src/views/provider/ProviderProfileNew.vue src/views/provider/ProviderProfileView.vue
```

### Phase 3: Update Router (10 minutes)

```typescript
// src/router/index.ts
{
  path: '/provider',
  component: () => import('../components/ProviderLayout.vue'),  // ✅ Updated
  children: [
    {
      path: '',
      name: 'ProviderHome',
      component: () => import('../views/provider/ProviderHomeView.vue'),  // ✅ Updated
    },
    {
      path: 'orders',
      name: 'ProviderOrders',
      component: () => import('../views/provider/ProviderOrdersView.vue'),  // ✅ Updated
    },
    {
      path: 'chat',
      name: 'ProviderChat',
      component: () => import('../views/provider/ProviderChatView.vue'),  // ✅ Updated
    },
    {
      path: 'profile',
      name: 'ProviderProfile',
      component: () => import('../views/provider/ProviderProfileView.vue'),  // ✅ Updated
    }
  ]
}
```

### Phase 4: Update Imports (20 minutes)

Use find-and-replace across codebase:

```bash
# Find all imports
find src -type f \( -name "*.vue" -o -name "*.ts" -o -name "*.js" \) -exec sed -i '' \
  -e 's/ProviderLayoutNew/ProviderLayout/g' \
  -e 's/ProviderHomeNew/ProviderHomeView/g' \
  -e 's/ProviderOrdersNew/ProviderOrdersView/g' \
  -e 's/ProviderChatNew/ProviderChatView/g' \
  -e 's/ProviderProfileNew/ProviderProfileView/g' \
  {} +
```

### Phase 5: Update Tests (15 minutes)

```bash
# Update test imports
find src/tests -type f -name "*.test.ts" -exec sed -i '' \
  -e 's/ProviderLayoutNew/ProviderLayout/g' \
  -e 's/ProviderHomeNew/ProviderHomeView/g' \
  -e 's/ProviderOrdersNew/ProviderOrdersView/g' \
  -e 's/ProviderChatNew/ProviderChatView/g' \
  -e 's/ProviderProfileNew/ProviderProfileView/g' \
  {} +
```

### Phase 6: Verification (20 minutes)

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Run tests
npm run test -- --run

# 4. Build
npm run build

# 5. Manual testing
npm run dev
# Test all provider routes:
# - http://localhost:5173/provider
# - http://localhost:5173/provider/orders
# - http://localhost:5173/provider/chat
# - http://localhost:5173/provider/profile
```

### Phase 7: Commit & Deploy (10 minutes)

```bash
# Commit changes
git add .
git commit -m "refactor: remove 'New' suffix from provider files

- Rename ProviderLayoutNew.vue → ProviderLayout.vue
- Rename ProviderHomeNew.vue → ProviderHomeView.vue
- Rename ProviderOrdersNew.vue → ProviderOrdersView.vue
- Rename ProviderChatNew.vue → ProviderChatView.vue
- Rename ProviderProfileNew.vue → ProviderProfileView.vue
- Update all imports and router configuration
- Update test files

BREAKING CHANGE: File names changed, update any external references"

# Push to remote
git push origin refactor/remove-new-suffix

# Create PR
gh pr create --title "Refactor: Remove 'New' suffix from provider files" \
  --body "See commit message for details"
```

---

## 🚨 Rollback Plan

If issues occur after deployment:

### Quick Rollback (5 minutes)

```bash
# Revert the commit
git revert HEAD

# Push revert
git push origin main

# Deploy
npm run deploy
```

### Manual Rollback (15 minutes)

```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Create new branch
git checkout -b hotfix/rollback-naming

# Push and deploy
git push origin hotfix/rollback-naming
npm run deploy
```

---

## 📊 Impact Analysis

### Files Affected

- **Renamed**: 6 files
- **Router**: 1 file (src/router/index.ts)
- **Tests**: TBD (after search)
- **Components**: TBD (after search)
- **Total**: ~10-15 files estimated

### Risk Assessment

| Risk           | Probability | Impact | Mitigation                         |
| -------------- | ----------- | ------ | ---------------------------------- |
| Broken imports | Medium      | High   | Comprehensive search before rename |
| Router errors  | Medium      | High   | Test all routes after rename       |
| Test failures  | Low         | Medium | Update test imports                |
| Build errors   | Low         | High   | Run build before commit            |
| Runtime errors | Low         | High   | Manual testing in dev              |

### Benefits

✅ **Consistency**: All files follow naming convention
✅ **Clarity**: No confusion about "New" vs old
✅ **Maintainability**: Easier to understand codebase
✅ **Professionalism**: Production-ready naming

---

## ⏰ Timeline

### When to Execute

**NOT NOW** - Wait for:

1. ✅ All duplicate files removed (DONE)
2. ✅ Legacy routes deprecated (IN PROGRESS)
3. ⏳ No active feature development on provider files
4. ⏳ Team has bandwidth for testing
5. ⏳ Low-traffic period for deployment

**Recommended**: After legacy routes are fully removed and tested

### Estimated Duration

- **Preparation**: 30 minutes
- **Execution**: 90 minutes
- **Testing**: 30 minutes
- **Total**: 2.5 hours

---

## 📝 Checklist Before Execution

### Pre-Execution

- [ ] Search for all references to files with "New" suffix
- [ ] Document all files that need updates
- [ ] Create backup branch
- [ ] Notify team of upcoming changes
- [ ] Schedule low-traffic deployment window

### During Execution

- [ ] Rename all 6 files
- [ ] Update router configuration
- [ ] Update all imports
- [ ] Update test files
- [ ] Run type-check
- [ ] Run lint
- [ ] Run tests
- [ ] Run build
- [ ] Manual testing of all routes

### Post-Execution

- [ ] Verify all provider routes work
- [ ] Check for console errors
- [ ] Monitor error logs
- [ ] Update documentation
- [ ] Close related issues

---

## 🎯 Success Criteria

### Must Have ✅

- ✅ All files renamed successfully
- ✅ Router works correctly
- ✅ All tests pass
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ No console errors in browser

### Nice to Have 🎁

- 🎁 Updated documentation
- 🎁 Team training on new names
- 🎁 Automated checks for naming convention

---

## 📚 Related Documentation

- [DUPLICATE-FILES-CLEANUP-COMPLETE.md](./DUPLICATE-FILES-CLEANUP-COMPLETE.md) - Previous cleanup
- [LEGACY-ROUTES-REVIEW.md](./LEGACY-ROUTES-REVIEW.md) - Legacy routes analysis
- [PREVENT-DUPLICATES-GUIDE.md](./PREVENT-DUPLICATES-GUIDE.md) - Prevention guide

---

**Created**: 2026-01-18
**Status**: ⏳ Planned (NOT ready for execution)
**Risk Level**: Medium ⚠️
**Estimated Time**: 2.5 hours
**Recommended Timing**: After legacy routes removal

# 🛡️ Guide: Prevent Duplicate Files

## Quick Check Before Creating New Files

### 1. Search for Existing Files First

```bash
# Search by feature name
find src -name "*CustomerView*"
find src -name "*Provider*"

# Search by pattern
grep -r "CustomerView" src/router/
```

### 2. Check Router Configuration

```bash
# Check what files are actually used
grep -r "import.*View" src/router/
grep -r "component:" src/router/
```

### 3. Avoid These Naming Patterns

❌ **DON'T USE**:

- `ComponentNew.vue`
- `ComponentV2.vue`
- `ComponentEnhanced.vue`
- `ComponentMinimal.vue`
- `ComponentPro.vue`
- `ComponentStable.vue`
- `ComponentCopy.vue`
- `ComponentBackup.vue`
- `ComponentOld.vue`
- `ComponentTemp.vue`

✅ **DO USE**:

- `Component.vue` (base name)
- `ComponentModal.vue` (specific purpose)
- `ComponentCard.vue` (specific purpose)

## When You Need Multiple Versions

### Option 1: Use Feature Flags (Recommended)

```vue
<script setup lang="ts">
const useNewUI = ref(false); // or from feature flag service

const component = computed(() =>
  useNewUI.value ? NewComponent : OldComponent,
);
</script>

<template>
  <component :is="component" />
</template>
```

### Option 2: Use Separate Routes

```typescript
// router/index.ts
{
  path: '/customer/profile',
  component: () => import('./views/CustomerProfileView.vue')
},
{
  path: '/customer/profile-beta',
  component: () => import('./views/CustomerProfileBetaView.vue'),
  meta: { beta: true }
}
```

### Option 3: Use Composition (Best)

```typescript
// composables/useCustomerProfile.ts
export function useCustomerProfile(version: "v1" | "v2" = "v1") {
  if (version === "v2") {
    return useCustomerProfileV2();
  }
  return useCustomerProfileV1();
}
```

## Migration Strategy

### Step 1: Create New Implementation

```bash
# Create in separate folder
mkdir src/views/customer/v2/
touch src/views/customer/v2/ProfileView.vue
```

### Step 2: Test Thoroughly

```bash
# Add tests
touch src/tests/customer-profile-v2.unit.test.ts
npm run test
```

### Step 3: Gradual Rollout

```typescript
// Use feature flag
const useV2 = computed(
  () => featureFlags.value.customerProfileV2 && user.value?.betaTester,
);
```

### Step 4: Full Migration

```bash
# After 100% rollout
rm src/views/customer/ProfileView.vue
mv src/views/customer/v2/ProfileView.vue src/views/customer/ProfileView.vue
rmdir src/views/customer/v2/
```

### Step 5: Cleanup

```bash
# Remove feature flag
# Remove old code
# Update documentation
```

## Regular Maintenance

### Weekly Check

```bash
# Find files with duplicate-indicating suffixes
find src -name "*New.vue"
find src -name "*V2.vue"
find src -name "*Enhanced.vue"
find src -name "*Minimal.vue"
find src -name "*Pro.vue"
find src -name "*Stable.vue"
find src -name "*Copy.vue"
find src -name "*Backup.vue"
find src -name "*Old.vue"
find src -name "*Temp.vue"

# Check for unused files
npm run find-unused-files  # if you have this script
```

### Monthly Audit

```bash
# Generate file tree
tree src/views/ > file-tree.txt

# Review for duplicates
# Check router configuration
# Verify all files are used
```

## Automation

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh

# Check for duplicate-indicating suffixes
DUPLICATES=$(find src -name "*New.vue" -o -name "*V2.vue" -o -name "*Enhanced.vue")

if [ -n "$DUPLICATES" ]; then
  echo "⚠️  Warning: Found files with duplicate-indicating suffixes:"
  echo "$DUPLICATES"
  echo ""
  echo "Consider using feature flags or separate routes instead."
  echo "See: .kiro/specs/admin-customers-enhancement/PREVENT-DUPLICATES-GUIDE.md"
fi
```

### ESLint Rule (Custom)

```javascript
// eslint-rules/no-duplicate-suffixes.js
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow duplicate-indicating file suffixes",
    },
  },
  create(context) {
    const filename = context.getFilename();
    const duplicateSuffixes = [
      "New",
      "V2",
      "Enhanced",
      "Minimal",
      "Pro",
      "Stable",
    ];

    for (const suffix of duplicateSuffixes) {
      if (filename.includes(suffix)) {
        context.report({
          message: `Avoid using "${suffix}" suffix. Use feature flags or separate routes instead.`,
        });
      }
    }
  },
};
```

## Best Practices

### ✅ DO

1. **Search before creating** - Always check if file exists
2. **Use descriptive names** - `CustomerProfileModal.vue` not `CustomerProfileNew.vue`
3. **Delete old files immediately** - After migration is complete
4. **Use feature flags** - For gradual rollouts
5. **Document migrations** - Keep track of changes
6. **Test thoroughly** - Before deleting old files

### ❌ DON'T

1. **Don't create "New" versions** - Enhance existing files instead
2. **Don't keep old files** - Delete after migration
3. **Don't use vague suffixes** - "Enhanced", "Better", "Fixed"
4. **Don't skip testing** - Always verify before deleting
5. **Don't forget router** - Update route configurations
6. **Don't leave TODO comments** - Complete migrations

## Emergency Rollback

If you need to rollback:

```bash
# 1. Check git history
git log --oneline --all -- src/views/CustomerView.vue

# 2. Restore old file
git checkout <commit-hash> -- src/views/CustomerView.vue

# 3. Update router if needed
# 4. Test thoroughly
# 5. Deploy
```

## Checklist for New Files

Before creating a new file, ask:

- [ ] Does a similar file already exist?
- [ ] Can I enhance the existing file instead?
- [ ] Is this a temporary file? (Use `/temp/` folder)
- [ ] Is this for testing? (Use `/tests/` folder)
- [ ] Do I need a suffix? (Usually NO)
- [ ] Have I checked the router?
- [ ] Have I searched for imports?
- [ ] Is the name descriptive enough?

## Resources

- 📄 [DUPLICATE-FILES-ANALYSIS.md](./DUPLICATE-FILES-ANALYSIS.md)
- 📄 [DUPLICATE-FILES-CLEANUP-COMPLETE.md](./DUPLICATE-FILES-CLEANUP-COMPLETE.md)
- 📄 [CLEANUP-PLAN.md](./CLEANUP-PLAN.md)

---

**Remember**: One file, one purpose, one name. Keep it simple! 🎯

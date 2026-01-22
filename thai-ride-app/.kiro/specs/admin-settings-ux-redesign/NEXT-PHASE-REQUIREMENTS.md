# Admin Settings UX Redesign - Phase 2 Requirements

**Date**: 2026-01-22  
**Status**: 📋 Planning  
**Priority**: 🎯 High  
**Phase**: 2 of 5

---

## 📋 Overview

This document outlines the requirements for Phase 2 of the Admin Settings UX redesign initiative, focusing on completing the remaining 14 settings pages with consistent design patterns established in Phase 1.

---

## 🎯 Phase 2 Goals

### Primary Objectives

1. **Complete Custom Pages Settings** - Enable admins to manage custom content pages
2. **Complete Onboarding Settings** - Configure customer/provider onboarding flows
3. **Maintain Design Consistency** - Apply Phase 1 design system across all new pages
4. **Ensure Accessibility** - WCAG 2.1 AA compliance for all components
5. **Mobile-First Approach** - Responsive design for all screen sizes

---

## 📊 Current Status

### ✅ Completed (Phase 1)

- Design tokens system
- Base components library (6 components)
- Settings Hub (main navigation)
- System Settings page
- Financial Settings page (existing)
- Top-up Requests view enhancement

### ⏳ Pending (14 Pages)

1. Theme Settings
2. Language Settings
3. Custom Pages
4. Onboarding Settings
5. Order Settings
6. Notification Settings
7. Analytics Settings
8. Payment Methods
9. Users & Permissions
10. Security Settings
11. Mobile Apps
12. Service Areas
13. Maps Settings
14. Domains & Webhooks

---

## 🎨 User Stories - Phase 2 Focus

### US-1: Custom Pages Management

**As an** admin  
**I want** to create and manage custom content pages  
**So that** I can provide additional information to users (Terms, Privacy, FAQ, etc.)

**Acceptance Criteria:**

- [ ] View list of all custom pages
- [ ] Create new custom page with rich text editor
- [ ] Edit existing pages
- [ ] Delete pages with confirmation
- [ ] Set page visibility (published/draft)
- [ ] Configure page slug/URL
- [ ] Preview page before publishing
- [ ] Reorder pages in navigation

### US-2: Onboarding Flow Configuration

**As an** admin  
**I want** to configure customer and provider onboarding flows  
**So that** new users have a smooth introduction to the platform

**Acceptance Criteria:**

- [ ] Configure onboarding steps for customers
- [ ] Configure onboarding steps for providers
- [ ] Enable/disable onboarding screens
- [ ] Customize onboarding content (text, images)
- [ ] Set skip options
- [ ] Preview onboarding flow
- [ ] Track completion rates

### US-3: Theme Customization

**As an** admin  
**I want** to customize the app's visual theme  
**So that** the platform matches our brand identity

**Acceptance Criteria:**

- [ ] Configure primary/secondary colors
- [ ] Upload logo and favicon
- [ ] Set typography preferences
- [ ] Configure button styles
- [ ] Preview theme changes in real-time
- [ ] Reset to default theme
- [ ] Export/import theme configurations

### US-4: Language Management

**As an** admin  
**I want** to manage multiple languages and translations  
**So that** the platform can serve users in their preferred language

**Acceptance Criteria:**

- [ ] View list of supported languages
- [ ] Add new language
- [ ] Set default language
- [ ] Enable/disable languages
- [ ] Manage translations for each language
- [ ] Import/export translation files
- [ ] Track translation completion percentage

---

## 🔧 Technical Requirements

### Database Schema Needs

#### custom_pages Table

```sql
CREATE TABLE custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  order_index INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### onboarding_settings Table

```sql
CREATE TABLE onboarding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'provider')),
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_enabled BOOLEAN DEFAULT true,
  is_skippable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### theme_settings Table

```sql
CREATE TABLE theme_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  font_family TEXT,
  button_radius TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Component Requirements

#### Rich Text Editor Component

- WYSIWYG editing
- Image upload support
- HTML preview
- Markdown support (optional)

#### Color Picker Component

- Visual color selection
- Hex/RGB input
- Color presets
- Live preview

#### Image Upload Component

- Drag & drop support
- Image preview
- Crop/resize functionality
- Progress indicator

---

## 🎨 Design System Compliance

### Must Follow Phase 1 Patterns

#### Visual Hierarchy

- Use design tokens from `src/admin/styles/design-tokens.ts`
- Consistent spacing scale (4, 6, 8, 12, 16, 24, 32, 48)
- Typography scale (text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl)
- Color system (primary, success, warning, error, gray scales)

#### Component Usage

All new pages must use base components:

- `SettingsSection` - For grouping related settings
- `SettingsFormField` - For form inputs with labels
- `SettingsActions` - For save/cancel/reset buttons
- `SettingsLoadingState` - For loading indicators
- `SettingsErrorState` - For error messages
- `SettingsEmptyState` - For empty data states

#### Layout Patterns

```vue
<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8"
  >
    <!-- Header with icon -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div
              class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg"
            >
              <!-- Icon SVG -->
            </div>
            Page Title
          </h1>
          <p class="text-gray-600 mt-2 flex items-center gap-2">
            <!-- Icon SVG -->
            Page description
          </p>
        </div>
        <!-- Action buttons -->
      </div>
    </div>

    <!-- Content -->
    <SettingsLoadingState v-if="loading" />
    <SettingsErrorState v-else-if="error" :message="error" @retry="load" />
    <form v-else @submit.prevent="handleSubmit">
      <!-- Settings sections -->
    </form>
  </div>
</template>
```

---

## 🔐 Security & RLS Requirements

### Admin Access Control

All settings pages must verify admin role:

```typescript
// In composable or component
const { user } = useAuthStore();

// Check admin role
if (user?.role !== "admin") {
  router.push("/admin/unauthorized");
  return;
}
```

### Database RLS Policies

For new tables, create policies:

```sql
-- Admin read access
CREATE POLICY "admins_read_settings" ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin write access
CREATE POLICY "admins_write_settings" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 📱 Responsive Design Requirements

### Breakpoints (from design tokens)

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile-First Approach

```vue
<!-- Stack on mobile, side-by-side on desktop -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Content -->
</div>

<!-- Responsive padding -->
<div class="p-4 sm:p-6 lg:p-8">
  <!-- Content -->
</div>

<!-- Responsive text -->
<h1 class="text-2xl sm:text-3xl lg:text-4xl">
  Title
</h1>
```

### Touch Targets

- Minimum 44x44px for all interactive elements
- Use `min-h-[44px]` and `min-w-[44px]`
- Adequate spacing between clickable elements

---

## ♿ Accessibility Requirements (WCAG 2.1 AA)

### Must Have

- [ ] Semantic HTML (`<section>`, `<nav>`, `<button>`, etc.)
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation support (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Alt text for all images
- [ ] Form labels properly associated with inputs
- [ ] Error messages clearly announced

### Testing Checklist

- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Test color contrast with tools
- [ ] Test with browser zoom (200%)
- [ ] Test with reduced motion preferences

---

## 🧪 Testing Requirements

### Unit Tests

Each new component should have:

- [ ] Rendering tests
- [ ] User interaction tests
- [ ] Form validation tests
- [ ] Error handling tests

### Integration Tests

Each new page should have:

- [ ] Navigation tests
- [ ] Data loading tests
- [ ] Form submission tests
- [ ] Permission tests

### E2E Tests (Optional)

- [ ] Complete user flows
- [ ] Cross-browser testing
- [ ] Mobile device testing

---

## 📊 Performance Requirements

### Metrics Targets

- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

### Optimization Strategies

- Lazy load heavy components
- Use `v-memo` for expensive renders
- Debounce user inputs
- Optimize images (WebP, lazy loading)
- Code splitting by route

---

## 📝 Documentation Requirements

### For Each New Page

1. **Component Documentation**
   - Props and their types
   - Events emitted
   - Slots available
   - Usage examples

2. **User Guide**
   - What the page does
   - How to use each feature
   - Common workflows
   - Troubleshooting tips

3. **Technical Documentation**
   - Database schema
   - API endpoints
   - RLS policies
   - Business logic

---

## 🚀 Implementation Plan

### Week 1: Custom Pages & Onboarding

- [ ] Day 1-2: Database schema and RLS
- [ ] Day 3-4: Custom Pages view
- [ ] Day 5: Onboarding Settings view

### Week 2: Theme & Language

- [ ] Day 1-2: Theme Settings view
- [ ] Day 3-4: Language Settings view
- [ ] Day 5: Testing and refinement

### Week 3: Order & Notifications

- [ ] Day 1-2: Order Settings view
- [ ] Day 3-4: Notification Settings enhancement
- [ ] Day 5: Analytics Settings view

### Week 4: Payment & Security

- [ ] Day 1-2: Payment Methods view
- [ ] Day 3-4: Users & Permissions view
- [ ] Day 5: Security Settings enhancement

### Week 5: Platform Settings

- [ ] Day 1: Mobile Apps view
- [ ] Day 2: Service Areas enhancement
- [ ] Day 3: Maps Settings view
- [ ] Day 4: Domains & Webhooks view
- [ ] Day 5: Final testing and documentation

---

## ✅ Definition of Done

A page is considered complete when:

- [ ] All user stories are implemented
- [ ] Design system compliance verified
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility requirements met (WCAG 2.1 AA)
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Documentation complete
- [ ] Code review approved
- [ ] QA testing passed
- [ ] Performance metrics met

---

## 🎯 Success Criteria

### User Experience

- Admin can complete common tasks in < 3 clicks
- Forms provide clear validation feedback
- Loading states prevent confusion
- Error messages are actionable
- Mobile experience is smooth

### Technical Quality

- Code coverage > 80%
- No TypeScript errors
- No console errors
- Lighthouse score > 90
- Bundle size increase < 50KB per page

### Business Impact

- Reduced admin support tickets
- Faster configuration changes
- Improved admin satisfaction
- Better platform customization

---

## 📚 Reference Documentation

### Phase 1 Documentation

- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md)
- [Testing Guide](./TESTING-GUIDE.md)
- [Quick Start](./QUICK-START.md)
- [Routing Fix](./ROUTING-FIX-SUMMARY.md)

### Design System

- [Design Tokens](../../src/admin/styles/design-tokens.ts)
- [Base Components](../../src/admin/components/settings/)

### Examples

- [System Settings View](../../src/admin/views/SystemSettingsView.vue)
- [Financial Settings View](../../src/admin/views/AdminFinancialSettingsView.vue)
- [Top-up Requests View](../../src/admin/views/AdminTopupRequestsView.vue)

---

## 💡 Tips for Implementation

### Start with Database

1. Design schema first
2. Create migration
3. Add RLS policies
4. Test with sample data

### Build Components Bottom-Up

1. Create reusable sub-components
2. Build page-specific components
3. Assemble into page view
4. Add state management

### Test Early and Often

1. Write tests alongside code
2. Test on real devices
3. Get feedback from users
4. Iterate based on feedback

### Follow the Pattern

1. Copy from existing pages
2. Maintain consistency
3. Reuse components
4. Don't reinvent the wheel

---

**Created**: 2026-01-22  
**Status**: 📋 Ready for Implementation  
**Next Review**: After Phase 2 completion

# 🎨 HistoryView Vector Monochrome Migration Plan

**Date**: 2026-01-31  
**Status**: 🚀 Starting  
**Target**: src/views/HistoryView.vue

---

## 📋 Overview

HistoryView.vue เป็นหน้าที่ไม่ซับซ้อน มีโครงสร้างชัดเจน เหมาะสำหรับการย้ายไปใช้ Vector Monochrome Design System

**Total Lines**: 1,288 lines  
**Template Lines**: ~900 lines  
**Complexity**: ⭐⭐ (Medium-Low)

---

## 🎯 Migration Sections

### Section 1: Header (Lines ~350-450)

- **Components**: Back button, Title, Action buttons (export, insights)
- **Changes**:
  - Replace inline SVGs → VectorIcons (arrow-left, download, bar-chart)
  - Replace `.back-btn` → `vm-btn vm-btn-icon`
  - Replace `.icon-btn` → `vm-btn vm-btn-icon vm-btn-ghost`
  - Replace `.page-header` → `vm-top-bar`
  - Replace `.page-title` → `vm-text-xl vm-font-bold`
- **Time**: 10 min

### Section 2: Stats Cards (Lines ~450-500)

- **Components**: 2 stat cards (completed orders, total spent)
- **Changes**:
  - Replace `.stats-row` → `vm-grid vm-grid-cols-2 vm-gap-3`
  - Replace `.stat-card` → `vm-card vm-card-compact`
  - Replace inline SVGs → VectorIcons (check-circle, dollar-sign)
  - Replace `.stat-icon` → `vm-icon-wrapper`
  - Replace `.stat-value` → `vm-text-lg vm-font-bold`
  - Replace `.stat-label` → `vm-text-xs vm-text-secondary`
- **Time**: 10 min

### Section 3: Insights Panel (Lines ~500-600)

- **Components**: Insight cards with icons
- **Changes**:
  - Replace `.insights-panel` → `vm-stack vm-gap-2`
  - Replace `.insight-card` → `vm-alert` (with variants)
  - Replace inline SVGs → VectorIcons (alert-circle, check-circle, star, gift, info)
  - Replace `.insight-icon` → `vm-icon-wrapper`
  - Replace `.insight-title` → `vm-text-sm vm-font-semibold`
  - Replace `.insight-message` → `vm-text-xs vm-text-secondary`
- **Time**: 15 min

### Section 4: Search Bar (Lines ~600-650)

- **Components**: Search input with icon and clear button
- **Changes**:
  - Replace `.search-bar` → `vm-search-bar`
  - Replace inline search SVG → VectorIcons (search)
  - Replace `.search-input` → `vm-input`
  - Replace `.clear-btn` → `vm-btn vm-btn-icon vm-btn-sm`
  - Replace inline X SVG → VectorIcons (x)
- **Time**: 10 min

### Section 5: Filter Tabs (Lines ~650-700)

- **Components**: Horizontal scrollable filter chips
- **Changes**:
  - Replace `.filter-section` → `vm-filter-section`
  - Replace `.filters-scroll` → `vm-scroll-x`
  - Replace `.filter-chip` → `vm-chip` (with active state)
  - Replace `.filter-chip.active` → `vm-chip vm-chip-primary`
  - Replace `.filter-count` → `vm-badge`
- **Time**: 10 min

### Section 6: History Cards (Lines ~700-900)

- **Components**: History item cards with route, driver, meta info
- **Changes**:
  - Replace `.history-card` → `vm-card`
  - Replace `.card-top` → `vm-flex vm-justify-between vm-items-center`
  - Replace `.service-type` → `vm-chip vm-chip-outline`
  - Replace inline service SVGs → VectorIcons (car, package, shopping-cart, clipboard, truck, washing-machine)
  - Replace `.status-pill` → `vm-badge` (with variants)
  - Replace `.route-section` → `vm-route-display`
  - Replace `.route-dot` → `vm-route-dot`
  - Replace `.route-line-vertical` → `vm-route-line`
  - Replace `.driver-section` → `vm-flex vm-items-center vm-gap-3`
  - Replace inline user SVG → VectorIcons (user)
  - Replace inline star SVG → VectorIcons (star)
  - Replace `.card-bottom` → `vm-flex vm-justify-between vm-items-end`
  - Replace inline calendar/code SVGs → VectorIcons (calendar, hash)
  - Replace `.price` → `vm-text-xl vm-font-bold`
  - Replace `.text-btn.primary` → `vm-btn vm-btn-primary vm-btn-sm`
  - Replace `.text-btn.secondary` → `vm-btn vm-btn-outline vm-btn-sm`
  - Replace inline receipt SVG → VectorIcons (file-text)
- **Time**: 30 min

### Section 7: Empty State (Lines ~900-950)

- **Components**: Empty state illustration and CTA
- **Changes**:
  - Replace `.empty-state` → `vm-empty-state`
  - Replace inline illustration SVG → VectorIcons (clipboard-check) or custom
  - Replace `.empty-title` → `vm-text-lg vm-font-bold`
  - Replace `.empty-desc` → `vm-text-sm vm-text-secondary`
  - Replace `.empty-cta` → `vm-btn vm-btn-primary`
- **Time**: 10 min

---

## 📊 Summary

| Section           | Lines    | Inline SVGs | Time       | Priority |
| ----------------- | -------- | ----------- | ---------- | -------- |
| 1. Header         | ~100     | 3           | 10 min     | High     |
| 2. Stats Cards    | ~50      | 2           | 10 min     | High     |
| 3. Insights Panel | ~100     | 5           | 15 min     | Medium   |
| 4. Search Bar     | ~50      | 2           | 10 min     | High     |
| 5. Filter Tabs    | ~50      | 0           | 10 min     | High     |
| 6. History Cards  | ~200     | 15+         | 30 min     | High     |
| 7. Empty State    | ~50      | 1           | 10 min     | Medium   |
| **TOTAL**         | **~600** | **28+**     | **95 min** | -        |

---

## 🎨 Design System Components Needed

### From VectorIcons.vue

- ✅ arrow-left
- ✅ download (or use existing icon)
- ✅ bar-chart
- ✅ check-circle
- ✅ dollar-sign (or banknote)
- ✅ alert-circle
- ✅ star
- ✅ gift
- ✅ info
- ✅ search
- ✅ x
- ✅ car
- ✅ package
- ✅ shopping-cart
- ✅ clipboard
- ✅ truck
- ⚠️ washing-machine (need to add)
- ✅ user
- ✅ calendar
- ✅ hash
- ✅ file-text
- ⚠️ clipboard-check (need to add or use existing)

### From vector-monochrome.css

- ✅ vm-top-bar
- ✅ vm-btn (all variants)
- ✅ vm-card
- ✅ vm-chip
- ✅ vm-badge
- ✅ vm-alert
- ✅ vm-input
- ✅ vm-search-bar
- ✅ vm-grid
- ✅ vm-flex
- ✅ vm-stack
- ✅ vm-text-\* (typography)
- ✅ vm-empty-state
- ⚠️ vm-route-display (need to add)
- ⚠️ vm-route-dot (need to add)
- ⚠️ vm-route-line (need to add)

---

## 🚀 Execution Plan

### Phase 1: Preparation (5 min)

1. Add missing icons to VectorIcons.vue
2. Add route display utilities to vector-monochrome.css

### Phase 2: Migration (90 min)

1. Section 1: Header → 10 min
2. Section 2: Stats Cards → 10 min
3. Section 3: Insights Panel → 15 min
4. Section 4: Search Bar → 10 min
5. Section 5: Filter Tabs → 10 min
6. Section 6: History Cards → 30 min
7. Section 7: Empty State → 10 min

### Phase 3: Testing (5 min)

1. Visual check
2. Functionality check
3. Responsive check

**Total Time**: ~100 minutes (~1.5 hours)

---

## ✅ Success Criteria

- [ ] All inline SVGs replaced with VectorIcons
- [ ] All custom CSS classes replaced with vm- utilities
- [ ] All interactive elements have proper aria-labels
- [ ] All buttons use semantic HTML
- [ ] Consistent 2px stroke weight across all icons
- [ ] Monochrome color palette applied
- [ ] 8px grid spacing system applied
- [ ] Typography system applied
- [ ] WCAG AAA compliance maintained
- [ ] All functionality preserved
- [ ] No breaking changes

---

**Ready to start!** 🚀

# Provider Active Job Card - Order Number Display Tasks

## Task Breakdown

### 1. Create useOrderNumber Composable

Create a composable to handle order number formatting logic.

**Files to create:**

- `src/composables/useOrderNumber.ts`

**Implementation:**

- [ ] 1.1 Create formatOrderNumber function
  - Accept UUID string and format type
  - Return formatted order number (#XXXXXXXX for short, full UUID for full)
  - Handle edge cases (empty string, invalid UUID)
- [ ] 1.2 Add TypeScript types
  - OrderNumberFormat type ('short' | 'full')
  - Return type definitions
- [ ] 1.3 Export composable function

**Acceptance Criteria:**

- formatOrderNumber('#550e8400-e29b-41d4-a716-446655440000', 'short') returns '#550E8400'
- formatOrderNumber('#550e8400-e29b-41d4-a716-446655440000', 'full') returns full UUID
- Handles empty string gracefully
- TypeScript types are correct

---

### 2. Update ProviderHomeNew Component

Add order number display to the active job card.

**Files to modify:**

- `src/views/provider/ProviderHomeNew.vue`

**Implementation:**

- [ ] 2.1 Import required composables
  - Import useOrderNumber
  - Import useCopyToClipboard (already exists)
  - Import useToast (already exists)
- [ ] 2.2 Add reactive state
  - Add isCopied ref for visual feedback
- [ ] 2.3 Create copyOrderNumber function
  - Copy full UUID to clipboard
  - Show success/error toast
  - Set isCopied state with timeout
- [ ] 2.4 Add order number badge to template
  - Place between job-status-badge and job-fare
  - Add click handler
  - Add copy icon
  - Add conditional class for copied state
- [ ] 2.5 Add CSS styles
  - Style order-number-badge
  - Add hover/active states
  - Add copied animation
  - Add responsive styles
  - Ensure 44x44px minimum touch target

**Acceptance Criteria:**

- Order number displays in active job card
- Clicking order number copies to clipboard
- Toast notification appears on successful copy
- Visual feedback (color change) on click
- Responsive on mobile and desktop
- Touch target meets accessibility guidelines

---

### 3. Add Accessibility Features

Ensure the order number feature is accessible.

**Files to modify:**

- `src/views/provider/ProviderHomeNew.vue`

**Implementation:**

- [ ] 3.1 Add ARIA attributes
  - aria-label with descriptive text
  - role="button"
  - tabindex="0"
- [ ] 3.2 Add keyboard support
  - Handle Enter key press
  - Handle Space key press
- [ ] 3.3 Add screen reader announcements
  - Announce when order number is copied
  - Use aria-live region for toast

**Acceptance Criteria:**

- Screen reader announces order number correctly
- Keyboard navigation works (Tab, Enter, Space)
- ARIA attributes are present and correct
- Focus indicator is visible

---

### 4. Write Unit Tests

Test the useOrderNumber composable.

**Files to create:**

- `src/tests/useOrderNumber.unit.test.ts`

**Implementation:**

- [ ] 4.1 Test formatOrderNumber with short format
  - Valid UUID returns #XXXXXXXX
  - Uppercase conversion works
- [ ] 4.2 Test formatOrderNumber with full format
  - Returns full UUID unchanged
- [ ] 4.3 Test edge cases
  - Empty string
  - Invalid UUID format
  - Null/undefined handling

**Acceptance Criteria:**

- All tests pass
- Code coverage > 90%
- Edge cases are handled

---

### 5. Write Integration Tests

Test the order number feature in the component.

**Files to create:**

- `src/tests/provider-active-job-order-number.unit.test.ts`

**Implementation:**

- [ ] 5.1 Test order number display
  - Order number appears when active job exists
  - Correct format is displayed
  - Order number hidden when no active job
- [ ] 5.2 Test copy functionality
  - Clicking copies to clipboard
  - Toast appears on success
  - Visual feedback (copied class) appears
- [ ] 5.3 Test keyboard interaction
  - Enter key triggers copy
  - Space key triggers copy
- [ ] 5.4 Test responsive behavior
  - Renders correctly on mobile
  - Renders correctly on desktop

**Acceptance Criteria:**

- All integration tests pass
- Component behavior is verified
- User interactions are tested

---

### 6. Manual Testing

Perform manual testing on different devices and browsers.

**Testing Checklist:**

- [ ] 6.1 Test on iOS Safari
  - Order number displays correctly
  - Copy works
  - Touch target is adequate
  - No layout issues
- [ ] 6.2 Test on Android Chrome
  - Order number displays correctly
  - Copy works
  - Touch target is adequate
  - No layout issues
- [ ] 6.3 Test on Desktop Chrome
  - Order number displays correctly
  - Copy works
  - Hover states work
  - Keyboard navigation works
- [ ] 6.4 Test on Desktop Firefox
  - Order number displays correctly
  - Copy works
  - Fallback copy method works (if needed)
- [ ] 6.5 Test on Desktop Safari
  - Order number displays correctly
  - Copy works
  - No compatibility issues

**Acceptance Criteria:**

- Feature works on all tested browsers
- No visual bugs
- No functional bugs
- Performance is acceptable

---

### 7. Update Documentation

Document the new feature.

**Files to create/modify:**

- `src/views/provider/README.md` (if exists, otherwise create)

**Implementation:**

- [ ] 7.1 Document order number feature
  - Purpose and usage
  - Technical implementation
  - Composable API
- [ ] 7.2 Add screenshots
  - Active job card with order number
  - Copy interaction
- [ ] 7.3 Document accessibility features
  - ARIA attributes used
  - Keyboard shortcuts

**Acceptance Criteria:**

- Documentation is clear and complete
- Screenshots are included
- Accessibility features are documented

---

### 8. Code Review and Refinement

Review and refine the implementation.

**Implementation:**

- [ ] 8.1 Code review
  - Check code quality
  - Verify TypeScript types
  - Check for potential bugs
- [ ] 8.2 Performance review
  - Check rendering performance
  - Verify no memory leaks
  - Check animation performance
- [ ] 8.3 Accessibility review
  - Verify ARIA attributes
  - Test with screen reader
  - Check keyboard navigation
- [ ] 8.4 Refine based on feedback
  - Address review comments
  - Fix any issues found
  - Optimize if needed

**Acceptance Criteria:**

- Code review approved
- No performance issues
- Accessibility requirements met
- All feedback addressed

---

## Task Dependencies

```
1. Create useOrderNumber Composable
   ↓
2. Update ProviderHomeNew Component
   ↓
3. Add Accessibility Features
   ↓
4. Write Unit Tests (parallel with 5)
5. Write Integration Tests (parallel with 4)
   ↓
6. Manual Testing
   ↓
7. Update Documentation (parallel with 8)
8. Code Review and Refinement
```

## Estimated Timeline

- Task 1: 1 hour
- Task 2: 2 hours
- Task 3: 1 hour
- Task 4: 1.5 hours
- Task 5: 2 hours
- Task 6: 2 hours
- Task 7: 1 hour
- Task 8: 1.5 hours

**Total: ~12 hours**

## Definition of Done

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Manual testing completed on all target browsers
- [ ] Documentation updated
- [ ] No accessibility issues
- [ ] Performance is acceptable
- [ ] Feature deployed to staging
- [ ] Stakeholder approval received

---
inclusion: always
---

# 📝 Code Quality Standards

## 🎯 Overview

มาตรฐานคุณภาพโค้ดที่ต้องปฏิบัติตาม 100% - ไม่มีข้อยกเว้น

---

## ✅ Pre-Commit Checklist (บังคับ)

```bash
# ต้องผ่านทุกข้อก่อน commit
npm run lint          # 0 errors, 0 warnings
npm run build:check   # No TypeScript errors
npm run test -- --run # All tests pass
npm run lint:secrets  # No secrets exposed
```

---

## 🔍 Code Review Checklist

### TypeScript

- [ ] ไม่มี `any` type
- [ ] ทุก function มี return type
- [ ] ทุก parameter มี type
- [ ] ใช้ `unknown` แทน `any` เมื่อไม่รู้ type
- [ ] ใช้ `strict: true` ใน tsconfig

### Vue Components

- [ ] Props มี TypeScript types
- [ ] Emits มี TypeScript types
- [ ] Composables ใช้ naming convention `use*`
- [ ] Components ใช้ `<script setup lang="ts">`
- [ ] มี accessibility attributes (aria-\*, alt, label)

### Performance

- [ ] ใช้ `v-memo` สำหรับ expensive renders
- [ ] ใช้ `shallowRef` สำหรับ large objects
- [ ] Lazy load heavy components
- [ ] Images มี `loading="lazy"`
- [ ] Bundle size < 500KB

### Security

- [ ] Input validation ด้วย Zod
- [ ] RLS policies enabled
- [ ] No hardcoded secrets
- [ ] XSS prevention (sanitize v-html)
- [ ] CSRF protection

### Testing

- [ ] Unit tests สำหรับ business logic
- [ ] Integration tests สำหรับ critical flows
- [ ] Test coverage > 80%
- [ ] Property-based tests สำหรับ calculations

---

## 🚫 Common Mistakes to Avoid

```typescript
// ❌ BAD
const data: any = response;
function process(x) {
  return x + 1;
}
const user = users[0]; // might be undefined

// ✅ GOOD
const data: User = response;
function process(x: number): number {
  return x + 1;
}
const user = users[0] ?? null;
```

---

## 📊 Quality Metrics

| Metric      | Target   | Action if Failed |
| ----------- | -------- | ---------------- |
| Lint        | 0 errors | Block commit     |
| Type Check  | 0 errors | Block commit     |
| Test Pass   | 100%     | Block commit     |
| Coverage    | > 80%    | Warning          |
| Bundle Size | < 500KB  | Warning          |

---

**Auto-enforced by**: `.husky/pre-commit`

---
inclusion: manual
---

# 📚 Steering Rules Index

## Always Active (ทุก request)

| File                          | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `project-standards.md`        | Tech stack, naming, file structure     |
| `security-checklist.md`       | Security requirements, validation      |
| `performance.md`              | Web vitals, optimization               |
| `role-based-development.md`   | Customer/Provider/Admin considerations |
| `post-command-suggestions.md` | Post-task recommendations              |
| `mcp-automation.md`           | **🔌 Auto MCP for DB/Figma**           |

## File-Match (เมื่อเปิดไฟล์ที่ตรง pattern)

| File                     | Pattern                         | Purpose                   |
| ------------------------ | ------------------------------- | ------------------------- |
| `vue-components.md`      | `**/*.vue`                      | Component standards, a11y |
| `supabase-patterns.md`   | `**/*{supabase,Service,store}*` | DB queries, realtime      |
| `api-patterns.md`        | `**/*{Service,api}*.ts`         | Service layer patterns    |
| `error-handling.md`      | `**/*.{ts,vue}`                 | Error types, handling     |
| `testing-guide.md`       | `**/*.{test,spec}.ts`           | Vitest, mocking           |
| `ride-system.md`         | `**/*{ride,Ride}*`              | Ride state machine, fare  |
| `pwa-guidelines.md`      | `**/*{sw,pwa,manifest}*`        | PWA, offline, push        |
| `production-database.md` | `**/*.sql`                      | Migrations, indexes       |

## Manual (เรียกใช้ด้วย #)

| File                       | Purpose                    |
| -------------------------- | -------------------------- |
| `git-workflow.md`          | Branch naming, commits, PR |
| `production-checklist.md`  | Deploy checklist, rollback |
| `production-monitoring.md` | Logging, Sentry, alerts    |

## Quick Reference

```bash
# Code Quality
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run test -- --run # Vitest

# Database
supabase db push      # Apply migrations
supabase gen types typescript --local > src/types/database.ts

# Deploy
vercel --prod         # Production deploy
vercel rollback       # Instant rollback
```

## Key Principles

1. **TypeScript Strict** - No `any`, explicit return types
2. **Mobile-First** - Touch targets ≥ 44px, responsive
3. **Security** - RLS on all tables, input validation
4. **Performance** - Bundle < 500KB, Lighthouse ≥ 90
5. **Role-Aware** - Consider Customer/Provider/Admin impact
6. **Thai UX** - Thai language, local patterns
7. **MCP First** - Always use MCP for DB/Design operations

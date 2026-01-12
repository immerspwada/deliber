---
inclusion: manual
---

# Git Workflow

## Branch Naming

```
feature/  - New features (feature/ride-tracking)
fix/      - Bug fixes (fix/auth-redirect)
hotfix/   - Production hotfixes (hotfix/payment-error)
refactor/ - Code refactoring (refactor/ride-service)
docs/     - Documentation (docs/api-guide)
```

## Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type       | Description                 |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation               |
| `style`    | Formatting (no code change) |
| `refactor` | Code restructuring          |
| `perf`     | Performance improvement     |
| `test`     | Adding tests                |
| `chore`    | Maintenance                 |

### Examples

```bash
feat(ride): add real-time driver tracking

- Implement Supabase realtime subscription
- Add driver location marker on map

Closes #123
```

```bash
fix(auth): resolve session persistence issue

Fixes #456
```

## Pre-commit Hooks

```bash
# .husky/pre-commit
npm run lint
npm run type-check
npm run test -- --run
```

## PR Checklist

- [ ] TypeScript: no errors
- [ ] ESLint: no warnings
- [ ] Tests: all passing
- [ ] Mobile: tested on viewport
- [ ] RLS: policies updated (if DB changes)
- [ ] Secrets: none in code

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

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(ride): add real-time driver tracking

- Implement Supabase realtime subscription
- Add driver location marker on map
- Update ETA calculation

Closes #123
```

```bash
fix(auth): resolve session persistence issue

Session was not persisting after page refresh due to
incorrect storage configuration.

Fixes #456
```

## Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint:secrets
npm run lint
npm run test -- --run
```

## Pull Request Checklist

- [ ] Code follows project standards
- [ ] Tests added/updated
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tested on mobile viewport
- [ ] RLS policies updated (if DB changes)
- [ ] Migration is reversible
- [ ] No secrets in code

# 📊 Route Count Summary - Quick Reference

**Total Routes:** 197 unique paths  
**Generated:** December 23, 2025

---

## By Role

```
Customer:   42 routes (21.3%)
Provider:   24 routes (12.2%)
Admin Main: 84 routes (42.6%)
Admin V2:   39 routes (19.8%)
Public:      8 routes (4.1%)
```

---

## Key Numbers

### Customer Routes (42)
- Core Services: 10
- Account & Profile: 7
- Additional Services: 8
- New Services: 9
- V3 System: 2
- Redirects: 6

### Provider Routes (24)
- Dashboard & Core: 6
- Onboarding & Setup: 5
- Job Management: 4
- Settings & Support: 5
- V3 System: 4

### Admin Routes (84 Main + 39 V2 = 123 total)
- Authentication & Dashboard: 3
- User Management: 6
- Order Management: 10
- Financial Management: 11
- Marketing & Loyalty: 5
- Support & Feedback: 4
- Notifications: 3
- Analytics & Reports: 7
- Settings & Configuration: 11
- Advanced Features: 12
- V3 Multi-Role System: 3

---

## Issues Found

1. **Legacy Routes:** 7 routes with `-legacy` suffix
2. **Admin Duplication:** ~30 routes exist in both Main + V2 routers
3. **Duplicate Definitions:** `/admin/cancellations` appears twice
4. **Version Overlap:** V2/V3 routes coexist with originals

---

## Cleanup Target

| Metric | Current | Target | Reduction |
|--------|---------|--------|-----------|
| Total Routes | 197 | 160 | -37 (-19%) |
| Legacy Routes | 7 | 0 | -7 |
| Admin Duplicates | 30 | 0 | -30 |
| Duplicate Defs | 1 | 0 | -1 |

---

## Next Steps

1. ✅ **Phase 1 Complete**: Route analysis done
2. 🔄 **Phase 2**: Remove legacy routes (-7)
3. 🔄 **Phase 3**: Merge admin routers (-30)
4. 🔄 **Phase 4**: Fix duplicate definitions (-1)

**Target Completion:** Week 2-3

---

For detailed breakdown, see: `ROUTE_PATHS_REPORT.md`

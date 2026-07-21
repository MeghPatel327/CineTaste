# Up Next Queue - Deployment Guide

## Pre-Deployment Checklist

1. **Backup current database** (if applicable)
2. **Test in development environment** with sample data
3. **Review all modified files** (see UP_NEXT_IMPLEMENTATION.md)

## Deployment Steps

### Step 1: Deploy Code
Push the code changes to production:
- New files in `/src/features/movies/` and `/src/app/api/queue/`
- Modified service files
- Updated UI components

### Step 2: Run Data Migration
After deployment, run the migration endpoint **once per user** to clean up existing data:

```bash
# For a specific user (if you have direct access):
curl -X POST http://localhost:3000/api/queue/migrate \
  -H "Cookie: session=YOUR_SESSION_COOKIE"

# Or add a one-time migration function that runs on app startup for all users
```

### Step 3: Verify Migration
Check that:
- All Pending movies have unique sequential watch_order_rank (1, 2, 3...)
- All Completed movies have watch_order_rank = NULL
- All Dropped movies have watch_order_rank = NULL

### Step 4: Notify Users
Inform users of the new **Up Next** feature:
- New "Up Next" menu item in the sidebar
- Automatic queue management for Pending movies
- Queue is managed from the Up Next page, not from add/edit forms

## Rollback Plan

If issues occur:

1. **Revert code** to previous version
2. **No database changes needed** - the watch_order_rank field still exists
3. **Users' data is intact** - no destructive changes were made
4. Consider running migration only after confirming stability

## Monitoring

After deployment, monitor for:
- [ ] Users can access Up Next page
- [ ] Movies can be reordered without errors
- [ ] Status changes properly update queue
- [ ] No performance degradation
- [ ] Error logs for any queue-related failures

## Admin Dashboard Integration (Optional)

Consider adding to admin panel:
```tsx
// Example: Add migration button to admin panel
const handleQueueMigration = async () => {
  const res = await fetch("/api/queue/migrate", { method: "POST" });
  if (res.ok) {
    toast.success("Queue migrated successfully");
  }
};
```

## Support

If users report issues:
1. Check database for NULL/duplicate watch_order_rank values
2. Manually run migration for specific user
3. Review queue service logs for errors

---

**Migration Endpoint:** `POST /api/queue/migrate`  
**Queue List Endpoint:** `GET /api/queue`  
**Move Endpoint:** `POST /api/queue/[movieId]` with body `{ direction: "up" | "down" }`

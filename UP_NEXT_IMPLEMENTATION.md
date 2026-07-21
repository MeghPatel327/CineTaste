# CineTaste "Up Next" Queue Feature - Implementation Complete

## Overview
The Watch Order system has been completely replaced with an automatic **Up Next** queue that manages pending movies intelligently. Users no longer manually enter watch order ranks; instead, they add movies to their pending list and manage the queue from a dedicated "Up Next" page.

## What's Changed

### 1. **New "Up Next" Page**
- **Route:** `/recommendations`
- **Features:**
  - Displays all pending movies in queue order (by watch_order_rank)
  - Position badges (1, 2, 3...)
  - Move Up / Move Down buttons for reordering
  - Personal watch links displayed inline
  - Auto-loads and refreshes queue data

### 2. **Automatic Queue Management**
- When adding a movie with Status = **Pending**, it's automatically appended to the end of the queue
- When adding a movie with Status = **Completed** or **Dropped**, it's NOT added to the queue
- Queue positions are **always** continuous (1, 2, 3...) with no gaps or duplicates

### 3. **Dynamic Form Fields (Status-Based)**

#### Status = Pending
- **Show:** Personal Watch Link
- **Hide:** Rating, Watch Order Rank
- Auto-assigns next watch order position

#### Status = Completed / Dropped
- **Show:** Rating (0–10)
- **Hide:** Personal Watch Link, Watch Order Rank
- watch_order_rank set to NULL

### 4. **Automatic Status Change Handling**
When a movie's status changes:

| Old Status | New Status | Action |
|-----------|-----------|--------|
| Pending | Completed | Remove from queue, renumber remaining items |
| Pending | Dropped | Remove from queue, renumber remaining items |
| Completed | Pending | Append to end of queue |
| Dropped | Pending | Append to end of queue |
| Completed | Dropped | No queue change |
| Dropped | Completed | No queue change |

### 5. **Sidebar Navigation**
- Added "Up Next" link to the main sidebar (between Library and Discover)
- Uses `ListTodo` icon from lucide-react

### 6. **Queue Operations API**
New endpoints available:
- `GET /api/queue` - Fetch user's pending queue
- `POST /api/queue/[movieId]` - Move a movie (with `direction: "up"` or `"down"`)
- `POST /api/queue/migrate` - Migrate existing data (run once during rollout)

### 7. **Updated Forms**
- **MovieDetailsModal** (Discover → Add/Edit movie in modal)
  - Removed watch_order_rank field
  - Rating only shows for Completed/Dropped
  - Watch Link only shows for Pending

- **EditMoviePage** (`/movies/edit/[id]`)
  - Same conditional field logic
  - Simplified form layout

---

## Database Schema (No Changes Needed)

The existing `watch_order_rank` field continues to be used:

| Status | watch_order_rank |
|--------|------------------|
| Pending | Integer (1, 2, 3...) - queue position |
| Completed | NULL |
| Dropped | NULL |

---

## Migration Instructions

### For Initial Rollout:

1. **Automatic Migration on First Access:**
   - The next time the app loads, call the migration endpoint to clean up existing data:
   ```bash
   POST /api/queue/migrate
   ```
   This will:
   - Set all Completed/Dropped movies to have watch_order_rank = NULL
   - Renumber Pending movies to ensure continuous sequence

2. **Or, add to an admin panel:**
   - Add a "Migrate Queue Data" button in the admin dashboard to trigger the migration

### Manual Migration (if needed):
Users can also manually fix their queue by:
1. Going to the Up Next page
2. Moving movies to correct positions
3. The system will auto-renumber everything

---

## File Changes Summary

### New Files Created:
1. `/src/features/movies/queueService.ts` - Queue logic (getPendingQueue, moveMovieUp, moveMovieDown, renumberQueue, handleStatusChange, migrateQueueData)
2. `/src/app/api/queue/route.ts` - GET endpoint for queue
3. `/src/app/api/queue/[movieId]/route.ts` - POST endpoint for move operations
4. `/src/app/api/queue/migrate/route.ts` - POST endpoint for data migration

### Modified Files:
1. `/src/features/movies/movieService.ts` - Updated schemas and logic for auto-queuing on add/status change
2. `/src/components/MovieDetailsModal.tsx` - Updated form fields, removed watch_order_rank input
3. `/src/app/movies/edit/[id]/page.tsx` - Updated form fields to be conditional
4. `/src/app/recommendations/page.tsx` - Replaced redirect with Up Next queue page
5. `/src/components/Sidebar.tsx` - Added Up Next navigation item

---

## UX Flow

### Adding a Movie:
1. User searches in Discover
2. Clicks "Add to Library"
3. Selects Status (Pending, Completed, or Dropped)
4. If Pending: Can add Personal Watch Link (auto-assigned queue position)
5. If Completed/Dropped: Can add Rating
6. Movie added, queue auto-renumbered

### Managing Queue:
1. User goes to "Up Next" page
2. Sees all pending movies in order (1, 2, 3...)
3. Uses ▲/▼ buttons to reorder
4. Positions update instantly

### Completing/Dropping:
1. User edits a movie from Up Next or Library
2. Changes Status to Completed (add rating) or Dropped (add rating)
3. Movie automatically removed from queue
4. Remaining queue renumbered

---

## Testing Checklist

- [ ] Add a Pending movie → appears in Up Next queue at end
- [ ] Add a Completed movie → does NOT appear in Up Next, shows Rating field
- [ ] Add a Dropped movie → does NOT appear in Up Next, shows Rating field
- [ ] Move movies up/down in Up Next → positions update and persist
- [ ] Change Pending → Completed → removed from queue, renumbered
- [ ] Change Completed → Pending → appended to queue end
- [ ] Edit movie and confirm form fields show/hide based on status
- [ ] Library should NOT display watch_order_rank (no visible changes)
- [ ] Migration endpoint runs successfully without errors

---

## Notes

- The queue system is **automatic and transparent** to the user
- Users never think about watch order numbers
- The system maintains queue integrity at all times
- All existing functionality is preserved
- Backward compatible with existing movie data (requires one-time migration)

---

## Next Steps (Optional Enhancements)

- Add drag-and-drop reordering in Up Next page
- Add keyboard shortcuts for moving items
- Add bulk operations (move multiple, clear completed, etc.)
- Add queue statistics/insights
- Add notifications when movies are added to queue
- Add queue sharing between users

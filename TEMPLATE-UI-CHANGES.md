# Template UI Changes Summary

## What Changed

### Before (Old Design)
Templates had Edit, Publish/Unpublish, and a disabled "Template" button where Delete should be.

### After (Current Design - Per Your Request)
Templates show **only a single "Duplicate" button** at the bottom.

---

## Visual Layout

### Template Card (is_template = true)
```
┌─────────────────────────────────────┐
│  [Image/Placeholder]                │
│  ┌─────────┐ ┌──────┐              │
│  │Template│ │Draft │              │
│  └─────────┘ └──────┘              │
├─────────────────────────────────────┤
│  Title: Mathematics GCSE Group...  │
│  Description: A structured group... │
│  Subjects • £20/hr • online         │
│  0 views • 0 inquiries • 0 bookings │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       Duplicate             │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Regular Listing Card (is_template = false)
```
┌─────────────────────────────────────┐
│  [Image/Placeholder]                │
│  ┌──────────┐                       │
│  │Published │                       │
│  └──────────┘                       │
├─────────────────────────────────────┤
│  Title: My Custom GCSE Maths...    │
│  Description: Personalized...       │
│  Subjects • £30/hr • hybrid         │
│  15 views • 3 inquiries • 1 booking │
│                                     │
│  ┌──────┐ ┌─────────┐ ┌────────┐   │
│  │ Edit │ │Unpublish│ │ Delete │   │
│  └──────┘ └─────────┘ └────────┘   │
└─────────────────────────────────────┘
```

---

## Code Changes

### 1. ListingCard Component
**File:** `apps/web/src/app/my-listings/ListingCard.tsx`

#### Props Added
```typescript
onDuplicate: (id: string) => void;
```

#### Logic Changed
```typescript
// OLD: Show Edit/Publish/Delete with disabled button for templates
<div className={styles.actions}>
  <Link href={...}><Button>Edit</Button></Link>
  <Button>Publish/Unpublish</Button>
  <Button disabled>Template</Button>
</div>

// NEW: Conditional rendering based on isTemplate
{isTemplate ? (
  <div className={styles.actionsTemplate}>
    <Button variant="primary" onClick={() => onDuplicate(listing.id)}>
      Duplicate
    </Button>
  </div>
) : (
  <div className={styles.actions}>
    <Link href={...}><Button>Edit</Button></Link>
    <Button>Publish/Unpublish</Button>
    <Button>Delete</Button>
  </div>
)}
```

### 2. My Listings Page
**File:** `apps/web/src/app/my-listings/page.tsx`

#### Handler Added
```typescript
const handleDuplicate = async (templateId: string) => {
  const { duplicateTemplate } = await import('@/lib/utils/templateGenerator');
  const newListingId = await duplicateTemplate(templateId, user.id);

  if (newListingId) {
    toast.success('Template duplicated successfully!');
    await loadListings(); // Refresh to show new copy
  }
};
```

#### Component Updated
```typescript
<ListingCard
  listing={listing}
  onDelete={handleDelete}
  onToggleStatus={handleToggleStatus}
  onDuplicate={handleDuplicate} // NEW
/>
```

### 3. CSS Styling
**File:** `apps/web/src/app/my-listings/ListingCard.module.css`

#### Style Added
```css
.actionsTemplate {
  margin-top: auto;
  padding-top: 8px;
}
```

---

## User Flow

### Duplicating a Template

1. **User sees templates** at top of My Listings page
2. **Purple "Template" badge** clearly identifies system templates
3. **Single "Duplicate" button** at bottom of each template
4. **User clicks "Duplicate"**
   - `handleDuplicate(templateId)` called
   - `duplicateTemplate()` creates new listing from template
   - New listing has `is_template=false`, `is_deletable=true`
   - Success toast appears
   - Listings refresh automatically
5. **New copy appears** below templates in regular listings
6. **Copy has full controls:** Edit, Publish/Unpublish, Delete

---

## Key Implementation Details

### duplicateTemplate Function
**File:** `apps/web/src/lib/utils/templateGenerator.ts`

Already existed! You built this. It:
- Fetches the template listing
- Creates a copy with `is_template=false` and `is_deletable=true`
- Removes `template_id` so it's not treated as template
- Adds " (Copy)" suffix to title
- Generates new slug
- Returns new listing ID

### No Backend Changes Needed
The duplicate functionality uses existing:
- Supabase `.select()` to fetch template
- Supabase `.insert()` to create copy
- Existing listing table structure

---

## Benefits

✅ **Cleaner UI** - No disabled buttons or confusing options on templates
✅ **Clear Intent** - Single action: "Duplicate"
✅ **Better UX** - Users know exactly what templates are for
✅ **Separation** - Templates vs editable listings clearly distinguished
✅ **Reusability** - Duplicate same template multiple times

---

## What Templates Cannot Do

❌ Cannot be edited directly (must duplicate first)
❌ Cannot be deleted (protected from accidental removal)
❌ Cannot change status without duplicating

This ensures templates remain pristine examples that tutors can always reference.

---

## Testing

### Quick Test
```bash
npm run dev

# 1. Sign up as new tutor
# 2. Complete onboarding
# 3. Visit /my-listings
# 4. See 4 templates with purple badge
# 5. Click "Duplicate" on any template
# 6. See success toast
# 7. See new copy appear below templates
# 8. Verify copy has Edit/Publish/Delete buttons
```

### Expected Console Logs
```
[TemplateGenerator] Duplicated template abc-123 -> def-456
Template duplicated successfully!
```

---

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>

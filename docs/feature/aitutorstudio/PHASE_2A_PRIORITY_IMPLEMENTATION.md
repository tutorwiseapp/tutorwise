# Phase 2A: Priority Ranking - Implementation Guide

**Feature:** Priority Ranking for AI Tutors
**Priority:** High (Quick Win)
**Estimated Effort:** 2-3 hours
**Dependencies:** None
**Status:** Ready to Implement

---

## 📋 **Overview**

This feature allows admins to control the order in which AI tutors appear in search results and marketplace listings by assigning priority ranks. Higher priority tutors appear first, enabling strategic positioning of platform-owned tutors.

**Business Value:**
- **Strategic Control** - Position high-quality platform tutors prominently
- **Revenue Optimization** - Feature profitable tutors in search results
- **Market Gaps** - Prioritize tutors for underserved subjects
- **A/B Testing** - Test different positioning strategies

---

## 🎯 **User Stories**

### **Admin Experience**
```
As an admin
I want to set priority ranks on AI tutors
So that important tutors appear higher in search results
```

**Acceptance Criteria:**
- ✅ Admin can set priority rank (integer) on any AI tutor
- ✅ Higher rank = appears higher in search results
- ✅ Rank 0 = default (no priority)
- ✅ Same rank = falls back to creation date
- ✅ Priority indicator visible in admin table
- ✅ Changes reflect immediately in marketplace

### **Marketplace Experience**
```
As a student
When I search for AI tutors
I see higher-priority tutors first
So that I discover quality tutors more easily
```

**Acceptance Criteria:**
- ✅ Search results ordered by priority_rank DESC
- ✅ Fall back to created_at DESC for same rank
- ✅ No visible priority indicator (seamless UX)
- ✅ Works with filters and search queries

---

## 🗄️ **Database Changes**

### **Migration: 303_add_priority_rank_to_ai_tutors.sql**

```sql
/*
 * Migration: Add priority_rank to ai_tutors table
 * Phase: 2A - Priority Ranking
 * Created: 2026-02-25
 */

-- Step 1: Add priority_rank column
ALTER TABLE public.ai_tutors
ADD COLUMN priority_rank INTEGER NOT NULL DEFAULT 0;

-- Step 2: Add comment
COMMENT ON COLUMN public.ai_tutors.priority_rank IS
'Priority rank for marketplace ordering. Higher = appears first. 0 = default (no priority).';

-- Step 3: Create index for efficient ordering
CREATE INDEX idx_ai_tutors_priority_rank
ON public.ai_tutors(priority_rank DESC, created_at DESC);

-- Step 4: Add check constraint (optional - prevent negative ranks)
ALTER TABLE public.ai_tutors
ADD CONSTRAINT chk_priority_rank_non_negative
CHECK (priority_rank >= 0);

-- Step 5: Update existing records (optional - set platform tutors to rank 100)
-- UPDATE public.ai_tutors
-- SET priority_rank = 100
-- WHERE is_platform_owned = true AND status = 'published';

-- Rollback Plan:
-- DROP INDEX IF EXISTS idx_ai_tutors_priority_rank;
-- ALTER TABLE public.ai_tutors DROP COLUMN IF EXISTS priority_rank;
```

**Testing the Migration:**
```sql
-- Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ai_tutors' AND column_name = 'priority_rank';

-- Verify index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ai_tutors' AND indexname = 'idx_ai_tutors_priority_rank';

-- Test priority ordering
SELECT id, display_name, priority_rank, created_at
FROM ai_tutors
WHERE status = 'published'
ORDER BY priority_rank DESC, created_at DESC
LIMIT 10;
```

---

## 🔧 **Backend Changes**

### **1. Update AITutorsTable Component**

**File:** `apps/web/src/app/(admin)/admin/ai-tutors/components/AITutorsTable.tsx`

**Changes:**
1. Add priority_rank to column definitions
2. Add priority input with inline editing
3. Add bulk priority update action
4. Add priority indicator badge

**Code Changes:**

```typescript
// Add to imports
import { useState } from 'react';

// Update table columns array (around line 150)
const columns: Column<AITutor>[] = [
  // ... existing columns ...

  // Add Priority column after Status
  {
    header: 'Priority',
    accessor: (tutor) => tutor.priority_rank || 0,
    cell: (tutor) => <PriorityCell tutor={tutor} onUpdate={refetch} />,
    sortable: true,
  },

  // ... rest of columns ...
];

// Add PriorityCell component (add at bottom of file, before export)
interface PriorityCellProps {
  tutor: AITutor;
  onUpdate: () => void;
}

function PriorityCell({ tutor, onUpdate }: PriorityCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(tutor.priority_rank || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (value === tutor.priority_rank) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/ai-tutors/${tutor.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_rank: value }),
      });

      if (!response.ok) throw new Error('Failed to update priority');

      onUpdate(); // Refresh table
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating priority:', error);
      setValue(tutor.priority_rank || 0); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(tutor.priority_rank || 0);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={styles.priorityEdit}>
        <input
          type="number"
          min="0"
          max="1000"
          value={value}
          onChange={(e) => setValue(parseInt(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className={styles.priorityInput}
          disabled={isSaving}
          autoFocus
        />
        <button onClick={handleSave} disabled={isSaving} className={styles.saveBtn}>
          {isSaving ? '...' : '✓'}
        </button>
        <button onClick={handleCancel} disabled={isSaving} className={styles.cancelBtn}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className={styles.priorityDisplay}
      onClick={() => setIsEditing(true)}
      title="Click to edit priority"
    >
      {tutor.priority_rank > 0 ? (
        <span className={styles.priorityBadge}>
          {tutor.priority_rank}
        </span>
      ) : (
        <span className={styles.priorityDefault}>0</span>
      )}
    </div>
  );
}
```

**Add to AITutorsTable.module.css:**

```css
/* Priority Cell Styles */
.priorityDisplay {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.15s;
}

.priorityDisplay:hover {
  background-color: #f3f4f6;
}

.priorityBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.25rem 0.5rem;
  background-color: #dbeafe;
  color: #1e40af;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.875rem;
}

.priorityDefault {
  color: #9ca3af;
  font-size: 0.875rem;
}

.priorityEdit {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.priorityInput {
  width: 4rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.priorityInput:focus {
  outline: none;
  border-color: var(--color-primary-default, #006c67);
  box-shadow: 0 0 0 3px rgba(0, 108, 103, 0.1);
}

.saveBtn,
.cancelBtn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.15s;
}

.saveBtn {
  background-color: #10b981;
  color: white;
}

.saveBtn:hover:not(:disabled) {
  background-color: #059669;
}

.cancelBtn {
  background-color: #ef4444;
  color: white;
}

.cancelBtn:hover:not(:disabled) {
  background-color: #dc2626;
}

.saveBtn:disabled,
.cancelBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### **2. Create Priority Update API Endpoint**

**File:** `apps/web/src/app/api/ai-tutors/[id]/priority/route.ts` (NEW)

```typescript
/*
 * API Route: PATCH /api/ai-tutors/[id]/priority
 * Purpose: Update priority_rank for an AI tutor
 * Phase: 2A - Priority Ranking
 * Created: 2026-02-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Only admins can set priority ranks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { priority_rank } = body;

    // Validate priority_rank
    if (typeof priority_rank !== 'number' || priority_rank < 0) {
      return NextResponse.json(
        { error: 'priority_rank must be a non-negative number' },
        { status: 400 }
      );
    }

    // Update priority_rank
    const { data: aiTutor, error: updateError } = await supabase
      .from('ai_tutors')
      .update({ priority_rank })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating priority:', updateError);
      return NextResponse.json(
        { error: 'Failed to update priority rank' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: aiTutor,
      message: `Priority updated to ${priority_rank}`,
    });
  } catch (error) {
    console.error('Error in priority update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### **3. Update Search/Marketplace Query**

**File:** `apps/web/src/app/api/ai-tutors/route.ts`

**Changes:** Update the GET handler to order by priority

```typescript
// In GET handler (around line 30)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const subject = searchParams.get('subject');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');

    let query = supabase
      .from('ai_tutors')
      .select('*')
      .order('priority_rank', { ascending: false })  // ← CHANGED: Priority first
      .order('created_at', { ascending: false });    // ← Then creation date

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (subject) {
      query = query.eq('subject', subject);
    }

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AI tutors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI tutors' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in AI tutors GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### **4. Update TypeScript Types**

**File:** `apps/web/src/types/ai-tutors.ts`

**Changes:** Add priority_rank to AITutor interface

```typescript
export interface AITutor {
  id: string;
  owner_id: string;
  name: string;
  display_name: string;
  description: string | null;
  subject: string;
  price_per_hour: number;
  status: 'draft' | 'published' | 'unpublished' | 'archived';

  // Phase 1
  is_platform_owned: boolean;

  // Phase 2A
  is_featured: boolean;
  priority_rank: number;  // ← ADD THIS

  // Metrics
  total_sessions: number;
  total_revenue: number;
  avg_rating: number | null;
  total_reviews: number;

  created_at: string;
  published_at: string | null;
  updated_at: string;
}
```

---

## 🧪 **Testing Checklist**

### **Database Testing**
- [ ] Run migration successfully
- [ ] Verify column exists with correct type
- [ ] Verify index created
- [ ] Test constraint (negative values rejected)
- [ ] Test default value (0) for new records

### **API Testing**
```bash
# Test 1: Update priority (admin)
curl -X PATCH http://localhost:3000/api/ai-tutors/{id}/priority \
  -H "Content-Type: application/json" \
  -d '{"priority_rank": 100}'

# Test 2: Try as non-admin (should fail)
# (Use non-admin auth token)

# Test 3: Invalid value (should fail)
curl -X PATCH http://localhost:3000/api/ai-tutors/{id}/priority \
  -H "Content-Type: application/json" \
  -d '{"priority_rank": -10}'

# Test 4: Get AI tutors (verify ordering)
curl http://localhost:3000/api/ai-tutors?status=published
```

### **UI Testing**
- [ ] Priority column appears in admin table
- [ ] Click to edit priority works
- [ ] Enter key saves priority
- [ ] Escape key cancels edit
- [ ] Save button works
- [ ] Cancel button works
- [ ] Invalid values rejected (negative, non-numeric)
- [ ] Priority badge shows for non-zero values
- [ ] Priority 0 shows grey "0"
- [ ] Table refreshes after update
- [ ] Sorting by priority column works

### **Marketplace Testing**
- [ ] Set AI tutor A priority to 100
- [ ] Set AI tutor B priority to 50
- [ ] Set AI tutor C priority to 0
- [ ] Verify search results order: A → B → C
- [ ] Verify same priority falls back to created_at
- [ ] Verify priority works with filters
- [ ] Verify priority works with search
- [ ] Verify no priority indicator visible to students

---

## 📊 **Example Priority Strategy**

### **Recommended Ranges:**
```
1000+   - Top priority (flagship platform tutors)
500-999 - High priority (featured subjects)
100-499 - Medium priority (quality tutors)
1-99    - Low priority (experimental)
0       - Default (no priority)
```

### **Example Setup:**
```sql
-- Set flagship Math tutor to highest priority
UPDATE ai_tutors
SET priority_rank = 1000
WHERE name = 'platform-math-gcse-expert'
AND is_platform_owned = true;

-- Set featured Science tutor to high priority
UPDATE ai_tutors
SET priority_rank = 500
WHERE name = 'platform-science-alevel'
AND is_platform_owned = true;

-- Set new experimental tutor to low priority
UPDATE ai_tutors
SET priority_rank = 50
WHERE name = 'platform-french-beginner'
AND is_platform_owned = true;
```

---

## 🚀 **Deployment Steps**

### **1. Pre-Deployment**
```bash
# Backup database
pg_dump -h your-host -U postgres -d your-db > backup_before_priority.sql

# Test migration on staging
psql -h staging-host -U postgres -d staging-db -f tools/database/migrations/303_add_priority_rank_to_ai_tutors.sql
```

### **2. Deployment**
```bash
# 1. Run database migration
npm run db:migrate

# 2. Deploy code changes
git add .
git commit -m "feat: Add priority ranking for AI tutors (Phase 2A)"
git push origin main

# 3. Verify deployment
curl https://tutorwise.co.uk/api/ai-tutors?status=published | jq '.'
```

### **3. Post-Deployment**
```sql
-- Verify priority ordering works
SELECT id, display_name, priority_rank, created_at
FROM ai_tutors
WHERE status = 'published'
ORDER BY priority_rank DESC, created_at DESC
LIMIT 20;

-- Set initial priorities for platform tutors
UPDATE ai_tutors
SET priority_rank = 100
WHERE is_platform_owned = true
AND status = 'published';
```

---

## 📈 **Success Metrics**

**Week 1:**
- [ ] 100% of platform tutors have priority set
- [ ] Admin uses priority feature 5+ times
- [ ] Search results reflect priority order

**Week 4:**
- [ ] 20% increase in high-priority tutor clicks
- [ ] Strategic positioning tested for 3+ subjects
- [ ] No performance degradation in search

---

## 🔄 **Future Enhancements**

### **Phase 3 Additions:**
1. **Bulk Priority Editor** - Set priorities for multiple tutors at once
2. **Priority Presets** - One-click apply priority strategy (e.g., "Boost Science")
3. **Priority History** - Track when and why priorities changed
4. **Auto-Priority** - ML-based suggestions based on performance
5. **Priority Expiry** - Temporary boosts with auto-reset

### **Advanced Features:**
```typescript
// Priority with time decay
priority_score = base_priority * decay_factor(days_since_published)

// Priority with performance boost
priority_score = base_priority + (avg_rating * 10) + (total_sessions * 0.1)

// Priority with A/B testing
priority_score = base_priority + test_group_boost
```

---

## 🐛 **Common Issues**

### **Issue 1: Priority not updating**
**Symptom:** Admin changes priority but search results don't reflect it
**Cause:** Cache not invalidated
**Fix:** Add `revalidatePath('/ai-tutors')` in API route

### **Issue 2: Negative priorities allowed**
**Symptom:** Priority can be set to -100
**Cause:** Missing check constraint
**Fix:** Ensure migration includes `CHECK (priority_rank >= 0)`

### **Issue 3: Ties not handled**
**Symptom:** Two tutors with same priority show in random order
**Cause:** Missing secondary sort
**Fix:** Ensure `ORDER BY priority_rank DESC, created_at DESC`

---

## 📚 **Related Documents**

- [Solution Design](./SOLUTION_DESIGN.md) - Overall architecture
- [Phase 2A: Featured Implementation](./PHASE_2A_FEATURED_IMPLEMENTATION.md) - Companion feature
- [Admin AI Tutor Studio](./ADMIN_AI_TUTOR_STUDIO_IMPLEMENTATION.md) - Main implementation

---

**Status:** ✅ Ready to Implement
**Last Updated:** 2026-02-25
**Version:** 1.0

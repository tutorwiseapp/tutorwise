# Phase 2A: Featured AI Tutors - Implementation Guide

**Created:** 2026-02-25
**Status:** Ready to Implement
**Priority:** High (Quick Win)
**Estimated Effort:** Low (4-6 hours)

---

## 🎯 **Goal**

Enable admins to feature selected platform AI tutors on the homepage, increasing visibility and driving early adoption.

---

## 📋 **Implementation Checklist**

- [ ] Step 1: Database migration (add `is_featured` column)
- [ ] Step 2: Update AI Tutors admin table (add toggle button)
- [ ] Step 3: Create API endpoint for toggling featured status
- [ ] Step 4: Create `FeaturedAITutorsSection` component
- [ ] Step 5: Add featured section to homepage
- [ ] Step 6: Test & commit

---

## 💾 **Step 1: Database Migration**

**File:** `tools/database/migrations/303_add_featured_to_ai_tutors.sql`

```sql
-- ===================================================================
-- Migration: 303_add_featured_to_ai_tutors.sql
-- Purpose: Add is_featured flag for homepage featuring
-- Version: v1.0
-- Date: 2026-02-25
-- ===================================================================

-- Add is_featured column
ALTER TABLE public.ai_tutors
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.ai_tutors.is_featured IS 'TRUE if AI tutor is featured on homepage, FALSE otherwise';

-- Create index for efficient filtering (only index TRUE values)
CREATE INDEX IF NOT EXISTS idx_ai_tutors_is_featured
ON public.ai_tutors(is_featured)
WHERE is_featured = true;

-- Create composite index for homepage query (featured + published + platform)
CREATE INDEX IF NOT EXISTS idx_ai_tutors_featured_published
ON public.ai_tutors(is_featured, status, is_platform_owned)
WHERE is_featured = true AND status = 'published';

-- RLS Policy: Only admins can toggle featured status
-- (existing policies cover CRUD, no new policy needed)

-- Migration complete
SELECT 'Migration 303: is_featured column added to ai_tutors table' as status;
```

**Run migration:**
```bash
psql "$POSTGRES_URL_NON_POOLING" -f tools/database/migrations/303_add_featured_to_ai_tutors.sql
```

---

## 🛠️ **Step 2: Update Admin Table**

**File:** `apps/web/src/app/(admin)/admin/ai-tutors/components/AITutorsTable.tsx`

**Add column to table configuration:**

```typescript
// Line ~100: Add to columns array
{
  key: 'is_featured',
  label: 'Featured',
  width: '100px',
  sortable: true,
  render: (aiTutor) => (
    <Button
      variant={aiTutor.is_featured ? 'primary' : 'secondary'}
      size="small"
      onClick={() => handleToggleFeatured(aiTutor.id, aiTutor.is_featured)}
      disabled={!aiTutor.is_platform_owned} // Only platform tutors can be featured
    >
      {aiTutor.is_featured ? '⭐ Featured' : 'Feature'}
    </Button>
  ),
},
```

**Add toggle handler:**

```typescript
// Line ~200: Add mutation for toggling featured
const toggleFeaturedMutation = useMutation({
  mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: boolean }) => {
    const response = await fetch(`/api/ai-tutors/${id}/featured`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: !currentStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to toggle featured status');
    }

    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-ai-tutors'] });
    toast.success('Featured status updated');
  },
  onError: (error: Error) => {
    toast.error(error.message);
  },
});

const handleToggleFeatured = (id: string, currentStatus: boolean) => {
  toggleFeaturedMutation.mutate({ id, currentStatus });
};
```

---

## 🔌 **Step 3: Create API Endpoint**

**File:** `apps/web/src/app/api/ai-tutors/[id]/featured/route.ts`

```typescript
/**
 * Filename: api/ai-tutors/[id]/featured/route.ts
 * Purpose: Toggle featured status for AI tutors (admin only)
 * Created: 2026-02-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * PATCH /api/ai-tutors/[id]/featured
 * Toggle featured status (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Only admins can feature AI tutors' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { is_featured } = body;

    if (typeof is_featured !== 'boolean') {
      return NextResponse.json(
        { error: 'is_featured must be a boolean' },
        { status: 400 }
      );
    }

    // Verify AI tutor exists and is platform-owned
    const { data: aiTutor, error: fetchError } = await supabase
      .from('ai_tutors')
      .select('id, is_platform_owned')
      .eq('id', id)
      .single();

    if (fetchError || !aiTutor) {
      return NextResponse.json(
        { error: 'AI tutor not found' },
        { status: 404 }
      );
    }

    if (!aiTutor.is_platform_owned) {
      return NextResponse.json(
        { error: 'Only platform-owned AI tutors can be featured' },
        { status: 400 }
      );
    }

    // Update featured status
    const { data: updatedTutor, error: updateError } = await supabase
      .from('ai_tutors')
      .update({ is_featured })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating featured status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update featured status' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTutor, { status: 200 });
  } catch (error) {
    console.error('Error in featured toggle:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 **Step 4: Create Featured Section Component**

**File:** `apps/web/src/app/components/marketplace/FeaturedAITutorsSection.tsx`

```typescript
/**
 * Filename: FeaturedAITutorsSection.tsx
 * Purpose: Display featured AI tutors on homepage
 * Created: 2026-02-25
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import Button from '@/app/components/ui/actions/Button';
import { Bot, Star } from 'lucide-react';
import styles from './FeaturedAITutorsSection.module.css';

interface AITutor {
  id: string;
  name: string;
  display_name: string;
  description: string;
  subject: string;
  price_per_hour: number;
  avg_rating: number | null;
  total_reviews: number;
  is_platform_owned: boolean;
}

export default function FeaturedAITutorsSection() {
  const supabase = createClient();

  const { data: featuredTutors, isLoading } = useQuery({
    queryKey: ['featured-ai-tutors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tutors')
        .select('id, name, display_name, description, subject, price_per_hour, avg_rating, total_reviews, is_platform_owned')
        .eq('is_featured', true)
        .eq('status', 'published')
        .order('priority_rank', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as AITutor[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't render section if no featured tutors
  if (!featuredTutors || featuredTutors.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <section className={styles.featuredSection}>
        <div className={styles.container}>
          <h2 className={styles.title}>Featured AI Tutors</h2>
          <div className={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.cardSkeleton} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.featuredSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Featured AI Tutors</h2>
          <p className={styles.subtitle}>
            Hand-picked AI tutors to help you learn faster
          </p>
        </div>

        <div className={styles.grid}>
          {featuredTutors.map((tutor) => (
            <Link
              key={tutor.id}
              href={`/ai-tutors/${tutor.id}`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <div className={styles.iconWrapper}>
                  <Bot className={styles.icon} />
                </div>
                {tutor.is_platform_owned && (
                  <span className={styles.platformBadge}>
                    <Star className={styles.starIcon} />
                    Platform
                  </span>
                )}
              </div>

              <h3 className={styles.cardTitle}>{tutor.display_name}</h3>
              <p className={styles.cardDescription}>
                {tutor.description || `Expert ${tutor.subject} AI tutor`}
              </p>

              <div className={styles.cardFooter}>
                <div className={styles.subject}>{tutor.subject}</div>
                <div className={styles.price}>£{tutor.price_per_hour}/hour</div>
              </div>

              {tutor.avg_rating && tutor.total_reviews > 0 && (
                <div className={styles.rating}>
                  <Star className={styles.ratingIcon} />
                  <span>{tutor.avg_rating.toFixed(1)}</span>
                  <span className={styles.reviewCount}>({tutor.total_reviews})</span>
                </div>
              )}
            </Link>
          ))}
        </div>

        <div className={styles.footer}>
          <Button
            variant="secondary"
            href="/ai-tutors"
          >
            View All AI Tutors
          </Button>
        </div>
      </div>
    </section>
  );
}
```

**File:** `apps/web/src/app/components/marketplace/FeaturedAITutorsSection.module.css`

```css
.featuredSection {
  padding: 4rem 0;
  background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-default);
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.iconWrapper {
  width: 48px;
  height: 48px;
  background: var(--color-primary-light);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary-default);
}

.platformBadge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #8b6914;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.starIcon {
  width: 12px;
  height: 12px;
}

.cardTitle {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.cardDescription {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cardFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}

.subject {
  background: var(--color-primary-light);
  color: var(--color-primary-default);
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.price {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-default);
}

.rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.ratingIcon {
  width: 14px;
  height: 14px;
  color: #fbbf24;
  fill: #fbbf24;
}

.reviewCount {
  color: var(--color-text-tertiary);
}

.footer {
  text-align: center;
  margin-top: 2rem;
}

.cardSkeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
  height: 240px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 🏠 **Step 5: Add to Homepage**

**File:** `apps/web/src/app/page.tsx`

```typescript
// Add import
import FeaturedAITutorsSection from '@/app/components/marketplace/FeaturedAITutorsSection';

// Add section (after hero, before other sections)
export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* Featured AI Tutors Section */}
      <FeaturedAITutorsSection />

      {/* Rest of homepage sections */}
      <FeaturesSection />
      <TestimonialsSection />
      {/* ... */}
    </>
  );
}
```

---

## ✅ **Step 6: Testing Checklist**

- [ ] Run database migration successfully
- [ ] Verify `is_featured` column exists in `ai_tutors` table
- [ ] Test admin toggle button (feature/unfeature)
- [ ] Verify only platform tutors can be featured
- [ ] Verify only admins can toggle featured status
- [ ] Verify featured section appears on homepage
- [ ] Verify featured section hidden when no featured tutors
- [ ] Test mobile responsiveness
- [ ] Test loading states
- [ ] Verify featured tutors link to detail pages

---

## 📝 **Notes**

**Limitations:**
- Only platform-owned AI tutors can be featured
- Only admins can toggle featured status
- Max 6 featured tutors shown on homepage
- Featured section hidden if no featured tutors

**Future Enhancements:**
- Featured carousel with auto-rotation
- Featured expiry dates
- Featured slots (max 10 featured tutors)
- Analytics on featured tutor performance

---

**Status:** Ready to Implement
**Next:** [Phase 2A: Priority Ranking Implementation](./PHASE_2A_PRIORITY_IMPLEMENTATION.md)

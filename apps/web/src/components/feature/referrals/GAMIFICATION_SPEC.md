# Referral Gamification System Specification

**Created**: 2025-12-07
**Phase**: 3 - Performance Dashboard & Gamification
**Status**: Design Phase

---

## 1. Achievement Milestones

### Current Implementation
- **10 Referrals**: First tier achievement
- **50 Referrals**: Mid tier achievement
- **100 Referrals**: Top tier achievement

### Visual Treatment
- **Locked**: Grey background, lock icon, progress bar showing X/milestone
- **Unlocked**: Green background (#f0fdf4), checkmark icon, no progress bar

### Future Enhancements
- Additional milestone tiers (250, 500, 1000)
- Special badges/icons for each tier
- Rewards tied to milestones (bonus commission %, exclusive features)

---

## 2. Streak System

### Definition
A **referral streak** tracks consecutive periods where a user has made at least one successful referral.

### Streak Calculation Logic

#### Option A: Weekly Streaks (Recommended for MVP)
- User maintains streak by making ≥1 referral per week
- Week starts on Monday 00:00 UTC
- If no referral made in current week, streak resets to 0
- More achievable, encourages consistent behavior

**Implementation**:
```typescript
function calculateWeeklyStreak(referrals: Referral[]): number {
  if (!referrals.length) return 0;

  const sortedRefs = referrals
    .map(r => new Date(r.created_at))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let currentWeekStart = getWeekStart(new Date());

  for (let weekStart = currentWeekStart; ; weekStart = getPreviousWeekStart(weekStart)) {
    const hasReferralInWeek = sortedRefs.some(date =>
      date >= weekStart && date < addDays(weekStart, 7)
    );

    if (!hasReferralInWeek) break;
    streak++;
  }

  return streak;
}
```

#### Option B: Daily Streaks
- User maintains streak by making ≥1 referral per day
- More challenging, may discourage users
- Better suited for high-volume referrers

#### Option C: Calendar Month Streaks
- User maintains streak by making ≥1 referral per calendar month
- Too long, less motivating
- Not recommended for MVP

**Recommended**: **Weekly Streaks** (Option A)

### Streak Display
- Show flame icon 🔥 with "{N}-day streak!" text
- Yellow/amber background (#fef3c7) to draw attention
- Motivational message: "Keep referring to maintain your streak"
- Only show if streak > 0

---

## 3. Leaderboard System

### Scope
**Monthly Leaderboard** - Resets at start of each calendar month

### Ranking Logic
Users ranked by **number of successful referrals** in current month (where status = 'Referred', 'Signed Up', or 'Converted')

**Tie-breaker**: If two users have same referral count, rank by total commission earned in current month.

### Calculation
```typescript
function calculateLeaderboardPosition(userId: string): number {
  // 1. Fetch all users' referral counts for current month
  // 2. Sort by count DESC, then by total commission DESC
  // 3. Find user's position in sorted list
  // 4. Return position (1-indexed)

  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

  // SQL query would be:
  // SELECT referrer_user_id, COUNT(*) as referral_count, SUM(commission) as total_commission
  // FROM referrals
  // WHERE created_at >= monthStart
  // GROUP BY referrer_user_id
  // ORDER BY referral_count DESC, total_commission DESC

  // Return user's rank in this ordered list
}
```

### Display Logic
- Only show if user has made ≥1 referral this month
- Show position as "Leaderboard: #{position} this month"
- Contextual messaging:
  - **Top 10**: "Amazing! You're in the top 10!"
  - **11-50**: "Great work! Keep climbing!"
  - **51+**: "Keep referring to rise up the ranks!"

### Privacy Considerations
- Only show user's own position, not full leaderboard (respects privacy)
- Future enhancement: Opt-in public leaderboard view

---

## 4. Database Schema Requirements

### New Columns Needed

#### `user_profiles` or new `referral_stats` table
```sql
-- Option 1: Add to user_profiles
ALTER TABLE user_profiles
ADD COLUMN referral_streak_count INTEGER DEFAULT 0,
ADD COLUMN referral_streak_last_updated TIMESTAMP WITH TIME ZONE;

-- Option 2: Create separate table (preferred for scalability)
CREATE TABLE referral_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_streak_count INTEGER DEFAULT 0,
  streak_last_updated TIMESTAMP WITH TIME ZONE,
  longest_streak_count INTEGER DEFAULT 0,
  total_achievements_unlocked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Leaderboard Query Function
```sql
CREATE OR REPLACE FUNCTION get_monthly_leaderboard_position(
  p_user_id UUID,
  p_month_start TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('month', NOW())
)
RETURNS INTEGER AS $$
DECLARE
  v_position INTEGER;
BEGIN
  WITH ranked_users AS (
    SELECT
      referrer_user_id,
      COUNT(*) as referral_count,
      COALESCE(SUM((first_commission->>'amount')::NUMERIC), 0) as total_commission,
      ROW_NUMBER() OVER (
        ORDER BY COUNT(*) DESC,
        COALESCE(SUM((first_commission->>'amount')::NUMERIC), 0) DESC
      ) as rank
    FROM referrals
    WHERE created_at >= p_month_start
      AND created_at < p_month_start + INTERVAL '1 month'
      AND status IN ('Referred', 'Signed Up', 'Converted')
    GROUP BY referrer_user_id
  )
  SELECT rank INTO v_position
  FROM ranked_users
  WHERE referrer_user_id = p_user_id;

  RETURN COALESCE(v_position, NULL);
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 5. API Integration

### New API Endpoints Needed

#### GET `/api/referrals/gamification-stats`
Returns gamification data for current user:
```typescript
{
  totalReferrals: number;
  currentStreak: number;
  longestStreak: number;
  leaderboardPosition: number | null;
  achievements: {
    milestone: number;
    unlocked: boolean;
    unlockedAt?: string;
  }[];
}
```

### React Query Integration
```typescript
export const useReferralGamification = () => {
  return useQuery({
    queryKey: ['referral-gamification'],
    queryFn: async () => {
      const response = await fetch('/api/referrals/gamification-stats');
      if (!response.ok) throw new Error('Failed to fetch gamification stats');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

---

## 6. Cron Jobs / Background Tasks

### Streak Update Job
**Frequency**: Daily at 00:00 UTC

**Logic**:
1. For each user with active streak (streak_count > 0)
2. Check if they made a referral in the current period (week/day)
3. If no referral found, reset streak to 0
4. Update `streak_last_updated` timestamp

**Implementation**: Supabase Edge Function with cron trigger

```typescript
// supabase/functions/update-referral-streaks/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Logic to recalculate all users' streaks
  // Update referral_stats table

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 7. Implementation Roadmap

### Phase 3A: MVP (Current Sprint)
- ✅ Achievement milestones display
- ✅ Basic UI components
- ⏳ Weekly streak calculation (client-side)
- ⏳ Monthly leaderboard position calculation
- ⏳ Database schema updates
- ⏳ API endpoints

### Phase 3B: Enhancement
- Background job for streak updates
- Push notifications for streak breaks
- Email reminders to maintain streak
- Achievement unlock animations
- Public leaderboard opt-in

### Phase 3C: Advanced Features
- Referral quality score (conversion rate weighting)
- Team/organization leaderboards
- Custom achievement badges
- Referral challenges/competitions
- Rewards marketplace (redeem achievements for perks)

---

## 8. Success Metrics

### KPIs to Track
1. **Engagement**: % of users checking Performance tab
2. **Behavior Change**: Increase in weekly referral frequency
3. **Retention**: Users with active streaks have higher platform retention
4. **Competition**: Top 20% of leaderboard drives 50%+ of referrals

### A/B Test Opportunities
- Weekly vs Daily streaks
- Achievement milestone values
- Reward types (badges vs commission bonuses)
- Public vs private leaderboard

---

## 9. Technical Considerations

### Performance
- Cache leaderboard positions (5-minute TTL)
- Index on `referrals.created_at` and `referrals.referrer_user_id`
- Materialize monthly stats for faster queries

### Security
- RLS policies on `referral_stats` table
- Rate limiting on gamification API endpoints
- Prevent gaming the system (duplicate referrals, fake emails)

### Accessibility
- Screen reader support for achievement states
- Keyboard navigation for leaderboard
- Color-blind friendly status indicators

---

## 10. Open Questions

1. **Streak Definition**: Should "Signed Up" and "Converted" referrals count more than "Referred"?
2. **Leaderboard Scope**: Global vs regional vs industry-specific?
3. **Rewards**: What tangible rewards should unlock at milestones?
4. **Streak Grace Period**: Should users get a 1-day grace period before streak resets?
5. **Multiple Referrals in Period**: Should 5 referrals in a week count more than 1?

---

## Next Steps

1. User discussion to answer open questions
2. Create database migration for `referral_stats` table
3. Implement `/api/referrals/gamification-stats` endpoint
4. Add streak calculation logic
5. Add leaderboard calculation logic
6. Test with mock data
7. Deploy and monitor engagement metrics

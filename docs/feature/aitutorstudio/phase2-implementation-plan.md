# AI Tutor Studio - Phase 2 Implementation Plan

**Created:** 2026-02-24
**Status:** 🚧 Planning
**Goal:** Scale to 100 AI tutors with advanced features

---

## Phase 2 Scope Overview

### Completed in Phase 1 ✅
From the MVP implementation, we already have:
- ✅ CaaS-based graduated limits (0-50 AI tutors based on credibility)
- ✅ URL links database schema (`ai_tutor_links` table)
- ✅ URL links API routes (GET, POST, DELETE)
- ✅ In-session escalation ("Request Human Help" → escalate to human tutors)
- ✅ Material upload infrastructure
- ✅ RAG 3-tier system (Materials → Links → Sage)
- ✅ Reviews system (5-star ratings)

### Remaining Phase 2 Features 🚧

| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| **1. AI Quality Score** | ❌ Not Started | High | 3 days |
| **2. Custom Skills** | ❌ Not Started | High | 2 days |
| **3. Analytics Dashboard** | ❌ Not Started | High | 5 days |
| **4. Material Skill-Tagging** | ⚠️ Partial | Medium | 2 days |
| **5. Owner Notifications** | ❌ Not Started | Medium | 3 days |
| **6. URL Link UI** | ⚠️ Backend Only | High | 2 days |
| **7. Organisation Integration** | ❌ Not Started | Low | 5 days |

**Total Estimated Effort:** ~22 days (4.5 weeks)

---

## Feature 1: AI Quality Score System

### Overview
0-100 scoring system that measures AI tutor quality based on:
- Session completion rate
- Average review rating
- Client satisfaction
- Material completeness
- Response quality (based on client feedback)

### Database Schema
```sql
-- Add to ai_tutors table
ALTER TABLE ai_tutors ADD COLUMN quality_score integer DEFAULT 0;
ALTER TABLE ai_tutors ADD COLUMN quality_metrics jsonb DEFAULT '{
  "session_completion_rate": 0,
  "avg_rating": 0,
  "total_sessions": 0,
  "escalation_rate": 0,
  "material_completeness": 0,
  "response_quality": 0
}'::jsonb;

-- Quality score calculation function
CREATE OR REPLACE FUNCTION calculate_ai_tutor_quality_score(
  tutor_id uuid
) RETURNS integer AS $$
DECLARE
  score integer := 0;
  metrics jsonb;
BEGIN
  -- Calculate metrics
  WITH session_stats AS (
    SELECT
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
      COUNT(*) FILTER (WHERE escalated_to_human = true) as escalated_sessions
    FROM ai_tutor_sessions
    WHERE ai_tutor_id = tutor_id
  ),
  review_stats AS (
    SELECT
      AVG(rating) as avg_rating,
      COUNT(*) as review_count
    FROM ai_tutor_reviews
    WHERE ai_tutor_id = tutor_id
  ),
  material_stats AS (
    SELECT
      COUNT(*) as material_count
    FROM ai_tutor_materials
    WHERE ai_tutor_id = tutor_id AND status = 'ready'
  )
  SELECT jsonb_build_object(
    'session_completion_rate',
      CASE WHEN s.total_sessions > 0
        THEN (s.completed_sessions::float / s.total_sessions * 100)::int
        ELSE 0
      END,
    'avg_rating', COALESCE(r.avg_rating, 0),
    'total_sessions', s.total_sessions,
    'escalation_rate',
      CASE WHEN s.total_sessions > 0
        THEN (s.escalated_sessions::float / s.total_sessions * 100)::int
        ELSE 0
      END,
    'material_completeness',
      CASE WHEN m.material_count >= 5 THEN 100
           WHEN m.material_count >= 3 THEN 75
           WHEN m.material_count >= 1 THEN 50
           ELSE 0
      END
  ) INTO metrics
  FROM session_stats s, review_stats r, material_stats m;

  -- Calculate weighted score (0-100)
  score := (
    (metrics->>'session_completion_rate')::int * 0.25 +  -- 25%
    (metrics->>'avg_rating')::float * 20 +               -- 20% (5-star → 100)
    LEAST(100, (metrics->>'total_sessions')::int * 2) * 0.20 + -- 20% (50+ sessions = 100)
    (100 - (metrics->>'escalation_rate')::int) * 0.15 +  -- 15% (lower is better)
    (metrics->>'material_completeness')::int * 0.20      -- 20%
  )::int;

  -- Update ai_tutors table
  UPDATE ai_tutors
  SET
    quality_score = score,
    quality_metrics = metrics
  WHERE id = tutor_id;

  RETURN score;
END;
$$ LANGUAGE plpgsql;
```

### API Endpoint
```typescript
// GET /api/ai-tutors/[id]/quality
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase.rpc('calculate_ai_tutor_quality_score', {
    tutor_id: params.id,
  });

  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('quality_score, quality_metrics')
    .eq('id', params.id)
    .single();

  return NextResponse.json({
    quality_score: tutor.quality_score,
    metrics: tutor.quality_metrics,
    breakdown: {
      session_completion: `${tutor.quality_metrics.session_completion_rate}%`,
      avg_rating: `${tutor.quality_metrics.avg_rating.toFixed(1)}/5.0`,
      total_sessions: tutor.quality_metrics.total_sessions,
      escalation_rate: `${tutor.quality_metrics.escalation_rate}%`,
      materials: `${tutor.quality_metrics.material_completeness}%`,
    },
  });
}
```

### UI Component
```tsx
// QualityScoreWidget.tsx
export default function QualityScoreWidget({ aiTutorId }: { aiTutorId: string }) {
  const { data } = useQuery(['ai-tutor-quality', aiTutorId], () =>
    fetch(`/api/ai-tutors/${aiTutorId}/quality`).then(r => r.json())
  );

  return (
    <div className="quality-score-widget">
      <h3>AI Quality Score</h3>
      <div className="score-circle">
        <CircularProgress value={data.quality_score} />
        <span className="score">{data.quality_score}/100</span>
      </div>
      <div className="metrics">
        <MetricBar label="Sessions" value={data.breakdown.session_completion} />
        <MetricBar label="Reviews" value={data.breakdown.avg_rating} />
        <MetricBar label="Materials" value={data.breakdown.materials} />
      </div>
    </div>
  );
}
```

---

## Feature 2: Custom Skills

### Overview
Allow tutors to create custom skills beyond the predefined library.

### Current Implementation
- AI tutors have `skills: string[]` field
- Skills are selected from dropdown (predefined list)

### Proposed Changes
```typescript
// Update skills system to support custom skills
interface Skill {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  created_by?: string; // profile_id if custom
  usage_count?: number; // how many AI tutors use this skill
}

// Database migration
CREATE TABLE custom_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

-- Link table for AI tutor skills
CREATE TABLE ai_tutor_skills (
  ai_tutor_id uuid REFERENCES ai_tutors(id) ON DELETE CASCADE,
  skill_name varchar(100) NOT NULL,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (ai_tutor_id, skill_name)
);
```

### UI Changes
```tsx
// SkillSelector.tsx
<div className="skill-selector">
  <label>Skills</label>

  {/* Predefined skills */}
  <Select multiple value={skills} onChange={handleSkillChange}>
    <optgroup label="Popular Skills">
      {PREDEFINED_SKILLS.map(skill => (
        <option key={skill} value={skill}>{skill}</option>
      ))}
    </optgroup>
  </Select>

  {/* Custom skill input */}
  <div className="custom-skill-input">
    <input
      type="text"
      placeholder="Add custom skill..."
      value={customSkill}
      onChange={(e) => setCustomSkill(e.target.value)}
    />
    <button onClick={handleAddCustomSkill}>Add</button>
  </div>

  {/* Selected skills */}
  <div className="selected-skills">
    {skills.map(skill => (
      <Chip
        key={skill}
        label={skill}
        onDelete={() => handleRemoveSkill(skill)}
        color={isCustomSkill(skill) ? 'secondary' : 'primary'}
      />
    ))}
  </div>
</div>
```

---

## Feature 3: Advanced Analytics Dashboard

### Overview
Session heatmaps, skill performance analytics, revenue tracking.

### Components

#### 3.1 Session Heatmap
```tsx
// SessionHeatmap.tsx
import { Calendar } from 'react-calendar-heatmap';

export default function SessionHeatmap({ aiTutorId }: Props) {
  const { data: sessions } = useQuery(['session-heatmap', aiTutorId], () =>
    fetch(`/api/ai-tutors/${aiTutorId}/analytics/sessions`).then(r => r.json())
  );

  const heatmapData = sessions.map(s => ({
    date: s.date,
    count: s.session_count,
  }));

  return (
    <CalendarHeatmap
      startDate={subDays(new Date(), 90)}
      endDate={new Date()}
      values={heatmapData}
      classForValue={(value) => {
        if (!value) return 'color-empty';
        return `color-scale-${Math.min(4, Math.floor(value.count / 5))}`;
      }}
    />
  );
}
```

#### 3.2 Skill Performance Chart
```tsx
// SkillPerformanceChart.tsx
export default function SkillPerformanceChart({ aiTutorId }: Props) {
  // Shows which skills have:
  // - Most sessions
  // - Highest ratings
  // - Lowest escalation rate

  return (
    <BarChart data={skillStats}>
      <Bar dataKey="sessions" fill="#0d9488" />
      <Bar dataKey="avg_rating" fill="#3b82f6" />
      <XAxis dataKey="skill_name" />
      <YAxis />
    </BarChart>
  );
}
```

#### 3.3 Revenue Tracking
```tsx
// RevenueChart.tsx
export default function RevenueChart({ aiTutorId }: Props) {
  const { data } = useQuery(['revenue', aiTutorId], () =>
    fetch(`/api/ai-tutors/${aiTutorId}/analytics/revenue`).then(r => r.json())
  );

  return (
    <div className="revenue-stats">
      <Stat label="Total Revenue" value={`£${data.total_revenue}`} />
      <Stat label="This Month" value={`£${data.this_month}`} />
      <Stat label="Avg per Session" value={`£${data.avg_per_session}`} />

      <LineChart data={data.monthly_trend}>
        <Line dataKey="revenue" stroke="#0d9488" />
        <XAxis dataKey="month" />
        <YAxis />
      </LineChart>
    </div>
  );
}
```

### API Endpoints
```typescript
// GET /api/ai-tutors/[id]/analytics/sessions
// GET /api/ai-tutors/[id]/analytics/skills
// GET /api/ai-tutors/[id]/analytics/revenue
```

---

## Feature 4: Material Skill-Tagging

### Overview
Tag specific PDFs/links to specific skills for better RAG retrieval.

### Current State
- ✅ AI tutors have skills
- ❌ Materials don't have skill tags
- ❌ Links don't have skill tags

### Proposed Changes
```sql
-- Add skills column to materials
ALTER TABLE ai_tutor_materials ADD COLUMN skills text[] DEFAULT '{}';

-- Add skills column to links (already exists in schema!)
-- No migration needed - check existing schema
```

### UI Changes
```tsx
// MaterialUploadForm.tsx
<div className="material-upload">
  <FileInput onChange={handleFileSelect} />

  {/* Add skill tags */}
  <div className="skill-tags">
    <label>Which skills does this material cover?</label>
    <Select multiple value={materialSkills}>
      {aiTutor.skills.map(skill => (
        <option key={skill} value={skill}>{skill}</option>
      ))}
    </Select>
  </div>

  <button onClick={handleUpload}>Upload Material</button>
</div>
```

### RAG Improvement
```typescript
// Enhanced RAG query with skill filtering
const relevantMaterials = await supabase.rpc('match_ai_tutor_materials', {
  ai_tutor_id: tutorId,
  query_embedding: embedding,
  filter_skills: ['Maths-GCSE', 'Algebra'], // Filter by relevant skills
  match_threshold: 0.3,
  match_count: 5,
});
```

---

## Feature 5: Owner Notifications

### Overview
Notify AI tutor owners about:
- Session escalations
- New reviews (especially low ratings <3 stars)
- Quality score drops
- Subscription payment failures

### Implementation
```typescript
// Notification types
type AITutorNotification =
  | 'session_escalated'
  | 'review_received'
  | 'low_rating_alert'
  | 'quality_score_drop'
  | 'subscription_failed';

// Database trigger on ai_tutor_sessions
CREATE OR REPLACE FUNCTION notify_owner_on_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.escalated_to_human = true AND OLD.escalated_to_human = false THEN
    -- Get AI tutor owner
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link
    )
    SELECT
      ai_tutors.owner_id,
      'ai_tutor_escalation',
      'Session Escalated to Human',
      'A client requested human help during an AI tutor session',
      '/ai-tutors/' || NEW.ai_tutor_id || '/sessions/' || NEW.id
    FROM ai_tutors
    WHERE ai_tutors.id = NEW.ai_tutor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_escalation
  AFTER UPDATE ON ai_tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_escalation();
```

### Email Notifications
```typescript
// Send email on low rating
if (rating <= 2) {
  await sendEmail({
    to: aiTutor.owner_email,
    subject: `Low Rating Alert: ${aiTutor.display_name}`,
    template: 'ai-tutor-low-rating',
    data: {
      tutor_name: aiTutor.display_name,
      rating,
      review_text,
      session_id,
    },
  });
}
```

---

## Feature 6: URL Link UI

### Overview
Complete the URL links UI (backend already exists).

### Components Needed
```tsx
// LinkManager.tsx
export default function LinkManager({ aiTutorId }: Props) {
  const [links, setLinks] = useState<AITutorLink[]>([]);
  const [newLink, setNewLink] = useState({ url: '', title: '', description: '' });

  const handleAddLink = async () => {
    await fetch(`/api/ai-tutors/${aiTutorId}/links`, {
      method: 'POST',
      body: JSON.stringify(newLink),
    });
    // Refresh list
  };

  return (
    <div className="link-manager">
      <h3>External Resources</h3>

      {/* Add new link */}
      <form onSubmit={handleAddLink}>
        <input
          type="url"
          placeholder="https://..."
          value={newLink.url}
          onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
        />
        <input
          type="text"
          placeholder="Resource Title"
          value={newLink.title}
          onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
        />
        <textarea
          placeholder="Description (optional)"
          value={newLink.description}
          onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
        />
        <button type="submit">Add Link</button>
      </form>

      {/* Existing links */}
      <div className="links-list">
        {links.map(link => (
          <LinkCard
            key={link.id}
            link={link}
            onEdit={handleEditLink}
            onDelete={handleDeleteLink}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Feature 7: Organisation Integration

### Overview
Allow organisations to add AI tutors as team members.

### Database Schema
```sql
-- Add ai_tutor_id to connection_group_members
ALTER TABLE connection_group_members ADD COLUMN ai_tutor_id uuid REFERENCES ai_tutors(id);
ALTER TABLE connection_group_members ADD CONSTRAINT member_type_check
  CHECK ((profile_id IS NOT NULL) OR (ai_tutor_id IS NOT NULL));

-- Organisation can have both human and AI tutors
```

### API Changes
```typescript
// POST /api/organisations/[id]/members/add-ai-tutor
export async function POST(request: NextRequest) {
  const { ai_tutor_id } = await request.json();

  // Add AI tutor to organisation
  await supabase.from('connection_group_members').insert({
    group_id: orgId,
    ai_tutor_id,
    role: 'member',
  });

  return NextResponse.json({ success: true });
}
```

---

## Implementation Order (Priority 2)

### Week 1-2: Core Quality & Skills
1. **Day 1-3:** AI Quality Score system (database, API, UI)
2. **Day 4-5:** Custom Skills (database, API, UI)

### Week 3: Analytics
3. **Day 6-10:** Analytics Dashboard (heatmaps, skill performance, revenue)

### Week 4: Polish & Integrations
4. **Day 11-12:** Material Skill-Tagging
5. **Day 13-15:** Owner Notifications
6. **Day 16-17:** URL Link UI completion
7. **Day 18-22:** Organisation Integration

---

## Success Metrics (Phase 2)

- ✅ 100 AI tutors created
- ✅ 2,000 sessions/month
- ✅ £25/month revenue per AI tutor
- ✅ 20% AI → human conversion rate
- ✅ Quality scores averaging 70+
- ✅ 50% of AI tutors use custom skills
- ✅ 80% of materials have skill tags

---

## Next Steps

**Option A:** Start with AI Quality Score (highest impact on user trust)
**Option B:** Start with URL Link UI (complete existing backend)
**Option C:** Start with Analytics Dashboard (most requested by tutors)
**Option D:** Custom implementation order based on your preference

Which would you like to start with?

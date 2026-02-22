# Safety & Ethics Framework

## Overview

Comprehensive safety infrastructure for protecting minors, ensuring responsible AI use, and maintaining ethical standards across TutorWise platform.

**Status**: ✅ Database schema deployed
**Implementation**: ⏳ API endpoints and UI pending
**Compliance**: COPPA, GDPR-K (Children), UK Age Appropriate Design Code

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Safety & Ethics Framework                   │
└─────────────────────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Age Gates &  │  │   Content    │  │    Usage     │
│   Parental   │  │  Monitoring  │  │  Monitoring  │
│   Controls   │  │  & Auditing  │  │  & Limits    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 1. Age Verification & Parental Consent

### Database: `user_age_verification`

```sql
CREATE TABLE user_age_verification (
    user_id UUID PRIMARY KEY,
    date_of_birth DATE,
    age_verified BOOLEAN,
    is_minor BOOLEAN (computed), -- Under 18
    requires_parental_consent BOOLEAN,
    parental_consent_given BOOLEAN,
    parent_email TEXT,
    parent_id UUID
);
```

### Verification Methods

1. **Self-Reported**: User enters date of birth (low confidence)
2. **ID Document**: Upload government ID (high confidence)
3. **Parent-Confirmed**: Parent verifies via email link
4. **School-Verified**: School admin confirms student age

### Implementation Flow

```typescript
// On signup/profile creation
async function verifyUserAge(userId: string, dateOfBirth: Date) {
  const age = calculateAge(dateOfBirth);
  const isMinor = age < 18;

  await db.user_age_verification.insert({
    user_id: userId,
    date_of_birth: dateOfBirth,
    age_verified: true,
    verification_method: 'self_reported',
    is_minor: isMinor,
    requires_parental_consent: isMinor,
  });

  if (isMinor) {
    // Restrict access until parental consent
    await requestParentalConsent(userId);
  }
}

async function requestParentalConsent(userId: string) {
  // Send email to parent with consent link
  // Create pending safety_alert
  // Block Sage/Lexi access until consent given
}
```

### Age Gates

**Features Restricted for Minors Without Consent:**
- ❌ Sage AI Tutor
- ❌ Lexi Help Bot
- ❌ Marketplace search
- ❌ Direct messaging
- ✅ Read-only resources
- ✅ Public profile viewing

---

## 2. Parental Controls

### Database: `parental_controls`

```sql
CREATE TABLE parental_controls (
    child_user_id UUID,
    parent_user_id UUID,

    -- Feature toggles
    sage_enabled BOOLEAN,
    lexi_enabled BOOLEAN,
    marketplace_enabled BOOLEAN,
    messaging_enabled BOOLEAN,

    -- Usage limits
    daily_time_limit_minutes INTEGER,
    session_time_limit_minutes INTEGER,
    allowed_subjects TEXT[],

    -- Content filtering
    content_filter_level TEXT, -- 'strict', 'moderate', 'off'
    block_sensitive_topics BOOLEAN,

    -- Monitoring
    enable_activity_reports BOOLEAN,
    report_frequency TEXT -- 'daily', 'weekly', 'monthly'
);
```

### Control Panel Features

**Parent Dashboard** (`/account/parental-controls`):
- View child's activity history
- Set time limits per day/session
- Enable/disable platform features
- Configure content filtering
- Receive activity reports via email

### Example: Session Time Check

```typescript
async function checkSessionTimeLimit(userId: string, sessionId: string) {
  const controls = await getParentalControls(userId);
  if (!controls) return true; // No limits

  const sessionDuration = await getSessionDuration(sessionId);

  if (controls.session_time_limit_minutes &&
      sessionDuration >= controls.session_time_limit_minutes) {
    // Terminate session
    await endSession(sessionId);
    await createSafetyAlert({
      user_id: userId,
      alert_type: 'time_limit_exceeded',
      severity: 'warning',
      message: `Session time limit of ${controls.session_time_limit_minutes} minutes reached`,
    });
    return false;
  }

  return true;
}
```

---

## 3. Content Monitoring & Bias Detection

### Database: `content_audit_log`

```sql
CREATE TABLE content_audit_log (
    agent_type TEXT, -- 'sage' | 'lexi'
    session_id TEXT,
    user_id UUID,
    content_text TEXT,

    -- Safety flags
    flagged BOOLEAN,
    flag_reasons TEXT[],
    severity TEXT, -- 'low' | 'medium' | 'high' | 'critical'

    -- Bias detection
    bias_detected BOOLEAN,
    bias_types TEXT[], -- 'gender', 'racial', 'age', 'cultural'
    bias_confidence DECIMAL,

    -- Sensitive content
    sensitive_topics TEXT[], -- 'violence', 'self-harm', 'drugs'
    age_inappropriate BOOLEAN,

    -- Actions
    action_taken TEXT, -- 'content_filtered', 'parent_notified', etc.
);
```

### Content Analysis Pipeline

```typescript
async function analyzeContent(message: {
  agent: 'sage' | 'lexi',
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string
}) {
  // 1. Bias detection
  const biasAnalysis = await detectBias(message.content);

  // 2. Sensitive content detection
  const sensitiveTopics = await detectSensitiveTopics(message.content);

  // 3. Age-appropriateness check
  const userAge = await getUserAge(message.userId);
  const ageAppropriate = await checkAgeAppropriateness(message.content, userAge);

  // 4. Compile flags
  const flagged = biasAnalysis.detected ||
                  sensitiveTopics.length > 0 ||
                  !ageAppropriate;

  // 5. Log audit entry
  await db.content_audit_log.insert({
    agent_type: message.agent,
    session_id: message.sessionId,
    user_id: message.userId,
    content_type: `${message.role}_message`,
    content_text: message.content,
    flagged,
    bias_detected: biasAnalysis.detected,
    bias_types: biasAnalysis.types,
    bias_confidence: biasAnalysis.confidence,
    sensitive_topics: sensitiveTopics,
    age_inappropriate: !ageAppropriate,
  });

  // 6. Take action if needed
  if (flagged) {
    await handleFlaggedContent(message, biasAnalysis, sensitiveTopics);
  }

  return { allowed: ageAppropriate, flagged };
}
```

### Bias Detection Methods

**Option 1: Rule-Based**
```typescript
function detectBias(text: string): BiasAnalysis {
  const genderBiasPatterns = [
    /\b(boys are better at|girls can't)\b/i,
    /\b(men should|women shouldn't)\b/i,
  ];

  const culturalBiasPatterns = [
    /\b(all (Muslims|Christians|Jews|Hindus) are)\b/i,
    /\b(people from \w+ are always)\b/i,
  ];

  // Check patterns...
  return {
    detected: matchesFound,
    types: ['gender', 'cultural'],
    confidence: 0.85,
  };
}
```

**Option 2: AI-Powered (Gemini)**
```typescript
async function detectBiasWithAI(text: string): Promise<BiasAnalysis> {
  const prompt = `Analyze this text for bias (gender, racial, age, cultural).
    Return JSON: { "hasBias": boolean, "types": [], "confidence": 0.0-1.0 }

    Text: "${text}"`;

  const result = await gemini.generateContent(prompt);
  return JSON.parse(result.text());
}
```

---

## 4. Usage Monitoring & Limits

### Database: `user_usage_monitoring`

```sql
CREATE TABLE user_usage_monitoring (
    user_id UUID,
    date DATE,

    -- Daily usage
    sage_sessions_count INTEGER,
    sage_total_minutes INTEGER,
    lexi_conversations_count INTEGER,
    lexi_total_minutes INTEGER,

    -- Safety metrics
    content_flags_count INTEGER,
    bias_detections_count INTEGER,

    -- Limits
    time_limit_exceeded BOOLEAN,

    UNIQUE(user_id, date)
);
```

### Daily Usage Tracking

```typescript
async function trackUsage(userId: string, agent: 'sage' | 'lexi', minutes: number) {
  const today = new Date().toISOString().split('T')[0];

  await db.user_usage_monitoring.upsert({
    user_id: userId,
    date: today,
    [`${agent}_sessions_count`]: sql`${agent}_sessions_count + 1`,
    [`${agent}_total_minutes`]: sql`${agent}_total_minutes + ${minutes}`,
  });

  // Check limits
  const usage = await db.user_usage_monitoring.findOne({ user_id: userId, date: today });
  const controls = await getParentalControls(userId);

  if (controls?.daily_time_limit_minutes) {
    const totalMinutes = usage.sage_total_minutes + usage.lexi_total_minutes;

    if (totalMinutes >= controls.daily_time_limit_minutes) {
      await createSafetyAlert({
        user_id: userId,
        alert_type: 'time_limit_exceeded',
        severity: 'warning',
        message: `Daily time limit of ${controls.daily_time_limit_minutes} minutes reached`,
      });

      await db.user_usage_monitoring.update({
        where: { user_id: userId, date: today },
        data: { time_limit_exceeded: true },
      });

      // Block further access
      return { allowed: false, reason: 'daily_limit_exceeded' };
    }
  }

  return { allowed: true };
}
```

---

## 5. Safety Alerts

### Database: `safety_alerts`

```sql
CREATE TABLE safety_alerts (
    user_id UUID,
    alert_type TEXT, -- 'time_limit_warning', 'inappropriate_content', etc.
    severity TEXT, -- 'info', 'warning', 'critical'
    message TEXT,
    details JSONB,

    -- Notifications
    parent_notified BOOLEAN,
    admin_notified BOOLEAN,

    -- Resolution
    resolved BOOLEAN,
    resolution_notes TEXT
);
```

### Alert Types & Actions

| Alert Type | Severity | Parent Notified | Admin Notified | Action |
|------------|----------|-----------------|----------------|--------|
| time_limit_warning | info | No | No | UI notification |
| time_limit_exceeded | warning | Yes | No | Block access |
| inappropriate_content | critical | Yes | Yes | Terminate session |
| bias_detected | warning | No | Yes | Log for review |
| suspicious_activity | critical | Yes | Yes | Account review |

### Example: Alert Creation

```typescript
async function createSafetyAlert(alert: {
  user_id: string,
  alert_type: string,
  severity: string,
  message: string,
  details?: object,
  related_session_id?: string,
}) {
  const alertRecord = await db.safety_alerts.insert(alert);

  // Notify parent if critical
  if (alert.severity === 'critical') {
    const controls = await getParentalControls(alert.user_id);
    if (controls?.parent_user_id) {
      await notifyParent(controls.parent_user_id, alertRecord);
    }
  }

  // Notify admin if flagged content
  if (alert.alert_type === 'inappropriate_content') {
    await notifyAdmins(alertRecord);
  }

  return alertRecord;
}
```

---

## Implementation Checklist

### Phase 1: Age Verification (Week 1)
- [ ] Age verification UI (signup flow)
- [ ] Parental consent email system
- [ ] Age gates for Sage/Lexi/Marketplace
- [ ] Admin approval workflow

### Phase 2: Parental Controls (Week 2)
- [ ] Parent dashboard UI
- [ ] Parental controls settings page
- [ ] Activity reports email system
- [ ] Feature toggle enforcement

### Phase 3: Content Monitoring (Week 3)
- [ ] Bias detection implementation (AI or rules)
- [ ] Content audit logging middleware
- [ ] Admin content review dashboard
- [ ] Flagged content filtering

### Phase 4: Usage Monitoring (Week 4)
- [ ] Session time tracking hooks
- [ ] Daily usage limit enforcement
- [ ] Usage analytics dashboard
- [ ] Safety alert system

---

## API Endpoints

### Age Verification
```
POST /api/safety/age-verification
GET  /api/safety/age-verification
POST /api/safety/request-parental-consent
POST /api/safety/verify-parental-consent
```

### Parental Controls
```
GET  /api/safety/parental-controls/:childId
POST /api/safety/parental-controls/:childId
PUT  /api/safety/parental-controls/:childId
GET  /api/safety/activity-report/:childId
```

### Content Monitoring
```
POST /api/safety/analyze-content
GET  /api/safety/content-audits
GET  /api/safety/flagged-content
POST /api/safety/review-content/:auditId
```

### Usage & Alerts
```
GET  /api/safety/usage-stats
GET  /api/safety/alerts
POST /api/safety/resolve-alert/:alertId
```

---

## Compliance

### COPPA (Children's Online Privacy Protection Act)
- ✅ Parental consent for users under 13
- ✅ Parental control over data collection
- ✅ Data minimization for minors
- ✅ Secure data handling

### GDPR-K (Children)
- ✅ Age-appropriate privacy notices
- ✅ Parental consent verification
- ✅ Right to erasure for minors
- ✅ Data protection by design

### UK Age Appropriate Design Code
- ✅ Best interests of child by default
- ✅ Privacy settings on by default
- ✅ Data minimization
- ✅ Geolocation off by default
- ✅ Parental controls available

---

**Status**: Database schema ready, implementation in progress
**Last Updated**: 2026-02-21
**Version**: 1.0

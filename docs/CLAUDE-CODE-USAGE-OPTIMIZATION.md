# Claude Code Usage Optimization Guide

**Created:** 2025-10-09
**Purpose:** Strategies to maximize Claude Code session duration and return to 2-hour continuous usage

---

## Understanding the 50-Minute Reduction

### Current Situation
- **Previous:** ~2 hours continuous usage per session
- **Current:** ~50 minutes continuous usage per session
- **Impact:** 60% reduction in continuous coding time, slowing project progress

### Root Cause
The reduction from 2 hours to 50 minutes is likely due to:

1. **Model Selection:** Using Claude Opus 4 (more powerful but faster rate limiting)
2. **Usage Intensity:** Complex tasks with large codebases consume more tokens
3. **Weekly Rate Limits:** New 2025 policy introducing weekly caps on Opus usage
4. **5-Hour Rolling Window:** Usage resets every 5 hours from first message

---

## Solutions to Return to 2-Hour Sessions

### Solution 1: Switch to Sonnet 4 (RECOMMENDED)

**Impact:** Immediate return to 8+ hour sessions

**How:**
- Sonnet 4 has **significantly higher usage limits** than Opus 4
- Max 5x users get 140-280 hours/week of Sonnet vs 15-35 hours/week of Opus
- Sonnet 4.5 (current model) is highly capable for development tasks

**Trade-off:**
- Slightly less powerful reasoning than Opus 4
- Still excellent for coding, refactoring, testing, documentation

**When to use Opus:**
- Complex architectural decisions
- Critical algorithm design
- Security audits

**When to use Sonnet:**
- Feature implementation (90% of our work)
- Bug fixes
- Code reviews
- Test writing
- Documentation

### Solution 2: Session Overlap Technique

**Impact:** Doubles effective continuous usage time

**How It Works:**
1. Usage limits reset **5 hours after your first message**
2. Start a "dummy session" 3 hours before your planned work
3. Send minimal prompt (e.g., "Hi" or "Ready to work")
4. When main session hits limit (~50 min), next session is ready

**Example Timeline:**
```
9:00 AM  - Send dummy prompt "Ready to work"
          (5-hour window starts)
12:00 PM - Begin main coding session
12:50 PM - Hit usage limit on first session
12:50 PM - Second session instantly available
          (dummy session window expired at 2:00 PM)
1:40 PM  - Hit limit on second session
          Total: ~100 minutes continuous work
```

**Automation:**
```bash
# Create alias in ~/.zshrc or ~/.bashrc
alias claude-prep='echo "Starting Claude Code session prep at $(date)"'

# Set reminder 3 hours before planned work
# Use this to send minimal prompt to start 5-hour window early
```

**Caution:**
- Only use when certain you need extended time
- Session window runs regardless of use
- Best for scheduled deep work sessions

### Solution 3: Upgrade to Max 20x Plan

**Impact:** 4x more usage (200-800 prompts per 5 hours)

**Cost:** $200/month (vs $100/month for Max 5x)

**Benefits:**
- ~900 messages every 5 hours
- Significantly longer continuous sessions
- Better for power users / full-time development

**ROI Calculation:**
- Current: ~50 min sessions = need 12 sessions for 10 hours work
- Max 20x: ~3-4 hours per session = need 3 sessions for 10 hours work
- Time saved: 75% reduction in session interruptions

### Solution 4: Optimize Token Usage

**Impact:** 20-40% longer sessions with same limits

**Techniques:**

#### A. Reduce Context Size
```bash
# Before starting sessions, limit file reads to essential files only
# Don't read entire directories speculatively
# Use Grep/Glob first to find exact files needed
```

#### B. Consolidate Requests
```bash
# INEFFICIENT (3 separate requests):
- "Read file A"
- "Read file B"
- "Now implement feature X"

# EFFICIENT (1 consolidated request):
- "Read files A and B, then implement feature X"
```

#### C. Use Summaries for Context
```bash
# Instead of re-reading large files each session:
# Create and maintain summary documents
# Reference summaries in .claude/ai-context-summary.md
```

#### D. Limit File Attachments
```bash
# Each attached file consumes tokens
# Only attach files that are directly relevant
# Use file references in text instead when possible
```

#### E. Break Large Tasks Into Sessions
```bash
# INEFFICIENT (hits limit mid-task):
- "Implement entire authentication system"

# EFFICIENT (planned session breaks):
Session 1: "Implement auth API endpoints"
Session 2: "Implement auth UI components"
Session 3: "Write auth tests"
```

---

## Recommended Strategy for TutorWise Project

### Primary Solution: Hybrid Model Approach

**Week 2-4 Development (Current):**
- **Use Sonnet 4.5** for 90% of work
  - Feature implementation
  - Bug fixes
  - Test writing
  - Code reviews

- **Switch to Opus 4** for 10% of work
  - Architecture decisions
  - Security reviews
  - Complex algorithm design
  - Critical production issues

### Secondary Solution: Session Overlap for Deep Work

**When to use:**
- Week planning sessions (multi-hour blocks)
- Complex feature implementation requiring >1 hour
- Bug investigation requiring extensive debugging

**Implementation:**
1. Identify deep work blocks in calendar (e.g., 2-4 PM daily)
2. Set reminder for 3 hours prior (11 AM)
3. Send dummy prompt to start 5-hour window
4. Begin main work at scheduled time
5. Gain ~100 minutes continuous work vs 50 minutes

### Tertiary Solution: Token Optimization

**Apply consistently:**
- Maintain updated `.claude/ai-context-summary.md`
- Use consolidated requests
- Limit speculative file reads
- Break large tasks into session-sized chunks

---

## Expected Results

### Switching to Sonnet 4.5
- **Immediate:** 8+ hour continuous sessions
- **No cost increase**
- **Minimal quality trade-off** for development work

### Adding Session Overlap
- **Immediate:** 100-minute sessions (vs 50 minutes)
- **No cost increase**
- **Requires planning** 3 hours ahead

### Upgrading to Max 20x
- **Immediate:** 3-4 hour continuous sessions
- **Cost:** +$100/month
- **Best for full-time development**

### Token Optimization
- **Gradual:** 20-40% improvement over 1-2 weeks
- **No cost increase**
- **Requires discipline and planning**

---

## Action Plan

### Immediate (Today)
1. ✅ **Switch to Sonnet 4.5** for all non-critical work
2. ✅ **Test session duration** with Sonnet on typical tasks
3. ✅ **Document results** after 2-3 sessions

### Short-term (This Week)
1. **Implement session overlap** for scheduled deep work blocks
2. **Create reminder system** for dummy session prompts
3. **Measure effective continuous time** achieved

### Long-term (Next 2 Weeks)
1. **Optimize token usage patterns** with consolidated requests
2. **Maintain context summaries** in `.claude/`
3. **Evaluate Max 20x upgrade** based on ROI analysis

---

## Monitoring Success

### Metrics to Track
- **Session duration before hitting limits**
- **Number of sessions needed per day**
- **Interruptions during deep work**
- **Overall development velocity**

### Success Criteria
- ✅ Return to 2+ hour continuous sessions
- ✅ Reduce session interruptions by 75%
- ✅ Maintain current development quality
- ✅ Complete Week 4-6 features on schedule

---

## References

- [Claude Code Usage Limits (Official)](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Session Overlap Technique](https://www.nathanonn.com/how-to-double-your-claude-code-usage-limits-without-upgrading-to-max/)
- [Claude Max Plan Usage Policies](https://support.claude.com/en/articles/11014257-about-claude-s-max-plan-usage)

# Students Feature - Solution Design

**Version**: v1.0
**Date**: 2025-12-12

## Overview

Tutor-facing student relationship management system for tracking active students, session history, and learning progress.

## Core Architecture

1. **Student Identification**: Query bookings table for unique student_ids where tutor_id = current_user
2. **Session Aggregation**: Count completed sessions per student
3. **Recent Activity**: Sort by last session date
4. **Detail View**: Student profile + booking history
5. **Communication**: Quick message links

## Database Queries

```sql
-- Get all students for tutor
SELECT DISTINCT
  p.id,
  p.full_name,
  p.avatar_url,
  COUNT(b.id) as session_count,
  MAX(b.session_start_time) as last_session
FROM bookings b
JOIN profiles p ON b.student_id = p.id
WHERE b.tutor_id = current_user_id
GROUP BY p.id, p.full_name, p.avatar_url
ORDER BY last_session DESC;
```

---

**Last Updated**: 2025-12-12

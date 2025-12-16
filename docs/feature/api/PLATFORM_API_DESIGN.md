# TutorWise Platform API Design

**Version**: 2.0
**Date**: 2025-12-16
**Base URL**: `https://tutorwise.com/api/v1`
**Status**: Draft → Implementation

---

## Overview

The TutorWise Platform API provides programmatic access to platform data beyond just referrals. This enables external apps, analytics tools, and AI agents to access:

- **CaaS Scores**: Credibility as a Service scores for users
- **Profile Data**: Public profile information
- **Booking Data**: User's booking history and status
- **Analytics**: Platform statistics and insights

---

## API Scopes (Permissions)

New scopes to add alongside existing referral scopes:

| Scope | Description |
|-------|-------------|
| `caas:read` | Read CaaS scores and breakdowns |
| `profiles:read` | Read public profile data |
| `bookings:read` | Read authenticated user's bookings |
| `analytics:read` | Read platform analytics (future) |

**Existing Scopes** (from Migration 124):
- `referrals:read` - View referral statistics
- `referrals:write` - Create referrals, send invitations
- `tutors:search` - Search tutors with referral attribution

---

## Endpoints

### 1. GET /api/v1/caas/:profile_id

Get CaaS (Credibility as a Service) score for a user.

#### Authentication
- **Required**: Yes (API key)
- **Scope**: `caas:read`

#### Request
```http
GET /api/v1/caas/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer tutorwise_sk_xxx...
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `role_type` | string | TUTOR | Role to get score for: TUTOR, CLIENT, AGENT, STUDENT |
| `include_breakdown` | boolean | true | Include detailed score breakdown |

#### Response (200 OK)
```json
{
  "success": true,
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "role_type": "TUTOR",
  "score": {
    "total": 85,
    "breakdown": {
      "performance": 28,
      "qualifications": 30,
      "network": 15,
      "safety": 10,
      "digital": 2
    },
    "percentile": 92.5,
    "rank": "Excellent"
  },
  "metadata": {
    "calculated_at": "2025-12-16T10:30:00Z",
    "calculation_version": "tutor-v5.5",
    "last_updated": "2025-12-16T10:30:00Z"
  }
}
```

#### Response with Detailed Stats (include_breakdown=true)
```json
{
  "success": true,
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "role_type": "TUTOR",
  "score": {
    "total": 85,
    "breakdown": {
      "performance": 28,
      "qualifications": 30,
      "network": 15,
      "safety": 10,
      "digital": 2
    },
    "percentile": 92.5,
    "rank": "Excellent"
  },
  "detailed_stats": {
    "performance": {
      "avg_rating": 4.8,
      "completed_sessions": 120,
      "retention_rate": 0.75,
      "manual_session_log_rate": 0.90
    },
    "network": {
      "referral_count": 12,
      "connection_count": 45,
      "is_agent_referred": true
    },
    "digital": {
      "google_calendar_synced": true,
      "google_classroom_synced": false,
      "lessonspace_usage_rate": 0.60
    }
  },
  "metadata": {
    "calculated_at": "2025-12-16T10:30:00Z",
    "calculation_version": "tutor-v5.5",
    "last_updated": "2025-12-16T10:30:00Z"
  }
}
```

#### Error Responses

**404 Not Found** - Profile or score not found
```json
{
  "error": "score_not_found",
  "message": "No CaaS score found for this profile and role type",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "role_type": "TUTOR"
}
```

---

### 2. GET /api/v1/profiles/:id

Get public profile information for a user.

#### Authentication
- **Required**: Yes (API key)
- **Scope**: `profiles:read`

#### Request
```http
GET /api/v1/profiles/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer tutorwise_sk_xxx...
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_listings` | boolean | false | Include user's listings |
| `include_caas_score` | boolean | true | Include CaaS score |
| `include_stats` | boolean | false | Include performance stats |

#### Response (200 OK)
```json
{
  "success": true,
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Dr. Sarah Johnson",
    "avatar_url": "https://cdn.tutorwise.com/avatars/sarah.jpg",
    "bio": "Experienced biology tutor with 10+ years teaching...",
    "location": "London, UK",
    "roles": ["tutor", "agent"],
    "referral_code": "ABC123G",
    "caas_score": 85,
    "created_at": "2024-01-15T10:00:00Z",
    "profile_url": "https://tutorwise.com/public-profile/550e8400..."
  }
}
```

#### Response with Listings (include_listings=true)
```json
{
  "success": true,
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Dr. Sarah Johnson",
    "avatar_url": "https://cdn.tutorwise.com/avatars/sarah.jpg",
    "bio": "Experienced biology tutor with 10+ years teaching...",
    "location": "London, UK",
    "roles": ["tutor", "agent"],
    "referral_code": "ABC123G",
    "caas_score": 85,
    "listings": [
      {
        "id": "listing-1",
        "title": "GCSE Biology Tutoring",
        "subjects": ["Biology"],
        "level": "GCSE",
        "price_per_hour": 45.00,
        "currency": "GBP",
        "is_active": true
      },
      {
        "id": "listing-2",
        "title": "A-Level Chemistry",
        "subjects": ["Chemistry"],
        "level": "A-Level",
        "price_per_hour": 55.00,
        "currency": "GBP",
        "is_active": true
      }
    ],
    "created_at": "2024-01-15T10:00:00Z",
    "profile_url": "https://tutorwise.com/public-profile/550e8400..."
  }
}
```

#### Error Responses

**404 Not Found** - Profile doesn't exist
```json
{
  "error": "profile_not_found",
  "message": "Profile not found",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 3. GET /api/v1/bookings

Get authenticated user's bookings.

#### Authentication
- **Required**: Yes (API key)
- **Scope**: `bookings:read`

#### Request
```http
GET /api/v1/bookings?status=completed&days=30&limit=50
Authorization: Bearer tutorwise_sk_xxx...
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status: scheduled, completed, cancelled, pending_log |
| `days` | integer | 90 | Last N days of bookings |
| `limit` | integer | 50 | Results limit (max: 100) |
| `offset` | integer | 0 | Pagination offset |
| `role` | string | - | Filter by role: tutor (my students), client (my tutors) |

#### Response (200 OK)
```json
{
  "success": true,
  "bookings": [
    {
      "id": "booking-1",
      "listing_id": "listing-1",
      "listing_title": "GCSE Biology Tutoring",
      "tutor": {
        "id": "tutor-id",
        "full_name": "Dr. Sarah Johnson",
        "avatar_url": "https://cdn.tutorwise.com/avatars/sarah.jpg"
      },
      "client": {
        "id": "client-id",
        "full_name": "John Smith",
        "avatar_url": "https://cdn.tutorwise.com/avatars/john.jpg"
      },
      "status": "completed",
      "start_time": "2025-12-10T14:00:00Z",
      "end_time": "2025-12-10T15:00:00Z",
      "duration_hours": 1.0,
      "price": 45.00,
      "currency": "GBP",
      "recording_url": "https://lessonspace.com/recording/abc123",
      "created_at": "2025-12-01T10:00:00Z",
      "completed_at": "2025-12-10T15:05:00Z"
    }
  ],
  "pagination": {
    "total": 125,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "filters": {
    "status": "completed",
    "days": 30,
    "role": null
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid parameters
```json
{
  "error": "invalid_parameter",
  "message": "limit must be between 1 and 100",
  "parameter": "limit",
  "value": 500
}
```

---

## Use Cases

### Use Case 1: CaaS Score Lookup for External Apps

**Scenario**: A third-party tutoring marketplace wants to verify tutor credibility before listing them.

```bash
curl -X GET "https://tutorwise.com/api/v1/caas/550e8400-e29b-41d4-a716-446655440000?role_type=TUTOR&include_breakdown=true" \
  -H "Authorization: Bearer tutorwise_sk_xxx..."
```

**Result**: Get comprehensive credibility score with breakdown showing performance, qualifications, network, safety, and digital professionalism.

---

### Use Case 2: Profile Integration for Partner Platforms

**Scenario**: An education platform wants to display TutorWise tutor profiles on their site.

```bash
curl -X GET "https://tutorwise.com/api/v1/profiles/550e8400-e29b-41d4-a716-446655440000?include_listings=true&include_caas_score=true" \
  -H "Authorization: Bearer tutorwise_sk_xxx..."
```

**Result**: Get full profile with listings and credibility score for display.

---

### Use Case 3: Booking Analytics for AI Agents

**Scenario**: An AI assistant helps users track their tutoring sessions and spending.

```bash
curl -X GET "https://tutorwise.com/api/v1/bookings?status=completed&days=30&role=client" \
  -H "Authorization: Bearer tutorwise_sk_xxx..."
```

**Result**: Get all completed bookings for the last 30 days to calculate total spending, session count, etc.

---

## Security Considerations

### 1. Data Privacy
- CaaS scores are public for tutors (marketplace ranking)
- Client CaaS scores may be restricted (future consideration)
- Bookings endpoint only returns authenticated user's own bookings
- Profile data respects RLS policies

### 2. Rate Limiting
- Same limits as referral endpoints: 60/min, 10k/day
- Consider separate limits for high-volume CaaS lookups
- Implement caching for frequently accessed profiles

### 3. Scope Validation
- Each endpoint requires specific scope
- API keys can have granular permissions
- Users can revoke keys at any time

---

## Migration 125: Platform API Scopes

```sql
-- Add new scopes to default scopes array
UPDATE public.api_keys
SET scopes = array_cat(scopes, ARRAY['caas:read', 'profiles:read', 'bookings:read'])
WHERE 'referrals:read' = ANY(scopes);

-- Update generate_api_key function default scopes
ALTER FUNCTION public.generate_api_key(...)
...
```

(Full migration to be created in next step)

---

## Next Steps

1. ✅ Design API endpoints (this document)
2. ⏳ Create Migration 125 for new scopes
3. ⏳ Implement GET /api/v1/caas/:profile_id
4. ⏳ Implement GET /api/v1/profiles/:id
5. ⏳ Implement GET /api/v1/bookings
6. ⏳ Update AI_AGENT_API_GUIDE.md
7. ⏳ Test and deploy

---

**Last Updated**: 2025-12-16
**Related Migrations**: 124 (API Infrastructure)
**Related Docs**: AI_AGENT_API_GUIDE.md

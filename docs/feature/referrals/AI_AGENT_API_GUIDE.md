# TutorWise Platform API Guide

**Version**: 2.0
**Date**: 2025-12-16
**Base URL**: `https://tutorwise.com/api/v1`
**Authentication**: API Key (Bearer token)

---

## Overview

The TutorWise Platform API enables programmatic access to platform data for AI assistants, external apps, analytics tools, and automation systems. This allows integration with:

- **Referrals**: Create referrals, track performance, search tutors
- **CaaS Scores**: Access credibility scores and breakdowns
- **Profiles**: Get public profile data and listings
- **Bookings**: Access user's booking history and status

This API serves AI agents (ChatGPT, Claude), third-party marketplaces, analytics dashboards, and partner platforms.

---

## Authentication

### API Key Format

```
tutorwise_sk_<64 hex characters>
```

**Example**: `tutorwise_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### How to Get an API Key

1. Log in to your TutorWise account
2. Navigate to **Account → API Keys**
3. Click **"Generate New API Key"**
4. Give your key a name (e.g., "ChatGPT Integration")
5. Select scopes (permissions)
6. **Copy the key immediately** - it won't be shown again!

### Using the API Key

Include the API key in the `Authorization` header:

```http
Authorization: Bearer tutorwise_sk_xxx...
```

**Example with curl**:
```bash
curl -X POST https://tutorwise.com/api/v1/referrals/create \
  -H "Authorization: Bearer tutorwise_sk_xxx..." \
  -H "Content-Type: application/json" \
  -d '{"referred_email": "jane@example.com"}'
```

---

## Scopes (Permissions)

API keys can have the following scopes:

| Scope | Description |
|-------|-------------|
| `referrals:read` | View referral statistics |
| `referrals:write` | Create referrals, send invitations |
| `tutors:search` | Search tutors with referral attribution |
| `caas:read` | Read CaaS scores and breakdowns |
| `profiles:read` | Read public profile data |
| `bookings:read` | Read authenticated user's bookings |

**Recommended for AI agents**: All scopes

**Recommended for partner platforms**: `caas:read`, `profiles:read`, `tutors:search`

**Recommended for analytics tools**: `caas:read`, `bookings:read`, `referrals:read`

---

## Endpoints

### 1. Create Referral

**POST** `/api/v1/referrals/create`

Create a referral for a potential tutor or client.

#### Request

```http
POST /api/v1/referrals/create
Authorization: Bearer tutorwise_sk_xxx...
Content-Type: application/json

{
  "referred_email": "jane.smith@example.com",
  "referred_name": "Jane Smith",
  "context": "ChatGPT referral from conversation abc123",
  "send_email": true
}
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `referred_email` | string | Yes | Email address of person being referred |
| `referred_name` | string | No | Full name of person being referred |
| `context` | string | No | AI agent context (e.g., conversation ID) |
| `send_email` | boolean | No | Send invitation email (default: true) |
| `referrer_code` | string | No | Override default referral code |

#### Response (201 Created)

```json
{
  "success": true,
  "referral": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "referred_email": "jane.smith@example.com",
    "referred_name": "Jane Smith",
    "status": "Referred",
    "referral_link": "https://tutorwise.com/a/ABC123G",
    "created_at": "2025-12-16T10:30:00Z"
  },
  "message": "Referral created successfully"
}
```

#### Error Responses

**400 Bad Request** - Invalid input
```json
{
  "error": "invalid_email",
  "message": "referred_email must be a valid email address"
}
```

**409 Conflict** - Referral already exists
```json
{
  "error": "referral_exists",
  "message": "A referral for this email already exists",
  "referral": {
    "id": "...",
    "status": "Signed Up"
  }
}
```

---

### 2. Get Referral Stats

**GET** `/api/v1/referrals/stats`

Get referral performance statistics for the authenticated user.

#### Request

```http
GET /api/v1/referrals/stats?days=30&status=Converted
Authorization: Bearer tutorwise_sk_xxx...
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | 30 | Last N days of data |
| `status` | string | - | Filter by status: "Referred", "Signed Up", "Converted" |

#### Response (200 OK)

```json
{
  "success": true,
  "stats": {
    "total_referrals": 45,
    "by_status": {
      "referred": 20,
      "signed_up": 15,
      "converted": 10
    },
    "by_attribution_method": {
      "url_parameter": 25,
      "cookie": 15,
      "manual_entry": 5
    },
    "by_source": {
      "ai_agent": 12,
      "qr": 8,
      "link": 25
    },
    "conversion_rate": 66.67,
    "commissions": {
      "total_earned": 1250.00,
      "pending": 350.00,
      "currency": "GBP"
    }
  },
  "referral_code": "ABC123G",
  "referral_link": "https://tutorwise.com/a/ABC123G",
  "period": {
    "days": 30,
    "start_date": "2025-11-16T00:00:00Z",
    "end_date": "2025-12-16T10:30:00Z"
  }
}
```

---

### 3. Search Tutors

**POST** `/api/v1/tutors/search`

Search for tutors with automatic referral link attribution.

#### Request

```http
POST /api/v1/tutors/search
Authorization: Bearer tutorwise_sk_xxx...
Content-Type: application/json

{
  "query": "biology tutor",
  "subject": "biology",
  "level": "gcse",
  "location": "London, UK",
  "max_price": 50,
  "limit": 10,
  "include_referral_links": true
}
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | No | Free-text search query |
| `subject` | string | No | Subject filter (e.g., "mathematics") |
| `level` | string | No | Level filter (e.g., "gcse", "a-level") |
| `location` | string | No | Location filter |
| `max_price` | number | No | Maximum price per hour |
| `min_rating` | number | No | Minimum rating (0-5) |
| `limit` | integer | No | Results limit (default: 10, max: 50) |
| `include_referral_links` | boolean | No | Include attributed links (default: true) |

#### Response (200 OK)

```json
{
  "success": true,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Dr. Sarah Johnson",
      "avatar": "https://cdn.tutorwise.com/avatars/sarah.jpg",
      "bio": "Experienced biology tutor with 10+ years...",
      "location": "London, UK",
      "subjects": ["Biology", "Chemistry"],
      "level": "GCSE, A-Level",
      "price_per_hour": 45.00,
      "currency": "GBP",
      "profile_url": "https://tutorwise.com/public-profile/550e8400...",
      "referral_link": "https://tutorwise.com/a/ABC123G?redirect=https%3A%2F%2Ftutorwise.com%2Fpublic-profile%2F550e8400...",
      "referral_code": "ABC123G"
    }
  ],
  "count": 1,
  "query": {
    "subject": "biology",
    "level": "gcse",
    "location": "London, UK",
    "max_price": 50
  },
  "referral_attribution": {
    "code": "ABC123G",
    "message": "All links include automatic referral attribution. Share these links to earn commission."
  }
}
```

---

### 4. Get CaaS Score

**GET** `/api/v1/caas/:profile_id`

Get CaaS (Credibility as a Service) score for a user.

#### Request

```http
GET /api/v1/caas/550e8400-e29b-41d4-a716-446655440000?role_type=TUTOR&include_breakdown=true
Authorization: Bearer tutorwise_sk_xxx...
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `role_type` | string | TUTOR | Role to get score for: TUTOR, CLIENT, AGENT, STUDENT |
| `include_breakdown` | boolean | true | Include detailed stats (performance, network, digital) |

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

**404 Not Found** - Score not found
```json
{
  "error": "score_not_found",
  "message": "No CaaS score found for this profile and role type",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "role_type": "TUTOR"
}
```

---

### 5. Get Profile

**GET** `/api/v1/profiles/:id`

Get public profile information for a user.

#### Request

```http
GET /api/v1/profiles/550e8400-e29b-41d4-a716-446655440000?include_listings=true&include_caas_score=true
Authorization: Bearer tutorwise_sk_xxx...
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_listings` | boolean | false | Include user's active listings |
| `include_caas_score` | boolean | true | Include CaaS credibility score |
| `include_stats` | boolean | false | Include performance stats (tutors only) |

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
    "listings": [
      {
        "id": "listing-1",
        "title": "GCSE Biology Tutoring",
        "subjects": ["Biology"],
        "level": "GCSE",
        "price_per_hour": 45.00,
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

**404 Not Found** - Profile not found
```json
{
  "error": "profile_not_found",
  "message": "Profile not found",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 6. Get Bookings

**GET** `/api/v1/bookings`

Get authenticated user's bookings (as tutor or client).

#### Request

```http
GET /api/v1/bookings?status=completed&days=30&limit=50&role=client
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
      "user_role": "client",
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
    "has_more": true,
    "returned": 1
  },
  "filters": {
    "status": "completed",
    "days": 30,
    "role": "client"
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

## Rate Limiting

**Default Limits**:
- 60 requests per minute
- 10,000 requests per day

**Headers**:
```http
X-RateLimit-Limit: 60
X-RateLimit-Reset: 42
```

**429 Too Many Requests**:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again in 42 seconds.",
  "limit": 60,
  "reset_in": 42
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `missing_authorization` | 401 | No Authorization header |
| `invalid_authorization_format` | 401 | Invalid Bearer token format |
| `invalid_api_key` | 401 | API key invalid or expired |
| `insufficient_permissions` | 403 | Missing required scope |
| `rate_limit_exceeded` | 429 | Too many requests |
| `invalid_json` | 400 | Request body not valid JSON |
| `missing_field` | 400 | Required field missing |
| `invalid_email` | 400 | Invalid email format |
| `invalid_profile_id` | 400 | Profile ID not valid UUID |
| `invalid_parameter` | 400 | Query parameter invalid |
| `referral_exists` | 409 | Referral already created |
| `profile_not_found` | 404 | Profile does not exist |
| `score_not_found` | 404 | CaaS score not found |
| `query_failed` | 500 | Database query failed |
| `internal_error` | 500 | Server error |

---

## AI Agent Examples

### ChatGPT Custom GPT

```yaml
openapi: 3.0.0
info:
  title: TutorWise Referrals API
  version: 1.0.0
servers:
  - url: https://tutorwise.com/api/v1
paths:
  /referrals/create:
    post:
      operationId: createReferral
      summary: Create a referral
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                referred_email:
                  type: string
                referred_name:
                  type: string
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
```

**Usage in ChatGPT**:
> "Refer my friend jane@example.com to TutorWise as a tutor"

ChatGPT will call the API and return the referral link.

### Claude Desktop (Function Calling)

```typescript
const tools = [
  {
    name: "create_tutorwise_referral",
    description: "Create a TutorWise referral and get the referral link",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address" },
        name: { type: "string", description: "Full name" },
      },
      required: ["email"],
    },
  },
];

// Usage
const result = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  tools,
  messages: [
    {
      role: "user",
      content: "Refer jane@example.com to TutorWise",
    },
  ],
});
```

### Python SDK (Custom AI Agent)

```python
import requests

class TutorWiseAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://tutorwise.com/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def create_referral(self, email: str, name: str = None):
        """Create a referral"""
        response = requests.post(
            f"{self.base_url}/referrals/create",
            headers=self.headers,
            json={"referred_email": email, "referred_name": name}
        )
        return response.json()

    def get_stats(self, days: int = 30):
        """Get referral statistics"""
        response = requests.get(
            f"{self.base_url}/referrals/stats?days={days}",
            headers=self.headers
        )
        return response.json()

    def search_tutors(self, query: str, **filters):
        """Search tutors with referral attribution"""
        response = requests.post(
            f"{self.base_url}/tutors/search",
            headers=self.headers,
            json={"query": query, **filters}
        )
        return response.json()

# Usage
api = TutorWiseAPI("tutorwise_sk_xxx...")
result = api.create_referral("jane@example.com", "Jane Smith")
print(f"Referral link: {result['referral']['referral_link']}")
```

---

## Security Best Practices

1. **Never expose API keys in client-side code**
   - Store keys in environment variables
   - Use server-side API calls only

2. **Rotate keys regularly**
   - Revoke old keys when no longer needed
   - Generate new keys every 90 days

3. **Use minimum required scopes**
   - Only request permissions you need
   - Separate keys for different use cases

4. **Monitor usage**
   - Check API key usage dashboard regularly
   - Set up alerts for unusual activity

5. **Revoke immediately if compromised**
   - Revoke keys from Account → API Keys
   - Generate new replacement key

---

## Support

**Questions?**
- Email: api@tutorwise.com
- Documentation: https://docs.tutorwise.com/api
- Status Page: https://status.tutorwise.com

**Bug Reports**:
- GitHub: https://github.com/tutorwiseapp/tutorwise/issues
- Label: `api`

---

**Last Updated**: 2025-12-16
**API Version**: v2.0 (Platform API)
**Migrations**:
- 124 (API Infrastructure + Referrals)
- 125 (Platform API Scopes: CaaS, Profiles, Bookings)

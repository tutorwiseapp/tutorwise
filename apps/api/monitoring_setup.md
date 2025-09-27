# Production Monitoring Setup Guide

## 1. Health Check Monitoring

### Railway Built-in Monitoring
Railway automatically monitors your health endpoint. Configure it in your Railway dashboard:

```
Health Check Path: /health
Port: 8000
Interval: 30 seconds
Timeout: 10 seconds
```

### External Monitoring Services

**Option A: Uptime Robot (Free)**
```bash
# Add these endpoints to monitor:
- https://tutorwise-production.up.railway.app/health
- https://tutorwise-production.up.railway.app/

# Alert conditions:
- Response time > 5 seconds
- Status code != 200
- Response contains "error" or "degraded"
```

**Option B: Pingdom/DataDog**
- More advanced monitoring with detailed metrics
- Custom dashboards and alerting rules

## 2. Application Logging

### Current Logging Setup
The app already includes structured logging:

```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Usage in code:
logger.info("Database connection successful")
logger.warning("Redis connection attempt failed")
logger.error("Critical system error")
```

### Log Aggregation Options

**Railway Logs (Built-in)**
```bash
# View logs in Railway dashboard
# Export logs via CLI:
railway logs --environment production
```

**External Log Services**
- **Papertrail**: Simple log aggregation
- **Loggly**: Advanced search and alerts
- **DataDog Logs**: Enterprise solution

## 3. Metrics Collection

### Basic Metrics Setup

Add this to `app/main.py`:

```python
import time
from fastapi import Request, Response
import logging

# Add middleware for request metrics
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    process_time = time.time() - start_time
    logger.info(
        f"Request: {request.method} {request.url.path} "
        f"Status: {response.status_code} "
        f"Duration: {process_time:.3f}s"
    )

    return response
```

### Metrics to Track

**System Metrics**:
- Response times (p50, p95, p99)
- Request rates (requests/second)
- Error rates (4xx, 5xx)
- Database connection health

**Business Metrics**:
- User registrations
- Lesson bookings
- Payment transactions
- API usage by endpoint

## 4. Alerting Setup

### Health Check Alerts

**Critical Alerts** (Immediate notification):
```yaml
Conditions:
  - Health endpoint down for > 2 minutes
  - Database connections failed
  - Error rate > 5% for > 5 minutes
  - Response time > 10 seconds

Notification Methods:
  - Email
  - Slack/Discord webhook
  - SMS (for critical issues)
```

**Warning Alerts** (Non-urgent):
```yaml
Conditions:
  - Response time > 2 seconds for > 10 minutes
  - Redis/Neo4j in degraded state
  - Memory usage > 80%
  - Disk usage > 85%
```

### Sample Slack Webhook

```python
# Add to your monitoring service:
import requests

def send_slack_alert(message, status="warning"):
    webhook_url = "YOUR_SLACK_WEBHOOK_URL"

    payload = {
        "text": f"🚨 Tutorwise Backend Alert",
        "attachments": [{
            "color": "danger" if status == "critical" else "warning",
            "fields": [{
                "title": "Status",
                "value": message,
                "short": True
            }, {
                "title": "Time",
                "value": time.strftime("%Y-%m-%d %H:%M:%S"),
                "short": True
            }]
        }]
    }

    requests.post(webhook_url, json=payload)
```

## 5. Performance Monitoring

### Database Query Monitoring

Add query timing to your database operations:

```python
import time
from functools import wraps

def monitor_query(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start
            logger.info(f"Query {func.__name__} completed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = time.time() - start
            logger.error(f"Query {func.__name__} failed after {duration:.3f}s: {e}")
            raise
    return wrapper

# Usage:
@monitor_query
async def get_user_data(user_id):
    # Your database query here
    pass
```

## 6. Dashboard Setup

### Simple Dashboard (Grafana)

**Key Metrics to Display**:
- Request rate over time
- Response time percentiles
- Error rate
- Database connection status
- Active users/sessions

### Railway Dashboard

**Built-in Metrics**:
- CPU usage
- Memory usage
- Request volume
- Response times

## 7. Implementation Steps

### Step 1: Enable Health Check Monitoring
1. Configure Railway health check settings
2. Set up external uptime monitoring (Uptime Robot)

### Step 2: Add Request Logging
1. Add the middleware code to `app/main.py`
2. Deploy and verify logs are working

### Step 3: Set Up Alerts
1. Configure webhook for Slack/Discord
2. Set up email alerts for critical issues

### Step 4: Monitor and Iterate
1. Watch for patterns in logs and metrics
2. Adjust alert thresholds based on actual usage
3. Add more specific monitoring as needed

## Sample Alert Configuration

```json
{
  "health_check": {
    "url": "https://tutorwise-production.up.railway.app/health",
    "interval": 30,
    "timeout": 10,
    "alerts": {
      "critical": {
        "condition": "status != 200 OR response.status != 'ok'",
        "notification": ["email", "slack"]
      },
      "warning": {
        "condition": "response.status == 'degraded'",
        "notification": ["slack"]
      }
    }
  }
}
```

Would you like me to implement any specific part of this monitoring setup?
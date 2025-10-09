# Neo4j Database Setup & Configuration Guide

## Overview

This guide explains Neo4j graph database setup, authentication, connection management, and best practices for TutorWise's knowledge graph and relationship data.

## What is Neo4j?

Neo4j is a graph database designed for storing and querying highly connected data using:
- **Nodes**: Entities (Users, Courses, Topics, etc.)
- **Relationships**: Connections between nodes (ENROLLED_IN, TEACHES, PREREQUISITE_OF, etc.)
- **Properties**: Key-value data on nodes and relationships
- **Cypher Query Language**: SQL-like language for graph queries

## Installation Methods

### Method 1: Docker (Recommended for Development)

**Pros:**
- ✅ Quick setup
- ✅ Isolated environment
- ✅ Easy to reset/rebuild
- ✅ Version control

**Setup:**
```bash
# Using docker-compose (included in project)
docker-compose up neo4j -d

# Or standalone Docker
docker run \
  --name neo4j-tutorwise \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  -v $HOME/neo4j/data:/data \
  neo4j:5.15
```

### Method 2: Neo4j Desktop (GUI Tool)

**Pros:**
- ✅ Visual interface
- ✅ Built-in Browser
- ✅ Easy database management
- ✅ Plugin ecosystem

**Setup:**
1. Download from https://neo4j.com/download/
2. Install and launch
3. Create new project: "TutorWise"
4. Create DBMS with password
5. Start the database

### Method 3: Neo4j Aura (Cloud - Production)

**Pros:**
- ✅ Fully managed
- ✅ Auto-scaling
- ✅ Built-in backups
- ✅ High availability

**Setup:**
1. Go to https://console.neo4j.io/
2. Create free account
3. Create new instance
4. Choose region (closest to users)
5. Download credentials (connection URI + password)
6. Add to `.env.local`

### Method 4: Local Installation (macOS/Linux)

**macOS:**
```bash
# Using Homebrew
brew install neo4j

# Start Neo4j
neo4j start

# Access at http://localhost:7474
```

**Linux:**
```bash
# Using apt (Ubuntu/Debian)
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt-get update
sudo apt-get install neo4j

# Start service
sudo systemctl start neo4j
```

## Authentication & Connection

### Connection URI Formats

```bash
# Local development (Docker/Desktop)
NEO4J_URI=bolt://localhost:7687
NEO4J_URI=neo4j://localhost:7687

# Neo4j Aura (Cloud)
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_URI=bolt+s://xxxxx.databases.neo4j.io

# Cluster/Enterprise
NEO4J_URI=neo4j+ssc://xxxxx.databases.neo4j.io
```

### Protocol Types

| Protocol | Encryption | Use Case |
|----------|-----------|----------|
| `bolt://` | None | Local dev only |
| `bolt+s://` | TLS/SSL | Production (direct) |
| `neo4j://` | None | Local dev (routing) |
| `neo4j+s://` | TLS/SSL | Production (routing) |
| `neo4j+ssc://` | Self-signed | Enterprise clusters |

**Key Rule:** Use `bolt://` or `neo4j://` for local, `+s` suffix for production

### Authentication Methods

#### 1. Username/Password (Default)

**What it is:**
- Basic authentication with username and password
- Default user: `neo4j`
- Default password: Must be changed on first login

**Setup:**
```bash
# .env.local
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-secure-password
```

**How to use:**
```javascript
// JavaScript/Node.js
import neo4j from 'neo4j-driver'

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USER,
    process.env.NEO4J_PASSWORD
  )
)
```

```python
# Python/FastAPI
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    os.getenv('NEO4J_URI'),
    auth=(
        os.getenv('NEO4J_USER'),
        os.getenv('NEO4J_PASSWORD')
    )
)
```

#### 2. Token Authentication (Aura)

**What it is:**
- JWT-based authentication for Neo4j Aura
- More secure than basic auth
- Can have expiration

**Setup:**
```bash
# .env.local
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_AUTH_TOKEN=your-jwt-token
```

**How to use:**
```javascript
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.bearer(process.env.NEO4J_AUTH_TOKEN)
)
```

#### 3. No Authentication (Development Only)

**⚠️ WARNING:** Only use for local development, never in production!

```bash
# Docker with auth disabled
docker run \
  --name neo4j-dev \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=none \
  neo4j:5.15
```

```javascript
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.none()
)
```

## Environment Variables

### For Local Development (Docker)

```bash
# .env.local
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=tutorwise-dev-password

# Optional: Connection pool settings
NEO4J_MAX_CONNECTION_POOL_SIZE=50
NEO4J_CONNECTION_TIMEOUT=30000
NEO4J_MAX_TRANSACTION_RETRY_TIME=30000
```

### For Production (Neo4j Aura)

```bash
# .env.local (git-ignored!)
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-production-password  # Keep secret!

# Optional: SSL verification
NEO4J_ENCRYPTED=true
NEO4J_TRUST_STRATEGY=TRUST_SYSTEM_CA_SIGNED_CERTIFICATES
```

### For CI/CD

```bash
# GitHub Secrets / Vercel Environment Variables
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=${{ secrets.NEO4J_PASSWORD }}  # Store in secrets!
```

## Docker Compose Configuration

### Current Setup (docker-compose.yml)

```yaml
services:
  neo4j:
    image: neo4j:5.15
    container_name: tutorwise-neo4j
    ports:
      - "7474:7474"  # HTTP (Browser)
      - "7687:7687"  # Bolt (Driver)
    environment:
      - NEO4J_AUTH=neo4j/tutorwise123  # ⚠️ Change this!
      - NEO4J_PLUGINS=["apoc", "graph-data-science"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*,gds.*
      - NEO4J_dbms_memory_heap_max__size=1G
      - NEO4J_dbms_memory_pagecache_size=512M
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
    networks:
      - tutorwise-network

volumes:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
```

### Recommended Security Improvements

```yaml
services:
  neo4j:
    image: neo4j:5.15
    container_name: tutorwise-neo4j
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      # Use environment variable for password (don't hardcode!)
      - NEO4J_AUTH=${NEO4J_USER:-neo4j}/${NEO4J_PASSWORD}

      # Plugins
      - NEO4J_PLUGINS=["apoc", "graph-data-science"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*,gds.*

      # Performance tuning
      - NEO4J_dbms_memory_heap_max__size=2G
      - NEO4J_dbms_memory_pagecache_size=1G
      - NEO4J_dbms_connector_bolt_thread__pool__max__size=400

      # Security settings
      - NEO4J_dbms_security_auth__minimum__password__length=8
      - NEO4J_dbms_logs_debug_level=INFO

      # Optional: Enable APOC
      - NEO4J_apoc_export_file_enabled=true
      - NEO4J_apoc_import_file_enabled=true
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
      - neo4j_plugins:/plugins
    networks:
      - tutorwise-network
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "${NEO4J_PASSWORD}", "RETURN 1"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
  neo4j_plugins:
```

## Finding Your Credentials

### Method 1: Check .env.local

```bash
cat .env.local | grep NEO4J
```

### Method 2: Neo4j Aura Console

1. Go to https://console.neo4j.io/
2. Select your database
3. Click "Connect"
4. View connection details:
   - URI
   - Username (usually `neo4j`)
   - Password (if saved)

### Method 3: Docker Logs

```bash
# Check environment variables
docker exec tutorwise-neo4j env | grep NEO4J_AUTH

# Or inspect container
docker inspect tutorwise-neo4j | grep NEO4J_AUTH
```

### Method 4: Default Credentials

**First-time setup:**
- Username: `neo4j`
- Password: `neo4j`
- **You'll be forced to change password on first login**

## Common Issues & Solutions

### Issue 1: "ServiceUnavailable: Connection refused"

**Symptoms:**
```bash
Error: ServiceUnavailable: Failed to establish connection
```

**Causes:**
1. Neo4j is not running
2. Wrong port (7687 vs 7474)
3. Firewall blocking connection
4. Wrong URI protocol

**Solutions:**
1. **Check if Neo4j is running:**
   ```bash
   # Docker
   docker ps | grep neo4j
   docker-compose up neo4j -d

   # Local install
   neo4j status
   neo4j start
   ```

2. **Verify port and URI:**
   ```bash
   # Correct (Bolt driver port)
   NEO4J_URI=bolt://localhost:7687

   # Wrong (HTTP browser port)
   NEO4J_URI=bolt://localhost:7474  # ❌
   ```

3. **Test connection:**
   ```bash
   # Using cypher-shell
   docker exec -it tutorwise-neo4j cypher-shell -u neo4j -p your-password

   # Using curl (HTTP API)
   curl http://localhost:7474
   ```

### Issue 2: "AuthenticationException: Invalid credentials"

**Symptoms:**
```bash
Error: Neo.ClientError.Security.Unauthorized
The client is unauthorized due to authentication failure.
```

**Causes:**
1. Wrong password
2. Password not changed from default
3. User doesn't exist

**Solutions:**
1. **Reset password (Docker):**
   ```bash
   # Stop Neo4j
   docker-compose down neo4j

   # Remove auth file
   docker volume rm tutorwise_neo4j_data

   # Restart with new password
   docker-compose up neo4j -d
   ```

2. **Reset password (Neo4j Desktop):**
   - Stop database
   - Click "Manage"
   - Click "Set password"
   - Enter new password

3. **Reset password (cypher-shell):**
   ```bash
   # Login as admin
   cypher-shell -u neo4j -p current-password

   # Change password
   ALTER CURRENT USER SET PASSWORD FROM 'old-password' TO 'new-password';
   ```

### Issue 3: "Database does not exist"

**Symptoms:**
```bash
Error: Neo.ClientError.Database.DatabaseNotFound
The database 'tutorwise' does not exist.
```

**Causes:**
1. Database wasn't created
2. Wrong database name
3. Using default `neo4j` database

**Solutions:**
1. **Create database:**
   ```cypher
   # In Neo4j Browser or cypher-shell
   CREATE DATABASE tutorwise;
   SHOW DATABASES;
   ```

2. **Use correct database in connection:**
   ```javascript
   const session = driver.session({
     database: 'tutorwise'  // or 'neo4j' for default
   })
   ```

3. **Set default database:**
   ```cypher
   :use tutorwise
   ```

### Issue 4: "Memory allocation failed"

**Symptoms:**
```bash
Error: OutOfMemoryError: Java heap space
```

**Causes:**
1. Not enough heap memory allocated
2. Large query without LIMIT
3. Memory leak in application

**Solutions:**
1. **Increase heap size (docker-compose.yml):**
   ```yaml
   environment:
     - NEO4J_dbms_memory_heap_max__size=4G  # Increase from 1G
     - NEO4J_dbms_memory_pagecache_size=2G
   ```

2. **Use LIMIT in queries:**
   ```cypher
   // ❌ Bad - loads all nodes
   MATCH (n:User) RETURN n

   // ✅ Good - limits results
   MATCH (n:User) RETURN n LIMIT 100
   ```

3. **Monitor memory usage:**
   ```cypher
   CALL dbms.queryJmx("org.neo4j:instance=kernel#0,name=Memory Pool")
   YIELD attributes
   RETURN attributes.HeapMemoryUsage.value;
   ```

## Setup Guide

### Step-by-Step: Local Development Setup

1. **Start Neo4j with Docker:**
   ```bash
   # Navigate to project root
   cd /Users/michaelquan/projects/tutorwise

   # Start Neo4j
   docker-compose up neo4j -d

   # Check logs
   docker-compose logs neo4j
   ```

2. **Access Neo4j Browser:**
   - Open: http://localhost:7474
   - Login with:
     - URI: `bolt://localhost:7687`
     - Username: `neo4j`
     - Password: (from docker-compose.yml or .env)

3. **Change Default Password:**
   ```cypher
   ALTER CURRENT USER SET PASSWORD FROM 'tutorwise123' TO 'new-secure-password';
   ```

4. **Update .env.local:**
   ```bash
   # Edit .env.local
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=new-secure-password
   ```

5. **Install Neo4j Driver:**
   ```bash
   # For JavaScript/Node.js
   npm install neo4j-driver

   # For Python/FastAPI
   pip install neo4j
   ```

6. **Test Connection:**

   **JavaScript:**
   ```javascript
   // test-neo4j.js
   import neo4j from 'neo4j-driver'

   const driver = neo4j.driver(
     process.env.NEO4J_URI,
     neo4j.auth.basic(
       process.env.NEO4J_USER,
       process.env.NEO4J_PASSWORD
     )
   )

   const session = driver.session()
   try {
     const result = await session.run('RETURN "Hello Neo4j!" AS message')
     console.log(result.records[0].get('message'))
   } finally {
     await session.close()
     await driver.close()
   }
   ```

   **Python:**
   ```python
   # test_neo4j.py
   from neo4j import GraphDatabase
   import os

   driver = GraphDatabase.driver(
       os.getenv('NEO4J_URI'),
       auth=(os.getenv('NEO4J_USER'), os.getenv('NEO4J_PASSWORD'))
   )

   with driver.session() as session:
       result = session.run("RETURN 'Hello Neo4j!' AS message")
       print(result.single()['message'])

   driver.close()
   ```

### Step-by-Step: Production Setup (Neo4j Aura)

1. **Create Neo4j Aura Instance:**
   - Go to https://console.neo4j.io/
   - Click "New Instance"
   - Choose plan (Free tier available)
   - Select region (closest to users)
   - Click "Create"

2. **Download Credentials:**
   - Save the connection URI
   - Save the password (shown once!)
   - Or download `.env` file

3. **Add to Production Environment:**

   **Vercel:**
   ```bash
   # Settings → Environment Variables → Production
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-production-password
   ```

   **Railway:**
   ```bash
   # Project → Variables
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-production-password
   ```

4. **Test Production Connection:**
   ```bash
   # Using connection string from Aura
   cypher-shell -a neo4j+s://xxxxx.databases.neo4j.io \
     -u neo4j \
     -p your-password \
     "RETURN 'Connected!' AS status"
   ```

5. **Import Initial Data:**
   ```cypher
   // Create constraints
   CREATE CONSTRAINT user_email IF NOT EXISTS
   FOR (u:User) REQUIRE u.email IS UNIQUE;

   CREATE CONSTRAINT course_id IF NOT EXISTS
   FOR (c:Course) REQUIRE c.id IS UNIQUE;

   // Import sample data
   LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
   CREATE (u:User {
     id: row.id,
     email: row.email,
     name: row.name
   });
   ```

### Step-by-Step: Schema Design

1. **Define Node Labels:**
   ```cypher
   // Core entities
   CREATE (:User {id, email, name, role})
   CREATE (:Tutor {id, specialization, rating})
   CREATE (:Student {id, grade_level, learning_style})
   CREATE (:Course {id, title, description, level})
   CREATE (:Session {id, start_time, duration, status})
   CREATE (:Topic {id, name, difficulty})
   ```

2. **Define Relationships:**
   ```cypher
   // User relationships
   (Student)-[:ENROLLED_IN]->(Course)
   (Tutor)-[:TEACHES]->(Course)
   (Student)-[:HAS_SESSION]->(Session)
   (Tutor)-[:CONDUCTS]->(Session)

   // Course relationships
   (Course)-[:COVERS]->(Topic)
   (Topic)-[:PREREQUISITE_OF]->(Topic)
   (Course)-[:RELATED_TO]->(Course)

   // Learning path
   (Student)-[:COMPLETED]->(Topic)
   (Student)-[:LEARNING]->(Topic)
   (Student)-[:STRUGGLING_WITH]->(Topic)
   ```

3. **Create Constraints (Uniqueness):**
   ```cypher
   CREATE CONSTRAINT user_id IF NOT EXISTS
   FOR (u:User) REQUIRE u.id IS UNIQUE;

   CREATE CONSTRAINT course_id IF NOT EXISTS
   FOR (c:Course) REQUIRE c.id IS UNIQUE;

   CREATE CONSTRAINT session_id IF NOT EXISTS
   FOR (s:Session) REQUIRE s.id IS UNIQUE;
   ```

4. **Create Indexes (Performance):**
   ```cypher
   CREATE INDEX user_email IF NOT EXISTS
   FOR (u:User) ON (u.email);

   CREATE INDEX course_title IF NOT EXISTS
   FOR (c:Course) ON (c.title);

   CREATE INDEX session_start_time IF NOT EXISTS
   FOR (s:Session) ON (s.start_time);
   ```

## Security Best Practices

### ✅ Do's

- ✅ Change default password immediately
- ✅ Use strong passwords (12+ characters)
- ✅ Use encrypted connections in production (`+s` protocols)
- ✅ Store credentials in `.env.local` (git-ignored)
- ✅ Use different passwords for dev/prod
- ✅ Enable authentication (never use `NEO4J_AUTH=none` in production)
- ✅ Create indexes for frequently queried properties
- ✅ Use constraints for data integrity
- ✅ Implement connection pooling
- ✅ Close sessions and drivers properly
- ✅ Use transactions for multi-step operations
- ✅ Back up production databases regularly
- ✅ Monitor query performance
- ✅ Use LIMIT in queries

### ❌ Don'ts

- ❌ Never commit passwords to git
- ❌ Don't use default password in production
- ❌ Don't disable authentication in production
- ❌ Don't use unencrypted connections in production
- ❌ Don't expose Neo4j Browser publicly
- ❌ Don't run queries without LIMIT on large datasets
- ❌ Don't forget to close sessions/drivers
- ❌ Don't store sensitive data unencrypted
- ❌ Don't use same credentials across environments
- ❌ Don't skip constraints and indexes
- ❌ Don't ignore memory settings
- ❌ Don't run Neo4j as root user

## Connection Best Practices

### JavaScript/Node.js

```javascript
// Good: Reuse driver instance
class Neo4jService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(
        process.env.NEO4J_USER,
        process.env.NEO4J_PASSWORD
      ),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000,
        encrypted: process.env.NEO4J_ENCRYPTED === 'true'
      }
    )
  }

  async query(cypher, params = {}) {
    const session = this.driver.session()
    try {
      const result = await session.run(cypher, params)
      return result.records
    } finally {
      await session.close()  // Always close session
    }
  }

  async close() {
    await this.driver.close()
  }
}

// Use singleton pattern
export const neo4j = new Neo4jService()
```

### Python/FastAPI

```python
# Good: Use context manager
from neo4j import GraphDatabase
from contextlib import contextmanager

class Neo4jService:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            os.getenv('NEO4J_URI'),
            auth=(
                os.getenv('NEO4J_USER'),
                os.getenv('NEO4J_PASSWORD')
            ),
            max_connection_pool_size=50,
            encrypted=os.getenv('NEO4J_ENCRYPTED', 'false') == 'true'
        )

    @contextmanager
    def session(self):
        session = self.driver.session()
        try:
            yield session
        finally:
            session.close()

    def query(self, cypher, parameters=None):
        with self.session() as session:
            result = session.run(cypher, parameters or {})
            return [record.data() for record in result]

    def close(self):
        self.driver.close()

# Use dependency injection
neo4j_service = Neo4jService()
```

## Useful Cypher Queries

### Health Check
```cypher
// Check database is running
CALL dbms.components() YIELD name, versions, edition;

// Count all nodes
MATCH (n) RETURN count(n);

// Check indexes
SHOW INDEXES;

// Check constraints
SHOW CONSTRAINTS;
```

### Performance Monitoring
```cypher
// Show slow queries
CALL dbms.listQueries() YIELD query, elapsedTimeMillis
WHERE elapsedTimeMillis > 1000
RETURN query, elapsedTimeMillis
ORDER BY elapsedTimeMillis DESC;

// Check memory usage
CALL dbms.queryJmx("org.neo4j:instance=kernel#0,name=Memory Pool")
YIELD attributes
RETURN attributes.HeapMemoryUsage.value;

// Database size
CALL apoc.meta.stats() YIELD nodeCount, relCount, labelCount;
```

### Maintenance
```cypher
// Delete all data (⚠️ USE WITH CAUTION!)
MATCH (n) DETACH DELETE n;

// Remove duplicate relationships
MATCH (a)-[r:REL_TYPE]->(b)
WITH a, b, collect(r) AS rels
WHERE size(rels) > 1
FOREACH (r IN tail(rels) | DELETE r);

// Rebuild indexes
DROP INDEX index_name IF EXISTS;
CREATE INDEX index_name FOR (n:Label) ON (n.property);
```

## Troubleshooting Checklist

When encountering Neo4j issues:

- [ ] Verify Neo4j is running: `docker ps | grep neo4j`
- [ ] Check correct port: 7687 (Bolt), not 7474 (HTTP)
- [ ] Confirm credentials in `.env.local`
- [ ] Test connection with cypher-shell
- [ ] Check Docker logs: `docker logs tutorwise-neo4j`
- [ ] Verify protocol: `bolt://` for local, `neo4j+s://` for Aura
- [ ] Ensure database exists: `SHOW DATABASES`
- [ ] Check memory settings if getting OOM errors
- [ ] Verify network connectivity (firewall, VPN)
- [ ] Review query performance with `EXPLAIN`/`PROFILE`

## Related Documentation

- [Redis Setup Guide](./REDIS-SETUP-README.md)
- [Cloud Services Setup](./CLOUD-SERVICES-SETUP.md)
- [Docker Compose Reference](../../docker-compose.yml)
- [Neo4j Official Docs](https://neo4j.com/docs/)
- [Cypher Reference](https://neo4j.com/docs/cypher-manual/current/)

## Summary

**The Golden Rules:**

1. **Change default password immediately** - Never use `neo4j/neo4j` in production
2. **Use encrypted connections in production** - `neo4j+s://` or `bolt+s://`
3. **Store credentials in .env.local** - Never commit to git
4. **Always close sessions and drivers** - Prevent connection leaks
5. **Use constraints and indexes** - Data integrity and performance
6. **Monitor memory usage** - Tune heap size appropriately

**Quick Setup:**
```bash
# 1. Start Neo4j
docker-compose up neo4j -d

# 2. Change password at http://localhost:7474
# 3. Add to .env.local
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-secure-password

# 4. Test connection
docker exec -it tutorwise-neo4j cypher-shell -u neo4j -p your-password
```

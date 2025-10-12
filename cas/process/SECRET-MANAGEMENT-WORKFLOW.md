# CAS Process: Secret Management Workflow

**Owner:** Engineer Agent
**Status:** Active
**Version:** 1.0.0

---

## 1. Purpose

To establish a secure, centralized, and auditable process for managing and accessing secrets (e.g., API keys, database credentials, environment variables). This workflow prevents the insecure practice of agents directly accessing `.env` files or having widespread knowledge of sensitive credentials.

---

## 2. Guiding Principles

- **Principle of Least Privilege:** An agent should only have access to the specific secrets it needs for the duration of a specific task.
- **Centralized Management:** The **Engineer Agent** is the *only* entity with permission to read and manage secrets from `.env`, `.env.local`, or a dedicated secret manager.
- **Secure by Default:** The default is for an agent to have *no* access to secrets. Access must be explicitly requested and granted.
- **Auditability:** All requests and grants of secret access should be logged for security review.

---

## 3. Workflow

### Step 3.1: Agent Request

When an agent (e.g., the `Marketer Agent`) requires a secret to perform a task (e.g., an API key for an analytics service), it must formally request it from the **Engineer Agent**.

**Request Format:**
- **Requesting Agent:** `Marketer Agent`
- **Required Secret(s):** `[ANALYTICS_API_KEY]`
- **Task ID:** `MKT-123`
- **Justification:** "To upload user engagement data to the analytics platform."

### Step 3.2: Engineer Agent Verification & Provisioning

The **Engineer Agent** receives the request and performs the following actions:
1.  **Verify Request:** Checks if the requesting agent is authorized to access the requested secret for the given task. (This can be based on a predefined RBAC policy).
2.  **Retrieve Secret:** Securely retrieves the secret from its source (e.g., `process.env.ANALYTICS_API_KEY`).
3.  **Provide Securely:** Provides the secret to the requesting agent in a secure, ephemeral way (e.g., as a direct input to a function call, not by writing it to a file).

### Step 3.3: Task Execution & Revocation

1.  The requesting agent uses the secret to perform its task.
2.  The secret is held only in memory for the duration of the task and is never stored.
3.  Once the task is complete, the agent's access is implicitly revoked.

---

## 4. Responsibilities

### Engineer Agent (Secrets Manager)
- Sole custodian of all secrets.
- Fulfills secret requests from other agents.
- Responsible for loading environment variables from `.env` files at startup.
- Logs all secret access requests.

### All Other Agents
- **Must not** attempt to read `.env` or other configuration files directly.
- **Must** formally request any required secrets from the Engineer Agent.
- **Must not** store or log any secrets they receive.

---

## 5. Implementation Example

```typescript
// Example of how the Marketer Agent would request a secret

import { engineerAgent } from './engineer-agent'; // The Engineer Agent's client

async function runMarketingTask(taskId: string) {
  // Request the secret from the Engineer Agent
  const apiKey = await engineerAgent.getSecret('ANALYTICS_API_KEY', {
    taskId: taskId,
    requester: 'MarketerAgent'
  });

  if (apiKey) {
    // Use the secret for the task
    const analyticsClient = new AnalyticsClient(apiKey);
    await analyticsClient.uploadData();
  } else {
    // Handle the case where the secret could not be retrieved
    console.error('Could not retrieve ANALYTICS_API_KEY. Task failed.');
  }
}
```

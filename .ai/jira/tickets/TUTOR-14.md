# TUTOR-14: Initialize Railway for AI Layer

**Status**: Testing
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Task

**Created**: 9/15/2025
**Updated**: 9/25/2025



## Description
Configure Railway to deploy the AI microservice layer for Tutorwise, supporting CaaS, RaaS, and AI tutors.


*Steps*:

# Log into Railway with [tutorwiseapp@gmail.com|mailto:tutorwiseapp@gmail.com].
# Create a project named tutorwise-ai.
# Deploy a FastAPI template (coordinate with AI Developers for stub code).
# Add a Neo4j service in Railway and configure environment variables for Supabase integration.
# Implement a stub /ai/score endpoint returning mock data.
# Test the endpoint via a Next.js API call.

*Acceptance Criteria*:

* Railway project tutorwise-ai created and FastAPI deployed.
* Neo4j service active and linked to Supabase.
* /ai/score endpoint returns mock data when called from Next.js.

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-14)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.823Z*

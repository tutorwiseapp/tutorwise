# TUTOR-10: Deploy Tutorwise to Vercel

**Status**: Done
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Story

**Created**: 9/15/2025
**Updated**: 9/19/2025



## Description
*As a developer*, I want to configure Vercel for Tutorwise, so that I can deploy and test the application with continuous integration and delivery (CI/CD).


*BDD Format*:
Given I have a Vercel account and the Tutorwise GitHub repository,
When I import the repository, configure environment variables, and deploy a preview,
Then the application is accessible via a preview URL, and authentication integrates with Supabase.

*Acceptance Criteria*:

* tutorwise GitHub repository imported to Vercel.
* Environment variables (SUPABASE_URL, etc.) configured in Vercel dashboard.
* Preview deployment accessible at dev.tutorwise.app.
* Authentication login works on the preview URL.

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-10)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.822Z*

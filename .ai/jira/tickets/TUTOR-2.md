# TUTOR-2: Clone the Vinite codebase to GitHub for Tutorwise

**Status**: Done
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Story

**Created**: 9/14/2025
**Updated**: 9/19/2025



## Description
*As a developer*, I want to clone and prune the Vinite codebase to a new Tutorwise GitHub repository, so that I can start development with a tailored Next.js foundation.

*BDD Format*:

* Given I have access to the Vinite GitHub repository and a new Tutorwise GitHub repository,
* When I clone the Vinite codebase, remove irrelevant features (e.g., link generator), and push to the Tutorwise repository,
* Then the Tutorwise repository contains a functional Next.js application stripped of Vinite-specific features, running locally without errors.

*Acceptance Criteria*:

* Vinite codebase cloned to tutorwiseapp/tutorwise.
* /app/link-generator/* and /api/link-generator/* directories removed.
* Navbar.tsx updated to exclude link generator navigation.
* npm run dev starts the application at localhost:3000 without errors.

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-2)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.820Z*

# TUTOR-19: Test and QA tool implementation for mvp

**Status**: Done
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Task

**Created**: 9/23/2025
**Updated**: 9/25/2025



## Description
h3. *Must-Haves for an MVP (The "Safety Net")*

​This is the absolute minimum you should have to ensure basic code quality and prevent simple, avoidable bugs. The setup time is very low for a huge return.

* ​*Static Analysis & Linting*:
** ​*ESLint (for Frontend)*: Catches syntax errors and enforces basic code style in your TypeScript code. This is already set up in both the Fuschia and Tutorwise projects.
** ​*Ruff (for Backend)*: A fast and simple linter for your Python code. It's one command to install and run.

h3. ​*2. Should-Haves (The "Confidence Boost")*

​If you have a bit more time, adding unit tests for your most critical business logic is the next logical step. This gives you confidence that your core functionality is solid.

* ​*Unit Tests*:
** ​*Jest & React Testing Library (for Frontend)*: You don't need to test every single component. Focus on testing the core business logic. For Tutorwise, this would be something like the functions that calculate pricing or manage lesson states.
** ​*Pytest (for Backend)*: Focus on testing the most critical API endpoints and services. For example, in Tutorwise, you would absolutely want tests for the Stripe payment processing logic to ensure it's correct.

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-19)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.825Z*

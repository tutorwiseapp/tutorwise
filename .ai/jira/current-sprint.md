# TUTOR board - Current Issues

**Status**: ACTIVE
**Duration**: 2025-09-26T05:45:54.788Z → TBD
**Goal**: Current board items

## Sprint Summary
- **Total Issues**: 21
- **Done**: 16
- **In Progress**: 2
- **Testing**: 1
- **Backlog**: 2

## Sprint Backlog


### TUTOR-18: Set up Bigpicture for program and project management
- **Status**: Done
- **Assignee**: David Quan
- **Priority**: Medium
- **Type**: Task




[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-18)

---

### TUTOR-2: Clone the Vinite codebase to GitHub for Tutorwise
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Story


**Description:**
*As a developer*, I want to clone and prune the Vinite codebase to a new Tutorwise GitHub repository, so that I can start development with a tailored Next.js foundation.

*BDD Format*:

* Given I have...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-2)

---

### TUTOR-4: Prune Vinite-Specific Features
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
Remove features not required for Tutorwise.


*Steps*:

# Delete /app/link-generator/* and /api/link-generator/*.
# Update Navbar.tsx to remove link generator navigation entry.
# Commit changes: git c...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-4)

---

### TUTOR-3: Clone Vinite repo to GitHub
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
Clone the Vinite repo and set up the new Tutorwise repo.

*Steps*: 

# Log into GitHub with [tutorwiseapp@gmail.com|mailto:tutorwiseapp@gmail.com].
# Create private repo "tutorwise".
# Run: git clone ...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-3)

---

### TUTOR-5: Validate Local Application
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
Verify the pruned application runs locally.


*Steps*:

# Run npm run dev.
# Confirm the application loads at localhost:3000 without errors.
# Log any issues in GitHub Issues.


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-5)

---

### TUTOR-6: Configure Supabase for Tutorwise
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Story


**Description:**
*As a developer*, I want to configure Supabase for Tutorwise, so that I can manage authentication, database, and storage with schemas tailored for roles and user data.


*BDD Format*:
Given I have a S...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-6)

---

### TUTOR-7: Create Supabase database and authentication services
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
*Description*: Set up a new Supabase project and configure environment variables.


*Steps*:

# Log into Supabase with [tutorwiseapp@gmail.com|mailto:tutorwiseapp@gmail.com].
# Create a project named ...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-7)

---

### TUTOR-8: Apply Migrations and Extend Schema
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
Apply Vinite migrations and add Tutorwise-specific schema changes.


*Steps*:

# Initialize Supabase CLI: npx supabase init.
# Link project: supabase link --project-ref [project-id].
# Apply Vinite mi...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-8)

---

### TUTOR-9: Validate Supabase Setup
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
Confirm the Supabase configuration and schema functionality.


*Steps*:

# Run SELECT * FROM users; in Supabase dashboard to verify roles and dob fields.
# Test authentication login via the Next.js ap...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-9)

---

### TUTOR-10: Deploy Tutorwise to Vercel
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Story


**Description:**
*As a developer*, I want to configure Vercel for Tutorwise, so that I can deploy and test the application with continuous integration and delivery (CI/CD).


*BDD Format*:
Given I have a Vercel accoun...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-10)

---

### TUTOR-11: Import Repository to Vercel
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
Connect the Tutorwise repository to Vercel and set environment variables.


*Steps*:

# Log into Vercel with [tutorwiseapp@gmail.com|mailto:tutorwiseapp@gmail.com].
# Import the tutorwise repository f...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-11)

---

### TUTOR-12: Deploy and Test Preview
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Sub-task


**Description:**
*Description*: Deploy the application and validate the preview.


*Steps*:

# Configure the custom domain dev.tutorwise.app in Vercel.
# Deploy the main branch.
# Test the preview URL to ensure authen...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-12)

---

### TUTOR-13: Configure Stripe for Payments
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Task


**Description:**
Set up Stripe for Tutorwise to handle payments and commissions using Stripe Connect.


*Steps*:

# Log into Stripe with [tutorwiseapp@gmail.com|mailto:tutorwiseapp@gmail.com].
# Enable Stripe Connect ...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-13)

---

### TUTOR-1: Tutorwise Environment Setup
- **Status**: In Progress
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Epic


**Description:**
Description: Establish and configure the development environment for Tutorwise MVP, including GitHub, Supabase, Vercel, Stripe, and Railway, based on Vinite foundation.


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-1)

---

### TUTOR-14: Initialize Railway for AI Layer
- **Status**: Testing
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Task


**Description:**
Configure Railway to deploy the AI microservice layer for Tutorwise, supporting CaaS, RaaS, and AI tutors.


*Steps*:

# Log into Railway with [tutorwiseapp@gmail.com|mailto:tutorwiseapp@gmail.com].
#...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-14)

---

### TUTOR-21: Playwright and Claude Code integration for Visual testing and UI debugging
- **Status**: In Progress
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Task


**Description:**
Playwright and Claude Code integration for Visual testing and UI debugging i.e. it allows Claude Code to ‘visualise' the UI during development and testing, as well as end to end testing.



[https://t...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-21)

---

### TUTOR-15: Set up the GitHub org
- **Status**: Backlog
- **Assignee**: David Quan
- **Priority**: Medium
- **Type**: Task




[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-15)

---

### TUTOR-16: Set up Claude Code using the Pay as you go plan
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Task


**Description:**
Subscribe to the $5 pay as you go plan and if it added values then subscribe to the Pro plan at $20pm.

Add claude code to the app by creating 2 files:

* Filename: .claude/CLAUDE.md 
* Filename: .cla...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-16)

---

### TUTOR-17: Set up Claude Code using the Pro plan
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Task


**Description:**
Subscribe to the $20pm Pro plan.

The setup must support multiple projects and app development (tutorwise, vinite and fuschia)

TBC


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-17)

---

### TUTOR-19: Test and QA tool implementation for mvp
- **Status**: Done
- **Assignee**: Michael Quan
- **Priority**: Medium
- **Type**: Task


**Description:**
h3. *Must-Haves for an MVP (The "Safety Net")*

​This is the absolute minimum you should have to ensure basic code quality and prevent simple, avoidable bugs. The setup time is very low for a huge ret...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-19)

---

### TUTOR-20: Test and QA tool implementation post mvp
- **Status**: Backlog
- **Assignee**: David Quan
- **Priority**: Medium
- **Type**: Task


**Description:**
h3. *Post-MVP*

​These tools are incredibly valuable for scaling and maintaining a high-quality product, but they require significant setup and maintenance time that is better spent elsewhere during t...


[View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-20)

---

*Last synced: 2025-09-26T05:45:54.791Z*

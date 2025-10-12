# Feature Brief: Listing Creation Wizard

**Owner:** Analyst Agent
**Status:** Ready for Development
**Version:** 1.0.0

---

## 1. Overview

**User Story:** As a Tutor, I want to be guided through a multi-step process to create a new service listing, so that I can provide all the necessary information in a structured and user-friendly way.

**Acceptance Criteria:**
- The wizard must consist of 5 distinct steps.
- The user must be able to navigate forwards and backwards.
- The user's progress must be saved at each step.
- All input fields must have appropriate validation.
- The final step must provide a summary before publishing.

---

## 2. Functional Requirements

- **Step 1: Basic Info:** Title, Description, Subject.
- **Step 2: Teaching Details:** Teaching Style, Experience Level.
- **Step 3: Expertise & Credentials:** Qualifications, Certifications.
- **Step 4: Pricing & Availability:** Hourly Rate, Weekly Schedule.
- **Step 5: Location & Media:** In-person/Online, Photos/Videos.

---

## 3. Proven Patterns & Constraints (CRITICAL)

This section is the output of the **Contextual Analysis Workflow**. All development **must** adhere to these constraints to ensure consistency with the existing application.

- **Analogous Feature:** The **Onboarding Wizard** (`apps/web/src/app/onboarding/`). All patterns are derived from this existing, production-ready feature.

- **Layout System:**
    - **Constraint:** Must use the CSS Module wrapper pattern.
    - **Implementation:** The root page component must be wrapped in a `div` with a class from a local `page.module.css` file. This wrapper will handle the full-page background and centering.
    - **Example:**
      ```css
      /* page.module.css */
      .listingPage {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--color-bg-primary, #f9fafb); /* gray-50 */
      }
      ```

- **Design System:**
    - **Color Palette:**
        - **Primary Action Color:** `teal-600`
        - **Background Color:** `gray-50`
    - **Typography:**
        - **Main Headers (`h1`):** `text-4xl font-bold`
        - **Sub-headers (`p`):** `text-lg text-gray-600`
    - **Spacing:**
        - **Constraint:** Must use the 8px-based spacing system.
        - **Examples:** `mb-12` for headers, `space-y-8` for form fields, `mt-12` for action buttons.

- **Component Usage:**
    - **Progress Indicator:** Must use the `<ProgressDots>` component, not a progress bar.
    - **Buttons:** Must use the shared `<Button>` component.
    - **Multi-Select:** Must use the button-based multi-select pattern, not native checkboxes.

---

## 4. Next Step

This Feature Brief is now ready to be passed to the **Developer Agent**. The constraints outlined in Section 3 provide all the necessary context to ensure the feature is developed in a way that is visually and architecturally consistent with the rest of the TutorWise application.

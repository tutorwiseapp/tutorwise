# hubform-ui-design-v3

CAS Dev: Implement the 'Gold Standard HubForm' (Best of Both Worlds).

# Context

We are finalizing the form standard. The user prefers the "Clean/Borderless" look of the Account Page over the "Boxed/Card" look.  
We need to strip the visual "container" styles from HubForm while keeping the layout engine and safety buttons.

It combines the **Superior Logic** of `PersonalInfoForm.tsx` (Auto-save) with the **Superior Visuals** of the new Hub designs (24px Grid + Safety Buttons) without the “Boxed/Card” look.

# Reference Sources

1. **Logic Source:** `apps/web/src/app/components/profile/PersonalInfoForm.tsx`
  - *Key Feature:* `editingField` state, `handleBlur` auto-save, individual field management.
2. **Visual Source:** `apps/web/src/app/components/ui/hub-form/HubForm.tsx`
  - *Key Feature:* 2-column grid, 24px spacing, standardized labels.

# Phase 1: Finalize Core UI (`apps/web/src/app/components/ui/hub-form/`)

1. `HubForm.module.css` Updates (The "Clean" Look):
  1. `.root`: REMOVE `box-shadow`, `border`, `background-color`, `border-radius`. It should be a transparent container.
  2. `.header`: REMOVE `background-color` and `border-bottom`. Just padding/spacing.
  3. `.actions`: REMOVE `background-color` and `border-top`. Just padding and `justify-content: flex-end`.
  4. `.grid`: Keep the 24px gap and 2-column logic (This is the value).
2. `HubForm.tsx` Logic:
  1. Ensure `Root` renders as a `div`.
  2. Ensure `Field` handles the `onClick` (Edit Mode) and `onBlur` (Auto-save) events required for the Hybrid logic.
3. `HubForm.Grid`: Enforce the **24px** (`var(--space-3)`) gap standard.
4. `HubForm.Field`: Ensure it exports the necessary refs or props to handle the **"Click to Edit"** pattern (e.g., `isEditing` prop to toggle styles between 'Text Display' and 'Input').

# Phase 2: Create Organisation Form (The Hybrid Logic Transplant)

Create `apps/web/src/app/components/organisation/tabs/OrganisationInfoForm.tsx`.

- **Task:** Clone the logic from `PersonalInfoForm` but map it to Organisation data.
- **Requirements:**
  1. **Data:** Map fields to `network_groups` (Name, Slug, Description, Contact, Address).
  2. **Logic:** Implement the exact `editingField` + `handleBlur` (Auto-save) pattern.
  3. **Safety Layer (New):**
    - Add `<HubForm.Actions>` at the bottom.
    - **Save Button:** Manually triggers validation and saves any currently active field.
    - **Cancel Button:** Clears `editingField` state and reverts the active input to its database value.

# Phase 3: Refactor Profile Form (Visual Upgrade)

Update `apps/web/src/app/components/profile/PersonalInfoForm.tsx`.

- **Task:** Apply the `HubForm` visual wrappers to the existing logic. Wrap the existing profile fields in the new `<HubForm>` components.
- **Changes:**
  1. Replace `.personalInfoForm` container with `<HubForm.Root>`.
  2. Replace `.twoColumnGrid` divs with `<HubForm.Grid>`.
  3. Replace manual `<label>`+`<input>` pairs with `<HubForm.Field>`.
  4. **Add Buttons:** Insert `<HubForm.Actions>` at the bottom with Save/Cancel (wired to the existing state) to match the Organisation form.
- **Result:** Since `HubForm` is now borderless, the Profile page will look *exactly* as it does now (Clean), but it will be running on the shared system code.

# Constraints

- **Behavior:** Auto-save MUST remain active. The buttons are a "Safety Net" for user confidence.

- **Visuals:** NO BORDERS, NO SHADOWS on the form container.
- **Layout:** Strict 24px spacing.
- **Behavior:** Hybrid Auto-save + Manual Safety Buttons.
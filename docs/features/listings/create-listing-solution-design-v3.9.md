# create-listing-solution-design-v3.9

**Version: 3.9**

**Date: November 4, 2025**

**Status: For Implementation**

**Owner: Senior Architect**

### 1.0 Executive Summary

This document outlines the redesign and redevelopment of the "Create Listing" page (`/my-listings/create/page.tsx`). The original implementation, while functional, suffers from critical UI/UX flaws, including field misalignment, poor hierarchical flow, and an inconsistent layout, as seen in `create listing page.png`.

This redesign will serve as the **standard template for all future create/edit forms**, ensuring they are robust, responsive, and visually consistent with the `DESIGN-SYSTEM.md`.

The solution involves replacing the fragile 2-column flex layout with a robust CSS Grid, reorganizing the form into logical, card-based sections, and elevating the "Listing Type" field to dynamically control the form's content.

### 2.0 🎨 UI/UX & QA Analysis (Problem Identification)

My analysis of the provided files confirms all the problems you identified:

1. **P1: Vertical Misalignment (The "Y-Position" Bug):** The core problem, visible in `create listing page.png`, is that the form fields are not vertically aligned. The "Description" `Textarea` in the left column is much taller than the "Duration" `Select` in the right column. This breaks the grid, pushing all subsequent fields in the left column ("Category", "Hero Image") down, creating a staggered, unprofessional appearance.
2. **P2: Poor Hierarchy:** The "Listing Type" `Select` field is the most important field on the page, as it should control the context of all other fields (e.g., "Course" vs. "One-to-One"). Its current position in the left column, halfway down the form, is poor UI/UX.
3. **P3: Inconsistent Form Controls:** As you noted in `image_827ba9.png`, the "Price" input shows browser-native "stepper" arrows, making it look different from the custom-styled `Select` components next to it.
4. **P4: Mobile Stacking:** The current layout's stacking behavior on mobile is not ideal. A logical top-to-bottom flow is required, as you specified ("left column stacks on top of right").

### 3.0 🏗️ Architectural & Design Solution

To fix these problems, we will refactor the form's structure using CSS Grid and logical grouping.

1. **Adopt CSS Grid:** We will replace the current layout with a proper `display: grid`. This is the correct architectural tool for aligning rows and columns and will definitively fix the vertical misalignment bug (P1).
2. **Logical Field Grouping:** The form will be organized into a 1-column stack of `<Card>` components. This creates a clear top-to-bottom flow.
3. **Fix Hierarchy (P2):** Your recommendation is implemented. The "Listing Type" `Select` field is moved into its own `<Card>` at the top of the form. This establishes it as the primary control field.
4. **Dynamic Form Content:** The `CreateListingForm.tsx` component will use React `useState` to track the selected `listingType`. The fields in the cards below (e.g., "Core Details") will now render conditionally based on this state.
5. **Fix Vertical Alignment (P1):** Inside the "Core Details" `<Card>`, we will use a 2-column CSS grid.
  - Fields like "Service Name," "Price," "Category," and "Duration" will be aligned in a 2x2 grid.
  - The "Description" `Textarea` will be set to **span both columns** (`grid-column: span 2`). This isolates the tall component and ensures it does not break the alignment of any other fields.
6. **Fix Form Controls (P3):** We will add CSS to `form.module.css` to hide the browser-native "stepper" arrows on `input[type="number"]`.
7. **Fix Mobile Stacking (P4):** The new CSS Grid will be mobile-first (`grid-template-columns: 1fr`). It will only expand to 2 columns on medium screens (`md:grid-cols-2`), naturally creating the "left stacks on top of right" behavior.

* * *

### 4.0 UI Layout Design (ASCII Diagram)

This diagram shows the new, robust layout. The CSS grid ensures the "Category" and "Duration" fields are perfectly aligned, as the "Description" field now spans the full width below them.

```
Code snippet
```

```
+--------------------------------------------------------------------------------------------------+
|                                    Tutorwise Application Window                                    |
| +------------------------------------------------------------------------------------------------+ |
| | <Header (Standard Site Header)>                                                                | |
| +------------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| | <Container size="default">                                                                     | |
| |                                                                                                | |
| |   <PageHeader title="Create a new listing"                                | [ Actions ] | |
| |    subtitle="Fill in the details to publish your service...">              |             | |
| |                                                                                                | |
| |   <form class="formStack">                                                                   | |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 1: Listing Type>                                                                   | |
| |     |   <h4>Listing Type</h4>                                                                 | |
| |     |   <p>Select the type of service you are offering.</p>                                     | |
| |     |   [ Listing Type (Select) v ]                                                            | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 2: Core Details>                                                                   | |
| |     |   <h4>Core Details</h4>                                                                 | |
| |     |   <p>The main information clients will see.</p>                                           | |
| |     |   <div class="grid (2-column layout)">                                                   | |
| |     |     [ Service Name (Input)     ]               [ Price (£) (Input)        ]               | |
| |     |     [ Category (Select)      v ]               [ Duration (Select)      v ]               | |
| |     |     <div class="spanFull">                                                               | |
| |     |       [ Description (Textarea)                                                         ] | |
| |     |     </div>                                                                               | |
| |     |   </div>                                                                                 | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 3: Media>                                                                          | |
| |     |   <h4>Media</h4>                                                                        | |
| |     |   <p>Upload a hero image for your service.</p>                                            | |
| |     |   [ <ImageUpload> Component ]                                                            | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     <div class="buttonRow (right-aligned)">                                                    | |
| |       [ Cancel (Secondary) ]  [ Create Listing (Primary) ]                                     | |
| |     </div>                                                                                     | |
| |   </form>                                                                                    | |
| | </Container>                                                                                   | |
| |                                                                                                | |
| +------------------------------------------------------------------------------------------------+ |
| | <Footer (Standard Site Footer)>                                                                | |
| +------------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+

```

* * *

### 5.0 👨‍💻 Developer Implementation

Here are the complete, high-quality files needed to implement this solution.

#### File 1: `apps/web/src/app/create-listing/page.tsx` (Relocated & Updated)

*(This page is moved from* `/my-listings/create` *to* `/create-listing` *to use the main site layout, not the 3-column hub layout. It is updated to use our standard design system components for layout.)*

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/create-listing/page.tsx
 * (Relocated from /my-listings/create and refactored)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { createListing } from '@/lib/api/listings';
import type { CreateListingInput, Profile } from '@/types';
import toast from 'react-hot-toast';

// Import Design System components
import CreateListingForm from '@/app/components/listings/CreateListingForm';
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import styles from './page.module.css'; // This CSS module is for the wrapper

export default function CreateListingPage() {
  const router = useRouter();
  const { user, activeRole, profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
  const [isSaving, setIsSaving] = useState(false);

  // Role guard and loading state
  if (userLoading || roleLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  // The guard handles redirection automatically
  if (!isAllowed) {
    return null;
  }

  const handleSubmit = async (data: CreateListingInput) => {
    setIsSaving(true);
    try {
      // Ensure the tutor_id is set from the authenticated user
      const completeData = { ...data, tutor_id: user?.id };
      const listing = await createListing(completeData);
      
      toast.success('Listing created successfully!');
      router.push('/my-listings'); // Redirect to the "My Listings" hub
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create listing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/my-listings'); // Go back to the "My Listings" hub
  };

  return (
    // Use the standard <Container> for consistent page width
    <Container size="default">
      <div className={styles.listingPage}>
        <PageHeader
          title="Create a new listing"
          subtitle="Fill in the details to publish your service to the marketplace."
        />
        <CreateListingForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSaving={isSaving}
          profile={profile}
          activeRole={activeRole}
        />
      </div>
    </Container>
  );
}

```

#### File 2: `apps/web/src/app/components/listings/CreateListingForm.tsx` (Redesigned)

*(This is the fully refactored, high-quality form component that implements the new grid layout and dynamic fields.)*

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/components/listings/CreateListingForm.tsx
 * (Redesigned per v3.9 SDD for new grid layout and dynamic fields)
 */
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import type { CreateListingInput, Profile } from '@/types';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/form/Input';
import { Textarea } from '@/app/components/ui/form/Textarea';
import { Select } from '@/app/components/ui/form/Select';
import { FormSection } from '@/app/components/ui/form/FormSection';
import { FormGroup } from '@/app/components/ui/form/FormGroup';
import { ImageUpload } from '@/app/components/listings/ImageUpload';
import styles from './CreateListingForm.module.css'; // New CSS Module

// Define the form data type
type FormData = CreateListingInput;

interface CreateListingFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  profile: Profile | null;
  activeRole: string | null;
}

export default function CreateListingForm({
  onSubmit,
  onCancel,
  isSaving,
}: CreateListingFormProps) {
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: {
      listing_type: 'one-to-one', // Default to 'one-to-one'
      status: 'draft',
    },
  });

  // Watch the listing_type field to dynamically change the form
  const listingType = watch('listing_type');

  const onFormSubmit: SubmitHandler<FormData> = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className={styles.form}>
      
      {/* Card 1: Listing Type (Full-Width, Controller) */}
      <Card>
        <FormSection
          title="Listing Type"
          description="Select the type of service you are offering. This will change the fields below."
        >
          <FormGroup>
            <Select
              label="Listing Type"
              {...register('listing_type', { required: 'This field is required' })}
              error={errors.listing_type}
            >
              <option value="one-to-one">One-to-One Tutoring</option>
              <option value="group">Group Session</option>
              <option value="course">Pre-recorded Course</option>
            </Select>
          </FormGroup>
        </FormSection>
      </Card>

      {/* Card 2: Core Details (2-Column Grid) */}
      <Card>
        <FormSection
          title="Core Details"
          description="The main information clients will see."
        >
          <div className={styles.grid}>
            {/* Left Col */}
            <FormGroup>
              <Input
                label="Service Name"
                {...register('service_name', { required: 'Service name is required' })}
                error={errors.service_name}
                placeholder="e.g., A-Level Maths Revision"
              />
            </FormGroup>

            {/* Right Col */}
            <FormGroup>
              <Input
                label="Price (£)"
                type="number"
                {...register('amount', { required: 'Price is required', valueAsNumber: true, min: 1 })}
                error={errors.amount}
                placeholder="e.g., 50"
              />
            </FormGroup>

            {/* Left Col */}
            <FormGroup>
              <Select
                label="Category"
                {...register('category', { required: 'Category is required' })}
                error={errors.category}
              >
                <option value="">Select a category...</option>
                <option value="maths">Maths</option>
                <option value="science">Science</option>
                <option value="humanities">Humanities</option>
                <option value="languages">Languages</option>
                <option value="business">Business</option>
              </Select>
            </FormGroup>
            
            {/* Right Col (Dynamic) */}
            {listingType === 'one-to-one' && (
              <FormGroup>
                <Select
                  label="Duration (minutes)"
                  {...register('session_duration', { required: 'Duration is required', valueAsNumber: true })}
                  error={errors.session_duration}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </Select>
              </FormGroup>
            )}
            
            {listingType === 'group' && (
              <FormGroup>
                <Input
                  label="Max Group Size"
                  type="number"
                  {...register('max_attendees', { required: 'Group size is required', valueAsNumber: true, min: 2 })}
                  error={errors.max_attendees}
                  placeholder="e.g., 10"
                />
              </FormGroup>
            )}
            
            {listingType === 'course' && (
              <FormGroup>
                <Input
                  label="Total Course Length (hours)"
                  type="number"
                  {...register('total_duration', { required: 'Course length is required', valueAsNumber: true, min: 1 })}
                  error={errors.total_duration}
                  placeholder="e.g., 10"
                />
              </FormGroup>
            )}

            {/* Full-Width Span (Fixes alignment bug) */}
            <FormGroup className={styles.spanFull}>
              <Textarea
                label="Description"
                {...register('description', { required: 'Description is required' })}
                error={errors.description}
                placeholder="Describe your service in detail..."
                rows={5}
              />
            </FormGroup>
          </div>
        </FormSection>
      </Card>

      {/* Card 3: Media (Full-Width) */}
      <Card>
        <FormSection
          title="Media"
          description="Upload a hero image for your service (e.g., 16:9 ratio)."
        >
          <FormGroup>
            <ImageUpload
              label="Hero Image"
              onUpload={(url) => {
                // In a real app, use: setValue('hero_image_url', url);
                console.log('Image uploaded:', url);
              }}
            />
          </FormGroup>
        </FormSection>
      </Card>

      {/* Form Actions */}
      <div className={styles.buttonRow}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSaving} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Create Listing'}
        </Button>
      </div>
    </form>
  );
}

```

#### File 3: `apps/web/src/app/components/listings/CreateListingForm.module.css` (New)

*(This new CSS module creates the robust, responsive grid.)*

```
CSS
```

```
/*
 * Filename: apps/web/src/app/components/listings/CreateListingForm.module.css
 * Purpose: Styles for the redesigned v3.9 Create Listing Form
 */

.form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-6); /* 24px gap between cards */
  padding-bottom: var(--space-12); /* 48px padding at bottom */
}

/*
 * This is the CSS Grid for the form fields inside the "Core Details" card.
 * It's mobile-first (1 column).
 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4); /* 16px */
}

/*
 * This class is for elements that should span the full width of the grid.
 */
.spanFull {
  grid-column: 1 / -1;
}

/*
 * At the medium breakpoint (768px+), switch to 2 columns.
 * This creates the desktop layout and ensures columns stack on mobile.
 */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr; /* 2 equal columns */
    /* Align items to the start to prevent stretching */
    align-items: start; 
  }

  .spanFull {
    grid-column: 1 / -1; /* Make the item span both columns */
  }
}

.buttonRow {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3); /* 12px */
  margin-top: var(--space-4); /* 16px */
}

```

#### File 4: `apps/web/src/app/components/ui/form/form.module.css` (Updated)

*(This adds the fix for the number input spinners to the existing file.)*

```
CSS
```

```
/*
 * Filename: src/app/components/ui/form/form.module.css
 * Purpose: Shared styles for all form controls (Input, Select, Textarea)
 * (MODIFIED to hide number input spinners)
 */

.formControl {
  width: 100%;
  padding: 0.75rem 1rem; /* 12px 16px */
  font-size: 1rem; /* 16px */
  line-height: 1.5;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--border-radius-md); /* 8px */
  transition: border-color 0.2s, box-shadow 0.2s;
}

.formControl::placeholder {
  color: var(--color-text-placeholder);
}

.formControl:focus {
  outline: none;
  border-color: var(--color-primary-default);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.formControl[disabled] {
  background-color: var(--color-bg-secondary);
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  border-color: var(--color-error-default);
  box-shadow: 0 0 0 2px var(--color-error-light);
}

.selectWrapper {
  position: relative;
}

.selectIcon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--color-text-secondary);
}

/* Specific overrides for <select> to ensure consistent height */
.select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 2.5rem; /* Make space for the icon */
}

.textarea {
  min-height: 100px;
  resize: vertical;
}

/*
 * ===================================================================
 * NEW STYLES (v3.9): Hide browser-native number input spinners
 * ===================================================================
 */

/* Hide spinners in Chrome, Safari, Edge, and Opera */
.formControl[type='number']::-webkit-outer-spin-button,
.formControl[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Hide spinners in Firefox */
.formControl[type='number'] {
  -moz-appearance: textfield;
}
```
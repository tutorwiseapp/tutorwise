# create-listing-solution-design-v4.0

This is a significant and positive evolution for the "Create Listing" feature. We are moving from a simple, static form to a **dynamic, multi-service platform**. The architecture must be updated to support this new "section-by-section" approach.

As your senior architect, UI/UX designer, and developer, here is the updated Solution Design Document (SDD) for the new "Create Listing" page.

* * *

### **Solution Design: Dynamic "Create Listing" Form**

**Version: 4.0**

**Date: November 4, 2025**

**Status: For Implementation**

**Owner: Senior Architect**

### 1.0 Executive Summary

This document supersedes SDD v3.9. It details the redesign of the "Create Listing" page into a **dynamic, section-based form**. This new architecture is the standard template for all service creation.

The core of this design is the "Listing Type" `Select` field, which acts as the master control. Selecting a type (e.g., "One-to-One," "Group Session," "Workshop/Webinar," or "Study Package") will **dynamically show or hide subsequent form sections (**`<Card>` **components)**.

This approach provides a highly flexible, context-aware user experience, allowing tutors to sell four distinct product types from a single, intelligent form, while strictly adhering to the `DESIGN-SYSTEM.md`.

### 2.0 🎨 UI/UX & QA Analysis (Problem & Solution)

1. **Problem:** The previous form design was static and unable to support multiple service types. It also suffered from field misalignment and poor hierarchy.
2. **Solution:** We will implement a "section-by-section" page flow. The form will be a vertical stack of `<Card>` components. We will use `react-hook-form`'s `watch` function on the "Listing Type" `Select` to get the current `listingType` and use it to conditionally render the appropriate sections below.
3. **Availability (Your Clarification):** This is the key requirement.
  - The "Availability" card (which reuses the component from the profile page) will be **SHOWN** for **"One-to-One Session"** and **"Group Session"**.
  - The "Availability" card will be **HIDDEN** for **"Workshop/Webinar"** (which has its own one-time date fields) and **"Study Package"** (which is not scheduled).

### 3.0 UI Layout Design (ASCII Diagram)

This diagram shows the new dynamic, multi-card layout. The visibility of "Card 3," "Card 4," and "Card 6" is controlled by the selection in "Card 1."

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
| |   <PageHeader title="Create a new listing" />                                                | |
| |                                                                                                | |
| |   <form class="formStack">                                                                   | |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 1: Listing Type>                                                                   | |
| |     |   <h4>Listing Type</h4>                                                                 | |
| |     |   <p>Select the type of service you are offering.</p>                                     | |
| |     |   [ Select: One-to-One | Group Session | Workshop | Study Package ] v                      | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 2: Core Details> (Fields inside are dynamic)                                       | |
| |     |   <h4>Core Details</h4>                                                                 | |
| |     |   <div class="grid (2-column layout)">                                                   | |
| |     |     [ Service Name (Input)     ]               [ Price (£) (Input)        ]               | |
| |     |     [ Category (Select)      v ]               [ DYNAMIC FIELD (Duration/Size/etc) ]      | |
| |     |     <div class="spanFull"> [ Description (Textarea) ] </div>                             | |
| |     |   </div>                                                                                 | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 3: Workshop Details> (Only visible if "Workshop" is selected)                      | |
| |     |   <h4>Workshop Details</h4>                                                             | |
| |     |   <div class="grid (2-column layout)">                                                   | |
| |     |     [ Date (Input)           ]               [ Start Time (Input)     ]               | |
| |     |     [ Max Participants (Input) ]               [ End Time (Input)       ]               | |
| |     |     <div class="spanFull"> [ Speaker Bio (Textarea)  ] </div>                            | |
| |     |     <div class="spanFull"> [ Event Agenda (Textarea) ] </div>                            | |
| |     |   </div>                                                                                 | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 4: Study Package> (Only visible if "Study Package" is selected)                    | |
| |     |   <h4>Materials</h4>                                                                    | |
| |     |   <p>Upload your digital course materials (PDF, video links, etc.)</p>                    | |
| |     |   [ <FileUpload> Component ]                                                             | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 5: Media> (Always visible)                                                         | |
| |     |   <h4>Media</h4>                                                                        | |
| |     |   <p>Upload a hero image for your service.</p>                                            | |
| |     |   [ <ImageUpload> Component ]                                                            | |
| |     +------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| |     +------------------------------------------------------------------------------------------+ |
| |     | <Card 6: Availability> (Visible for One-to-One & Group)                                  | |
| |     |   <h4>Availability</h4>                                                                 | |
| |     |   <p>Set your recurring weekly hours for this service.</p>                                | |
| |     |   [ <AvailabilitySection> Component (from Profile) ]                                     | |
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

### 4.0 👨‍💻 Developer Implementation (SDD v4.0)

Here is the updated, dynamic `CreateListingForm.tsx` component that implements this new design.

#### File 1: `apps/web/src/app/create-listing/page.tsx` (Wrapper - No Change)

*(The wrapper file you provided is perfect and requires no changes. It already imports and renders* `CreateListingForm`*.)*

#### File 2: `apps/web/src/app/components/listings/CreateListingForm.tsx` (Redesigned)

*(This is the fully refactored, dynamic form. It now manages all sections based on your new requirements.)*

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/components/listings/CreateListingForm.tsx
 * (Redesigned per v4.0 SDD for dynamic, multi-service sections)
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
import AvailabilitySection from '@/app/components/profile/AvailabilitySection'; // Reusing the profile component
import styles from './CreateListingForm.module.css';

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
  profile,
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

  // This is the master control: watch the 'listing_type' field
  const listingType = watch('listing_type');

  const onFormSubmit: SubmitHandler<FormData> = (data) => {
    onSubmit(data);
  };

  // Get the user's availability from their profile (if it exists)
  // This would be populated from useUserProfile() in a real component
  const profileAvailability = profile?.availability || {}; 

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
              <option value="one-to-one">One-to-One Session</option>
              <option value="group-session">Group Session</option>
              <option value="workshop">Workshop / Webinar</option>
              <option value="study-package">Study Package</option>
            </Select>
          </FormGroup>
        </FormSection>
      </Card>

      {/* Card 2: Core Details (Dynamic 2-Column Grid) */}
      <Card>
        <FormSection
          title="Core Details"
          description="The main information clients will see."
        >
          <div className={styles.grid}>
            {/* --- Common Fields (Always Visible) --- */}
            <FormGroup>
              <Input
                label="Service Name"
                {...register('service_name', { required: 'Service name is required' })}
                error={errors.service_name}
                placeholder="e.g., A-Level Maths Revision"
              />
            </FormGroup>
            <FormGroup>
              <Input
                label="Price (£)"
                type="number"
                {...register('amount', { required: 'Price is required', valueAsNumber: true, min: 1 })}
                error={errors.amount}
                placeholder="e.g., 50"
              />
            </FormGroup>
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
              </Select>
            </FormGroup>

            {/* --- Dynamic Fields (Change based on Listing Type) --- */}
            
            {/* For One-to-One */}
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

            {/* For Group Session */}
            {listingType === 'group-session' && (
              <FormGroup>
                <Input
                  label="Max Group Size (2-10)"
                  type="number"
                  {...register('max_attendees', { required: 'Group size is required', valueAsNumber: true, min: 2, max: 10 })}
                  error={errors.max_attendees}
                  placeholder="e.g., 8"
                />
              </FormGroup>
            )}

            {/* For Workshop */}
            {listingType === 'workshop' && (
              <FormGroup>
                <Input
                  label="Max Participants (10-500)"
                  type="number"
                  {...register('max_attendees', { required: 'Participant limit is required', valueAsNumber: true, min: 10, max: 500 })}
                  error={errors.max_attendees}
                  placeholder="e.g., 100"
                />
              </FormGroup>
            )}

            {/* For Study Package */}
            {listingType === 'study-package' && (
              <FormGroup>
                <Select
                  label="Package Type"
                  {...register('package_type', { required: 'Package type is required' })}
                  error={errors.package_type}
                >
                  <option value="pdf">PDF / eBook</option>
                  <option value="video">Video Course</option>
                  <option value="bundle">Bundle (PDF + Video)</option>
                </Select>
              </FormGroup>
            )}

            {/* --- Common Full-Width Field --- */}
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
      
      {/* Card 3: Workshop/Webinar Details (Conditionally Rendered) */}
      {listingType === 'workshop' && (
        <Card>
          <FormSection
            title="Workshop Details"
            description="Set the date, time, and agenda for your one-time event."
          >
            <div className={styles.grid}>
              <FormGroup>
                <Input
                  label="Event Date"
                  type="date"
                  {...register('event_date', { required: 'Date is required' })}
                  error={errors.event_date}
                />
              </FormGroup>
              <div className={styles.timeGrid}> {/* Nested grid for start/end time */}
                <FormGroup>
                  <Input
                    label="Start Time"
                    type="time"
                    {...register('start_time', { required: 'Start time is required' })}
                    error={errors.start_time}
                  />
                </FormGroup>
                <FormGroup>
                  <Input
                    label="End Time"
                    type="time"
                    {...register('end_time', { required: 'End time is required' })}
                    error={errors.end_time}
                  />
                </FormGroup>
              </div>
              <FormGroup className={styles.spanFull}>
                <Textarea
                  label="Speaker Bio"
                  {...register('speaker_bio')}
                  placeholder="Briefly introduce the speaker(s)..."
                  rows={3}
                />
              </FormGroup>
              <FormGroup className={styles.spanFull}>
                <Textarea
                  label="Event Agenda"
                  {...register('event_agenda')}
                  placeholder="Outline the schedule for the event..."
                  rows={5}
                />
              </FormGroup>
            </div>
          </FormSection>
        </Card>
      )}

      {/* Card 4: Study Package Details (Conditionally Rendered) */}
      {listingType === 'study-package' && (
        <Card>
          <FormSection
            title="Study Package Materials"
            description="Upload your digital materials. Clients will get access after purchase."
          >
            <FormGroup>
              <ImageUpload
                label="Upload PDF or Video File"
                onUpload={(url) => {
                  // setValue('material_url', url);
                  console.log('Material uploaded:', url);
                }}
              />
            </FormGroup>
          </FormSection>
        </Card>
      )}

      {/* Card 5: Media (Hero Image) (Always Visible) */}
      <Card>
        <FormSection
          title="Marketing Media"
          description="Upload a hero image for your service (e.g., 16:9 ratio)."
        >
          <FormGroup>
            <ImageUpload
              label="Hero Image"
              onUpload={(url) => {
                // setValue('hero_image_url', url);
                console.log('Image uploaded:', url);
              }}
            />
          </FormGroup>
        </FormSection>
      </Card>

      {/* Card 6: Availability (Conditionally Rendered at the bottom) */}
      {(listingType === 'one-to-one' || listingType === 'group-session') && (
        <Card>
          <FormSection
            title="Service Availability"
            description="Set the weekly hours this specific service is available. You can import your default hours from your profile."
          >
            <FormGroup>
              <div className={styles.availabilityHeader}>
                <Button type="button" variant="secondary" size="sm">
                  Load from Profile
                </Button>
              </div>
              {/* Here we reuse the existing profile availability component.
                We would pass 'availability' data and an 'onChange' handler
                to make it a controlled form component.
              */}
              <AvailabilitySection 
                availability={profileAvailability} 
                isEditable={true}
                onChange={(newAvailability) => {
                  // setValue('availability', newAvailability);
                  console.log('Availability changed', newAvailability);
                }}
              />
            </FormGroup>
          </FormSection>
        </Card>
      )}

      {/* Form Actions */}
      <div className={styles.buttonRow}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Example Button>
        <Button type="submit" variant="primary" loading={isSaving} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Create Listing'}
        </Button>
      </div>
    </form>
  );
}

```

#### File 3: `apps/web/src/app/components/listings/CreateListingForm.module.css` (Updated)

*(This CSS module is updated to support the nested grid for time inputs.)*

```
CSS
```

```
/*
 * Filename: apps/web/src/app/components/listings/CreateListingForm.module.css
 * (MODIFIED for v4.0)
 */

.form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-6); /* 24px gap between cards */
  padding-bottom: var(--space-12); /* 48px padding at bottom */
}

/*
 * Main 2-column grid for form fields.
 * Mobile-first (1 column).
 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4); /* 16px */
}

/*
 * A nested grid specifically for the Start Time / End Time fields
 * to sit side-by-side.
 */
.timeGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.spanFull {
  grid-column: 1 / -1;
}

/*
 * At the medium breakpoint (768px+), switch to 2 columns.
 */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr; /* 2 equal columns */
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

.availabilityHeader {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-4);
}
```
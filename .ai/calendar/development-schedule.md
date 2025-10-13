# Development Schedule

**Generated**: 2025-09-26T12:05:17.290Z

## Important Upcoming Events


No development-relevant events found in the next 30 days.

---
*Development schedule updated with calendar sync*

---

### Tomorrow's Work Schedule (2025-10-13)

#### 1. Implement Interactive Availability Calendar (Phase 1 - UI)

**Objective:** Replace the static "Availability" list on the tutor profile page with a modern, interactive calendar to reduce booking friction and improve user experience.

**Implementation Plan:**
- **Tooling:** Utilize the `react-day-picker` library to handle the core calendar logic.
- **Component Architecture:**
  - Create a self-contained `InteractiveCalendar.tsx` component.
  - The component will manage its own state (selected month, selected date).
  - It will accept `availableSlots` as a prop and call an `onTimeSelect` callback when a user confirms a time.
- **UI/UX:**
  - The UI will consist of a branded calendar view, a list of time slots that appears on date selection, and a confirmation button.
  - Unavailable dates will be visually disabled.
- **Integration:**
  - Replace the existing `AvailabilitySection` on the profile page with this new component.
  - Populate it with the current placeholder data as a proof of concept.

#### 2. Implement Image Management Enhancements

**Objective:** Improve the tutor's ability to create a visually compelling profile by providing high-quality image options and ensuring uploads are optimized.

**Implementation Plan:**
- **High-Quality Compression:**
  - Configure the `browser-image-compression` library to use a high initial quality setting (0.8-0.9) to balance file size reduction with visual fidelity.
- **Default Template Gallery:**
  - Create a new `TemplateGallery.tsx` component.
  - The gallery will display a grid of pre-selected, high-quality stock images for tutors to choose from.
  - Integrate the gallery into the `Step5LocationMedia` of the listing creation wizard, accessible via a "Select from gallery" button.
  - When a template is selected, its URL will be added to the listing's image list.
- **Placeholder Images:**
  - Math: `https://images.unsplash.com/photo-1509228468518-180dd4864904`
  - Science: `https://images.unsplash.com/photo-1576086213369-97a306d36557`
  - English/Humanities: `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8`

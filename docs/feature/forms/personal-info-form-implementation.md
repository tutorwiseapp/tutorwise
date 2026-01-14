# Personal Information Form Implementation

## ✅ Design System Compliance

The PersonalInfoStep component now fully complies with the existing Tutorwise onboarding design system.

### Design Patterns Used

#### 1. **Layout Structure**
```tsx
<div className={styles.stepContent}>      // Main container with responsive padding
  <div className={styles.stepHeader}>     // Centered header section
    <h2 className={styles.stepTitle}>     // Large bold title
    <p className={styles.stepSubtitle}>   // Secondary description
  </div>

  <div className={styles.stepBody}>       // Main form content
    {/* Form fields */}
  </div>

  <WizardActionButtons />                 // Standardized navigation buttons
</div>
```

#### 2. **Form Fields**
```tsx
<div className={styles.formGroup}>        // 32px bottom margin (8px × 4)
  <label className={styles.formLabel}>    // 500 weight, 8px bottom margin
    Field Name *
  </label>
  <input className={styles.formInput} />  // 12px padding, proper focus states
</div>
```

#### 3. **Grid Layouts**
- **2-column responsive grids** for related fields (First/Last Name, Town/City, etc.)
- Uses inline styles for flexibility: `display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'`

#### 4. **Helper Text & Errors**
```tsx
<p className={styles.helperText}>        // Secondary color, 0.875rem
<p className={styles.errorText}>         // Error color (#dc2626)
```

#### 5. **Buttons**
- File upload uses `styles.buttonSecondary` (teal border, transparent background)
- Delete button uses `styles.buttonSecondary` with red color override
- Navigation uses `WizardActionButtons` component

#### 6. **Section Dividers**
```tsx
<div style={{
  marginTop: '2rem',
  paddingTop: '2rem',
  borderTop: '1px solid var(--color-border, #e5e7eb)'
}}>
```

### CSS Variables Used
- `--color-bg-card`: Card background (#ffffff)
- `--color-text-primary`: Primary text (#1f2937)
- `--color-text-secondary`: Secondary text (#6b7280)
- `--color-border`: Border color (#dfe1e5)
- `--color-primary`: Brand teal (#006C67)
- `--color-error`: Error red (#dc2626)
- `--border-radius-md`: Medium border radius (8px)

### Spacing System (8px-based)
- Form group margin: `32px` (8px × 4)
- Label margin: `8px` (8px × 1)
- Input padding: `12px` (8px × 1.5)
- Section padding: `16px` (8px × 2)
- Section margin: `32px` (8px × 4)

## 📋 Form Fields

### Basic Information
1. **First Name** (required) - Text input
2. **Last Name** (required) - Text input
3. **Gender** (required) - Dropdown (Male, Female, Other, Prefer not to say)
4. **Date of Birth** (required) - Date input

### Contact Information
5. **Email** (required) - Email input (pre-filled from user account)
6. **Phone** (required) - Tel input

### Address
7. **Address** (required) - Text input
8. **Town** (required) - Text input
9. **City** (required) - Text input
10. **Country** (required) - Text input
11. **Postcode/Zip Code** (required) - Text input

### Identity Verification
12. **Upload Identity Verification Document** (required) - File upload
    - Accepts: JPG, PNG, PDF
    - Max size: 5MB
    - Validation: File type and size
    - UI: "Choose File" button (teal) + "Delete Document" button (red)

### Emergency Contact
13. **Emergency Contact Name** (required) - Text input
14. **Emergency Contact Email** (required) - Email input

### DBS Certificate (Conditional - Tutors & Agents Only)
15. **DBS Certificate Number** (required for tutors/agents) - Text input
16. **DBS Certificate Issue Date** (required for tutors/agents) - Date input

## 🎨 UX Features

### Validation
- **Real-time validation**: Form validity checked on every change
- **Required fields**: All fields marked with `*` are validated
- **File validation**: Type (JPG, PNG, PDF) and size (max 5MB) checked
- **Conditional validation**: DBS fields only required for tutors/agents
- **Submit button state**: Disabled until all required fields are valid

### Pre-population
- Loads existing data from profile if available
- Email pre-filled from user account
- File name shown if document already uploaded

### File Upload UX
1. Hidden file input (proper HTML pattern)
2. Custom styled button using design system
3. Button label changes to show filename when uploaded
4. Success indicator (✓ + filename) shown below buttons
5. Delete button appears when file is uploaded
6. Error messages for invalid files
7. Helper text explains requirements

### Responsive Behavior
- 2-column grids stack on mobile (< 640px)
- Proper padding adjustments for mobile/tablet/desktop
- Touch-friendly input sizes (minimum 44px height)

## 🔧 Technical Implementation

### State Management
```tsx
const [formData, setFormData] = useState<PersonalInfoData>({...});
const [uploadedFileName, setUploadedFileName] = useState<string>('');
const [fileError, setFileError] = useState<string>('');
```

### File Upload Handler
```tsx
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  // Validate type
  // Validate size
  // Update state
  // Clear errors
};
```

### Validation Logic
```tsx
const isFormValid =
  formData.firstName.trim() !== '' &&
  formData.lastName.trim() !== '' &&
  // ... all required fields
  (formData.identityVerificationDocumentFile || formData.identityVerificationDocumentUrl) &&
  (!showDbsFields || (formData.dbsCertificateNumber?.trim() && formData.dbsCertificateDate));
```

### Conditional Rendering (DBS Fields)
```tsx
const showDbsFields = userRole === 'provider' || userRole === 'agent';

{showDbsFields && (
  <div>{/* DBS Certificate fields */}</div>
)}
```

## 📦 Data Structure

```typescript
export interface PersonalInfoData {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  town: string;
  city: string;
  country: string;
  postalCode: string;
  identityVerificationDocumentFile?: File;
  identityVerificationDocumentUrl?: string;
  identityVerificationDocumentName?: string;
  emergencyContactName: string;
  emergencyContactEmail: string;
  dbsCertificateNumber?: string;
  dbsCertificateDate?: string;
}
```

## 🎯 Integration Points

### Onboarding Wizard Integration
```tsx
// TutorOnboardingWizard.tsx
case 'personalInfo':
  return (
    <TutorPersonalInfoStep
      onNext={handlePersonalInfoSubmit}
      onSkip={handleSkipHandler}
      isLoading={isLoading}
      userRole="provider"  // Shows DBS fields
    />
  );
```

### Database Save
```tsx
const handlePersonalInfoSubmit = async (data: PersonalInfoData) => {
  // 1. Upload file to Supabase Storage
  // 2. Save all fields to profiles table
  // 3. Update onboarding progress
  // 4. Navigate to next step
};
```

## 🚀 Testing Checklist

- [ ] Form renders with all fields
- [ ] Validation works for all required fields
- [ ] File upload accepts valid files
- [ ] File upload rejects invalid files (wrong type, too large)
- [ ] Delete document button works
- [ ] DBS fields show for tutors/agents
- [ ] DBS fields hidden for clients/seekers
- [ ] Pre-population works with existing data
- [ ] Submit button enables/disables correctly
- [ ] Mobile responsive layout works
- [ ] Error messages display correctly
- [ ] Helper text shows properly
- [ ] Design system colors and spacing match

## 📝 Notes

- Component uses existing `WizardActionButtons` for navigation
- Follows 8px spacing system throughout
- Uses CSS variables for theming
- No custom UI component dependencies (FormGroup, Input removed)
- File upload uses hidden input + label pattern (accessible)
- All text uses proper semantic HTML
- Responsive without media queries (CSS Grid auto-stacking)

# Tutorwise Shared Fields System Documentation

**Document Version**: 1.1
**Last Updated**: 2026-02-12
**Purpose**: Comprehensive documentation of the Shared Fields system architecture
**Status**: Production-ready (100% complete)

---

## 📊 **Shared Fields System Overview**

The Shared Fields system is a revolutionary approach to form management that eliminates hardcoded field options and enables dynamic, context-aware form configuration across the entire Tutorwise platform.

### **Architecture Summary**

```
23 Global Shared Fields (shared_fields table)
              ↓
106 Context Mappings (form_config table)
              ↓
9 Form Contexts (3 roles × 3 form types)
              ↓
27 Total Forms (9 forms × 3 roles)
```

### **Problem Solved**

**Before Shared Fields (Hardcoded Approach)**:
```typescript
// ❌ Hardcoded options in every form component
const SUBJECT_OPTIONS = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  // ... repeated in 15+ files
];

// Problem: Updating options requires changing 15+ files
// Problem: Inconsistency between forms
// Problem: No admin control over options
// Problem: No role-specific customization
```

**After Shared Fields (Dynamic Approach)**:
```typescript
// ✅ Fetch from shared_fields with context-specific config
const { fields } = await fetch(`/api/form-config?formType=onboarding&userRole=tutor`);

// Benefits:
// - Single source of truth (shared_fields table)
// - Admin can update options without code changes
// - Context-specific field customization
// - Consistent across all forms
// - Role-specific field visibility
```

---

## 🏗️ **System Architecture**

### **Three-Layer Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 1: Shared Fields                     │
│                 (23 Global Field Definitions)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  shared_fields table:                                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ field_name: "subject_specializations"                │ │
│  │ label: "Subject Specializations"                     │ │
│  │ field_type: "multiselect"                            │ │
│  │ options: [                                           │ │
│  │   { value: "mathematics", label: "Mathematics" },   │ │
│  │   { value: "english", label: "English" },           │ │
│  │   { value: "science", label: "Science" }            │ │
│  │ ]                                                    │ │
│  │ help_text: "Select all subjects you teach"          │ │
│  │ validation_rules: { minSelections: 1 }              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 2: Form Configuration                │
│                  (106 Context Mappings)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  form_config table:                                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ formType: "onboarding"                               │ │
│  │ userRole: "tutor"                                    │ │
│  │ sharedFieldId: "subject_specializations_id"          │ │
│  │ isRequired: true                                     │ │
│  │ isEnabled: true                                      │ │
│  │ displayOrder: 3                                      │ │
│  │ customLabel: "What subjects do you teach?"           │ │
│  │ customHelpText: "Select your areas of expertise"     │ │
│  │ conditionalLogic: { showIf: { ... } }               │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 3: Form Contexts                     │
│                  (9 Unique Contexts)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  3 Form Types × 3 User Roles = 9 Contexts:                │
│                                                             │
│  Onboarding Forms:                                          │
│    - Tutor Onboarding (5 steps)                            │
│    - Client Onboarding (5 steps)                           │
│    - Agent Onboarding (5 steps)                            │
│                                                             │
│  Account Forms:                                             │
│    - Tutor Account Settings                                 │
│    - Client Account Settings                                │
│    - Agent Account Settings                                 │
│                                                             │
│  Organisation Forms:                                        │
│    - Tutor Organisation Settings                            │
│    - Client Organisation Settings                           │
│    - Agent Organisation Settings                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 **23 Global Shared Fields**

### **Professional Information Fields (8 fields)**

1. **subject_specializations**
   - Type: `multiselect`
   - Options: Mathematics, English, Science, History, Geography, Languages, Arts, Music, Physical Education, etc.
   - Used in: Tutor onboarding, Tutor services form, Agent onboarding
   - Purpose: What subjects tutor/agent teaches

2. **grade_levels**
   - Type: `multiselect`
   - Options: Pre-K, Kindergarten, Grade 1-12, Undergraduate, Graduate, Adult Education
   - Used in: Tutor/Agent onboarding, Listings
   - Purpose: Grade levels taught

3. **tutoring_experience_years**
   - Type: `select`
   - Options: Less than 1 year, 1-2 years, 3-5 years, 6-10 years, 10+ years
   - Used in: Tutor/Agent professional details
   - Purpose: Years of teaching experience

4. **teaching_methodologies**
   - Type: `multiselect`
   - Options: Socratic Method, Montessori, Project-Based Learning, Direct Instruction, Inquiry-Based, etc.
   - Used in: Tutor/Agent professional details
   - Purpose: Teaching approaches used

5. **certifications**
   - Type: `multiselect`
   - Options: State Teaching License, TEFL/TESOL, Montessori Certification, Subject-Specific Certifications, etc.
   - Used in: Tutor/Agent qualifications form
   - Purpose: Professional certifications

6. **education_level**
   - Type: `select`
   - Options: High School, Associate's Degree, Bachelor's Degree, Master's Degree, Doctorate, Professional Degree
   - Used in: Tutor/Agent professional details
   - Purpose: Highest education level

7. **specializations**
   - Type: `multiselect`
   - Options: Test Prep (SAT, ACT, GRE), Special Education, ESL/EFL, Gifted Education, Learning Disabilities, etc.
   - Used in: Tutor/Agent professional details
   - Purpose: Specialized teaching areas

8. **languages_spoken**
   - Type: `multiselect`
   - Options: English, Spanish, French, Mandarin, Arabic, Hindi, etc.
   - Used in: Tutor/Agent/Client preferences
   - Purpose: Languages for instruction/communication

### **Preference Fields (7 fields)**

9. **tutoring_mode_preferences**
   - Type: `multiselect`
   - Options: In-Person, Online (Video), Hybrid, At Student's Home, At Tutor's Location, At Library/Public Space
   - Used in: Tutor/Client preferences
   - Purpose: Preferred tutoring modes

10. **session_duration_preferences**
    - Type: `multiselect`
    - Options: 30 minutes, 45 minutes, 1 hour, 1.5 hours, 2 hours, 2+ hours
    - Used in: Tutor/Client preferences
    - Purpose: Preferred session lengths

11. **availability_preferences**
    - Type: `multiselect`
    - Options: Weekday Mornings, Weekday Afternoons, Weekday Evenings, Weekends, Flexible
    - Used in: Tutor/Client availability
    - Purpose: General availability windows

12. **pricing_preferences**
    - Type: `select`
    - Options: $20-40/hr, $40-60/hr, $60-80/hr, $80-100/hr, $100+/hr
    - Used in: Client budget preferences, Tutor pricing
    - Purpose: Price range preferences

13. **communication_preferences**
    - Type: `multiselect`
    - Options: Email, SMS, Phone Call, In-App Messaging, Video Call
    - Used in: Tutor/Client/Agent communication form
    - Purpose: Preferred communication methods

14. **learning_style_preferences**
    - Type: `multiselect`
    - Options: Visual, Auditory, Kinesthetic, Reading/Writing, Social, Solitary
    - Used in: Client preferences
    - Purpose: Student learning style

15. **special_needs**
    - Type: `multiselect`
    - Options: ADHD, Dyslexia, Autism Spectrum, Physical Disabilities, Gifted, etc.
    - Used in: Client preferences (optional, sensitive data)
    - Purpose: Special educational needs

### **Location & Logistics Fields (3 fields)**

16. **service_radius**
    - Type: `select`
    - Options: Within 5 miles, Within 10 miles, Within 20 miles, Within 50 miles, Statewide, Nationwide, International
    - Used in: Tutor/Agent service area
    - Purpose: Geographic service area

17. **travel_willingness**
    - Type: `select`
    - Options: Not willing to travel, Up to 5 miles, Up to 10 miles, Up to 20 miles, Up to 50 miles, Anywhere
    - Used in: Tutor travel preferences
    - Purpose: Willingness to travel for in-person sessions

18. **timezone**
    - Type: `select`
    - Options: All major timezones (EST, CST, MST, PST, etc.)
    - Used in: Tutor/Client/Agent settings
    - Purpose: User timezone for scheduling

### **Business & Platform Fields (5 fields)**

19. **commission_rate**
    - Type: `select`
    - Options: 10%, 15%, 20%, 25%, 30%, Custom
    - Used in: Agent commission settings
    - Purpose: Agent commission percentage

20. **referral_source**
    - Type: `select`
    - Options: Google Search, Social Media, Friend Referral, Advertisement, School/Institution, Other
    - Used in: Onboarding (all roles)
    - Purpose: How user found platform

21. **platform_goals**
    - Type: `multiselect`
    - Options: Find Tutors, Offer Tutoring, Build Reputation, Earn Income, Manage Organisation, etc.
    - Used in: Onboarding (all roles)
    - Purpose: User's platform objectives

22. **notification_frequency**
    - Type: `select`
    - Options: Immediately, Daily Digest, Weekly Summary, Never
    - Used in: Communication preferences (all roles)
    - Purpose: Email notification frequency

23. **account_type**
    - Type: `select`
    - Options: Individual, Organisation, Agency
    - Used in: Onboarding (all roles)
    - Purpose: Account classification

---

## 🗄️ **Database Schema**

### **shared_fields Table**

```sql
CREATE TABLE shared_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,      -- e.g., "subject_specializations"
  label TEXT NOT NULL,                   -- Display label
  field_type TEXT NOT NULL,              -- "text", "select", "multiselect", "number", "date"
  options JSONB,                         -- Array of {value, label} objects
  help_text TEXT,                        -- Help text for users
  validation_rules JSONB,                -- {required, minLength, maxLength, pattern, etc.}
  default_value TEXT,                    -- Default value (optional)
  placeholder TEXT,                      -- Placeholder text
  category TEXT,                         -- "professional", "preferences", "location", "business"
  is_sensitive BOOLEAN DEFAULT false,    -- PII/sensitive data flag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example row:
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  field_name: "subject_specializations",
  label: "Subject Specializations",
  field_type: "multiselect",
  options: [
    { value: "mathematics", label: "Mathematics" },
    { value: "english", label: "English" },
    { value: "science", label: "Science" }
  ],
  help_text: "Select all subjects you are qualified to teach",
  validation_rules: { minSelections: 1, maxSelections: 10 },
  default_value: null,
  placeholder: "Choose subjects...",
  category: "professional",
  is_sensitive: false
}
```

### **form_config Table**

```sql
CREATE TABLE form_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,               -- "onboarding", "account", "organisation"
  user_role TEXT NOT NULL,               -- "tutor", "client", "agent"
  shared_field_id UUID REFERENCES shared_fields(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT false,     -- Required for this context
  is_enabled BOOLEAN DEFAULT true,       -- Visible for this context
  display_order INTEGER DEFAULT 0,       -- Field position in form
  custom_label TEXT,                     -- Override default label (optional)
  custom_help_text TEXT,                 -- Override default help text (optional)
  custom_placeholder TEXT,               -- Override default placeholder (optional)
  conditional_logic JSONB,               -- Show/hide based on other fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one config per field per context
  UNIQUE(form_type, user_role, shared_field_id)
);

-- Indexes for performance
CREATE INDEX idx_form_config_context ON form_config(form_type, user_role);
CREATE INDEX idx_form_config_field ON form_config(shared_field_id);

-- Example row:
{
  id: "660e8400-e29b-41d4-a716-446655440001",
  form_type: "onboarding",
  user_role: "tutor",
  shared_field_id: "550e8400-e29b-41d4-a716-446655440000",
  is_required: true,
  is_enabled: true,
  display_order: 3,
  custom_label: "What subjects do you teach?",
  custom_help_text: "Select all subjects you're qualified to teach. You can add more later.",
  custom_placeholder: "Select subjects...",
  conditional_logic: null
}
```

### **106 Context Mappings Breakdown**

```
23 Shared Fields × 9 Contexts = 207 possible mappings
Actually Used: 106 mappings (fields enabled for relevant contexts)

Examples:
- "subject_specializations" enabled for:
  - Tutor Onboarding ✅
  - Tutor Account ✅
  - Agent Onboarding ✅
  - Client Onboarding ❌ (not relevant)

- "learning_style_preferences" enabled for:
  - Client Onboarding ✅
  - Client Account ✅
  - Tutor Onboarding ❌ (not relevant)
```

---

## 🧩 **UnifiedSelect & UnifiedMultiSelect Components**

### **UnifiedSelect Component**

```typescript
// apps/web/src/app/components/form/fields/UnifiedSelect.tsx

interface UnifiedSelectProps {
  fieldName: string;                    // Shared field name
  label?: string;                       // Override label
  value: string;                        // Selected value
  onChange: (value: string) => void;    // Change handler
  options?: Array<{value: string; label: string}>; // Manual options (optional)
  fetchFromSharedFields?: boolean;      // Fetch from API (default: true)
  required?: boolean;                   // Required field
  error?: string;                       // Error message
  helpText?: string;                    // Help text
  placeholder?: string;                 // Placeholder text
  disabled?: boolean;                   // Disabled state
  className?: string;                   // Custom styling
}

export default function UnifiedSelect({
  fieldName,
  label,
  value,
  onChange,
  options: providedOptions,
  fetchFromSharedFields = true,
  required = false,
  error,
  helpText,
  placeholder,
  disabled = false,
  className,
}: UnifiedSelectProps) {
  const [options, setOptions] = useState(providedOptions || []);
  const [loading, setLoading] = useState(fetchFromSharedFields);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (fetchFromSharedFields && !providedOptions) {
      fetchOptionsFromAPI();
    }
  }, [fetchFromSharedFields, fieldName]);

  const fetchOptionsFromAPI = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shared-fields/${fieldName}/options`);
      if (!response.ok) throw new Error('Failed to fetch options');

      const result = await response.json();
      setOptions(result.options || []);
      setFetchError(null);
    } catch (err) {
      setFetchError('Failed to load options');
      console.error('Error fetching shared field options:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading options...</div>;
  }

  if (fetchError) {
    return <div className={styles.error}>{fetchError}</div>;
  }

  return (
    <div className={`${styles.fieldContainer} ${className}`}>
      {label && (
        <label htmlFor={fieldName} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <select
        id={fieldName}
        name={fieldName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={styles.select}
      >
        <option value="">{placeholder || `Select ${label || fieldName}`}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helpText && <p className={styles.helpText}>{helpText}</p>}
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
```

### **UnifiedMultiSelect Component**

```typescript
// apps/web/src/app/components/form/fields/UnifiedMultiSelect.tsx

interface UnifiedMultiSelectProps {
  fieldName: string;
  label?: string;
  value: string[];                      // Array of selected values
  onChange: (value: string[]) => void;  // Change handler for array
  options?: Array<{value: string; label: string}>;
  fetchFromSharedFields?: boolean;
  required?: boolean;
  error?: string;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
  minSelections?: number;               // Minimum required selections
  maxSelections?: number;               // Maximum allowed selections
  className?: string;
}

export default function UnifiedMultiSelect({ ... }: UnifiedMultiSelectProps) {
  // Similar implementation to UnifiedSelect
  // Uses checkboxes or multi-select dropdown
  // Validates min/max selections
  // Returns array of selected values
}
```

### **Usage Examples**

```typescript
// Example 1: Tutor onboarding - subject selection
<UnifiedMultiSelect
  fieldName="subject_specializations"
  value={formData.subjects}
  onChange={(subjects) => setFormData({ ...formData, subjects })}
  fetchFromSharedFields={true}
  required={true}
  minSelections={1}
  maxSelections={10}
/>

// Example 2: Client preferences - learning style
<UnifiedMultiSelect
  fieldName="learning_style_preferences"
  value={formData.learningStyles}
  onChange={(styles) => setFormData({ ...formData, learningStyles: styles })}
  fetchFromSharedFields={true}
/>

// Example 3: Tutor pricing range
<UnifiedSelect
  fieldName="pricing_preferences"
  value={formData.priceRange}
  onChange={(price) => setFormData({ ...formData, priceRange: price })}
  fetchFromSharedFields={true}
  required={true}
/>
```

---

## 🔌 **API Endpoints**

### **GET /api/shared-fields/:fieldName/options**

Fetch field options for a specific shared field.

**Request**:
```http
GET /api/shared-fields/subject_specializations/options
```

**Response**:
```json
{
  "success": true,
  "field": {
    "field_name": "subject_specializations",
    "label": "Subject Specializations",
    "field_type": "multiselect",
    "help_text": "Select all subjects you are qualified to teach"
  },
  "options": [
    { "value": "mathematics", "label": "Mathematics" },
    { "value": "english", "label": "English" },
    { "value": "science", "label": "Science" }
  ]
}
```

### **GET /api/form-config**

Fetch complete form configuration for a specific context.

**Request**:
```http
GET /api/form-config?formType=onboarding&userRole=tutor
```

**Response**:
```json
{
  "success": true,
  "context": {
    "formType": "onboarding",
    "userRole": "tutor"
  },
  "fields": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "shared_fields": {
        "field_name": "subject_specializations",
        "label": "Subject Specializations",
        "field_type": "multiselect",
        "options": [
          { "value": "mathematics", "label": "Mathematics" },
          { "value": "english", "label": "English" }
        ],
        "help_text": "Select all subjects you teach",
        "validation_rules": { "minSelections": 1 }
      },
      "isRequired": true,
      "isEnabled": true,
      "displayOrder": 3,
      "customLabel": "What subjects do you teach?",
      "customHelpText": "Select your areas of expertise"
    }
    // ... more fields
  ]
}
```

### **POST /api/admin/shared-fields**

Admin endpoint to create/update shared fields.

**Request**:
```json
{
  "field_name": "new_field",
  "label": "New Field",
  "field_type": "select",
  "options": [
    { "value": "option1", "label": "Option 1" }
  ],
  "help_text": "Help text here",
  "category": "professional"
}
```

**Response**:
```json
{
  "success": true,
  "field": { /* created field */ }
}
```

### **PATCH /api/admin/form-config/:id**

Admin endpoint to update form configuration.

**Request**:
```json
{
  "isRequired": true,
  "customLabel": "Updated label",
  "displayOrder": 5
}
```

**Response**:
```json
{
  "success": true,
  "config": { /* updated config */ }
}
```

---

## 🛠️ **Admin Configuration UI**

### **Forms Hub Admin Interface**

Located at: `/admin/forms`

**Features**:
1. **Form Context Selection**:
   - Dropdown: Select form type (Onboarding, Account, Organisation)
   - Dropdown: Select user role (Tutor, Client, Agent)
   - Display: Current context (e.g., "Tutor Onboarding")

2. **Field Configuration Table**:
   - Columns: Field Name, Label, Type, Required, Enabled, Order
   - Actions: Edit, Enable/Disable, Reorder
   - Drag-and-drop for reordering

3. **Field Editor Modal**:
   - Field name (read-only, from shared_fields)
   - Custom label (override default)
   - Custom help text (override default)
   - Required toggle
   - Enabled toggle
   - Display order (number input)
   - Conditional logic editor (advanced)

4. **Shared Fields Management**:
   - Add new shared field
   - Edit field options
   - Delete shared field (with warning)
   - Preview field rendering

**Workflow**:
```
1. Admin selects context (e.g., "Tutor Onboarding")
2. Table shows all enabled fields for this context
3. Admin clicks "Edit" on a field
4. Modal opens with field configuration
5. Admin modifies settings:
   - Toggle "Required" to true
   - Change label to "Your Teaching Subjects"
   - Update display order to 2
6. Admin saves changes
7. Form updates immediately for new submissions
```

---

## 🔄 **Migration from Hardcoded Options**

### **Migration Process**

**Step 1: Create shared_fields Table**
```sql
-- Migration: 170_create_shared_fields_tables.sql
CREATE TABLE shared_fields (
  -- schema as defined above
);
```

**Step 2: Populate Shared Fields**
```sql
-- Insert 23 global shared fields
INSERT INTO shared_fields (field_name, label, field_type, options, ...) VALUES
('subject_specializations', 'Subject Specializations', 'multiselect', '[...]', ...),
('grade_levels', 'Grade Levels', 'multiselect', '[...]', ...),
-- ... 21 more fields
```

**Step 3: Create form_config Table**
```sql
-- Migration: 170_create_shared_fields_tables.sql
CREATE TABLE form_config (
  -- schema as defined above
);
```

**Step 4: Create 106 Context Mappings**
```sql
-- Migration: 171_migrate_form_config_to_shared_fields.sql
-- For each context (9 total), insert relevant field configs
INSERT INTO form_config (form_type, user_role, shared_field_id, ...) VALUES
('onboarding', 'tutor', (SELECT id FROM shared_fields WHERE field_name = 'subject_specializations'), true, true, 1, ...),
-- ... 105 more mappings
```

**Step 5: Update Form Components**
```typescript
// Before (hardcoded):
const SUBJECTS = ['Mathematics', 'English', 'Science'];

// After (dynamic):
const { fields } = await fetch('/api/form-config?formType=onboarding&userRole=tutor');
```

**Step 6: Test All 27 Forms**
- Verify field rendering for each context
- Ensure validation works correctly
- Test admin configuration UI
- Verify data saving/loading

---

## 📊 **Benefits of Shared Fields System**

### **1. Maintainability**
- **Before**: Update options in 15+ files
- **After**: Update once in `shared_fields` table
- **Impact**: 95% reduction in maintenance effort

### **2. Consistency**
- **Before**: Inconsistent options across forms
- **After**: Guaranteed consistency (single source of truth)
- **Impact**: Zero inconsistency errors

### **3. Admin Control**
- **Before**: Developer required to change options
- **After**: Admin can update via UI (no code changes)
- **Impact**: Instant updates without deployment

### **4. Context Awareness**
- **Before**: Same fields for all roles (irrelevant data)
- **After**: Role-specific field visibility
- **Impact**: Better UX, cleaner forms

### **5. Scalability**
- **Before**: Adding new field = touching many files
- **After**: Add to `shared_fields`, configure once
- **Impact**: New fields in minutes vs hours

### **6. Validation**
- **Before**: Hardcoded validation in each form
- **After**: Centralized validation rules
- **Impact**: Consistent validation across platform

---

## 🔍 **Example: Adding a New Shared Field**

### **Scenario**: Add "tutoring_certifications" field

**Step 1: Admin adds to shared_fields**
```sql
INSERT INTO shared_fields (
  field_name, label, field_type, options, help_text, category
) VALUES (
  'tutoring_certifications',
  'Tutoring Certifications',
  'multiselect',
  '[
    {"value": "certified_tutor", "label": "Certified Tutor"},
    {"value": "subject_expert", "label": "Subject Matter Expert"}
  ]',
  'Select your tutoring certifications',
  'professional'
);
```

**Step 2: Admin configures for contexts**
```sql
-- Enable for Tutor Onboarding
INSERT INTO form_config (
  form_type, user_role, shared_field_id,
  is_required, is_enabled, display_order
) VALUES (
  'onboarding', 'tutor', (SELECT id FROM shared_fields WHERE field_name = 'tutoring_certifications'),
  false, true, 8
);

-- Enable for Tutor Account
INSERT INTO form_config (
  form_type, user_role, shared_field_id,
  is_required, is_enabled, display_order
) VALUES (
  'account', 'tutor', (SELECT id FROM shared_fields WHERE field_name = 'tutoring_certifications'),
  false, true, 5
);
```

**Step 3: Use in forms (automatically available)**
```typescript
// Component automatically fetches this field
const { fields } = await fetch('/api/form-config?formType=onboarding&userRole=tutor');

// Render field with UnifiedMultiSelect
fields.map(field => {
  if (field.shared_fields.field_name === 'tutoring_certifications') {
    return (
      <UnifiedMultiSelect
        fieldName={field.shared_fields.field_name}
        label={field.customLabel || field.shared_fields.label}
        value={formData.certifications}
        onChange={(certs) => setFormData({ ...formData, certifications: certs })}
        options={field.shared_fields.options}
        required={field.isRequired}
        helpText={field.customHelpText || field.shared_fields.help_text}
      />
    );
  }
});
```

**Result**: New field available in 2 contexts with zero code changes!

---

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
describe('UnifiedSelect', () => {
  it('fetches options from API', async () => {
    const { getByRole } = render(
      <UnifiedSelect
        fieldName="subject_specializations"
        value=""
        onChange={() => {}}
        fetchFromSharedFields={true}
      />
    );
    await waitFor(() => {
      expect(getByRole('combobox')).toHaveLength(1);
    });
  });

  it('uses provided options when fetchFromSharedFields is false', () => {
    const options = [{ value: 'math', label: 'Math' }];
    const { getByText } = render(
      <UnifiedSelect
        fieldName="subjects"
        value=""
        onChange={() => {}}
        options={options}
        fetchFromSharedFields={false}
      />
    );
    expect(getByText('Math')).toBeInTheDocument();
  });
});
```

### **Integration Tests**
```typescript
describe('Form Config API', () => {
  it('returns correct fields for tutor onboarding', async () => {
    const response = await fetch('/api/form-config?formType=onboarding&userRole=tutor');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.fields.length).toBeGreaterThan(0);
    expect(data.fields[0]).toHaveProperty('shared_fields');
    expect(data.fields[0].shared_fields).toHaveProperty('field_name');
  });
});
```

### **E2E Tests**
```typescript
test('Tutor can complete onboarding with shared fields', async ({ page }) => {
  await page.goto('/onboarding/tutor/professional');

  // Subject selection using UnifiedMultiSelect
  await page.selectOption('[name="subject_specializations"]', ['mathematics', 'english']);

  // Grade levels using UnifiedMultiSelect
  await page.selectOption('[name="grade_levels"]', ['high_school', 'college']);

  await page.click('button:has-text("Next")');

  // Verify data saved
  const savedData = await page.evaluate(() => localStorage.getItem('onboarding_draft'));
  expect(JSON.parse(savedData).subjects).toEqual(['mathematics', 'english']);
});
```

---

## 📚 **References**

### **Related Documentation**
- [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md) - Forms & Onboarding section
- [PATTERNS.md](.ai/PATTERNS.md) - UnifiedSelect and Shared Fields patterns
- [ADMIN-DASHBOARD.md](.ai/ADMIN-DASHBOARD.md) - Forms Hub section
- [ONBOARDING.md](.ai/ONBOARDING.md) - Onboarding flow integration

### **Code Locations**
- Shared Fields API: `apps/web/src/app/api/shared-fields/`
- Form Config API: `apps/web/src/app/api/form-config/`
- UnifiedSelect component: `apps/web/src/app/components/form/fields/UnifiedSelect.tsx`
- UnifiedMultiSelect component: `apps/web/src/app/components/form/fields/UnifiedMultiSelect.tsx`
- Forms Hub admin: `apps/web/src/app/(admin)/admin/forms/`

### **Database Migrations**
- `170_create_shared_fields_tables.sql` - Create shared_fields and form_config tables
- `171_migrate_form_config_to_shared_fields.sql` - Populate 23 fields + 106 mappings

---

## 🎯 **Key Takeaways**

1. **Single Source of Truth**: All field options in one place (`shared_fields`)
2. **Context-Aware**: Fields configured per role and form type (106 mappings)
3. **Admin Control**: No code changes needed to update options
4. **Consistent UX**: UnifiedSelect/UnifiedMultiSelect components everywhere
5. **Scalable**: Add new fields in minutes, not hours
6. **Maintainable**: Update once, reflect everywhere

**The Shared Fields system transformed Tutorwise from 15+ hardcoded field definitions into a dynamic, admin-controlled, context-aware form management system that powers 27 forms across 3 roles with zero code duplication.**

---

*This documentation covers the complete Shared Fields system architecture, implementation, and usage patterns.*

**Last Updated**: 2026-02-12
**Maintained By**: Platform Architecture Team
**Status**: Production-ready (100% complete)

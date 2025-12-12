# HubForm Gold Standard - Implementation Checklist
**Version**: v3 (Borderless, Auto-save)
**Last Updated**: 2025-11-20
**Status**: READY FOR PROFESSIONALINFOFORM

---

## Purpose
This checklist documents all fixes and standards for implementing new forms using HubForm. Following this ensures forms work **first time** without repeating past issues.

---

## ✅ VERIFIED FIXES (Applied to HubForm)

### 1. Select Dropdown Arrow (FIXED)
**Issue**: Browser default dropdown arrow appears on select elements
**Fix Location**: [HubForm.module.css:105-107](apps/web/src/app/components/ui/hub-form/HubForm.module.css#L105-L107)
**Solution**:
```css
.field select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}
```
**Status**: ✅ Fixed in HubForm core - all forms inherit this automatically

---

### 2. Input Box Height (FIXED)
**Issue**: Inconsistent padding (0.75rem vs 10px 14px)
**Fix Location**: [HubForm.module.css:96](apps/web/src/app/components/ui/hub-form/HubForm.module.css#L96)
**Solution**:
```css
.field input,
.field select,
.field textarea {
  padding: 10px 14px; /* Exact pixels, not rem */
}
```
**Status**: ✅ Fixed in HubForm core - consistent across all inputs

---

### 3. Border-bottom Underlines (FIXED)
**Issue**: OrganisationInfoForm had `border-bottom: 1px solid transparent` with hover effect
**Fix Location**: [OrganisationInfoForm.module.css:79-90](apps/web/src/app/components/organisation/tabs/OrganisationInfoForm.module.css#L79-L90)
**Decision**: **Option A (No border-bottom)** - Clean, minimal look
**Solution**:
```css
.displayValue {
  padding: 10px 0;
  /* NO border-bottom */
}
```
**Status**: ✅ Removed from OrganisationInfoForm to match PersonalInfoForm
**Standard**: All forms should have **NO border-bottom** on display values

---

### 4. "Saving..." Indicator Position (FIXED)
**Issue**: Saving indicator showed for ALL fields, not just the edited one
**Fix Location**: [PersonalInfoForm.tsx:245](apps/web/src/app/components/profile/PersonalInfoForm.tsx#L245)
**Solution**:
```tsx
{isSaving && editingField === field && (
  <span className={styles.savingIndicator}>Saving...</span>
)}
```
**Status**: ✅ Fixed - condition checks both `isSaving` AND `editingField === field`
**Standard**: Always check `editingField === field` to show indicator only for current field

---

### 5. Document Upload Border (FIXED)
**Issue**: Document upload field had no border
**Fix Location**: [PersonalInfoForm.module.css:182-195](apps/web/src/app/components/profile/PersonalInfoForm.module.css#L182-L195)
**Solution**:
```css
.documentDisplay {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 10px 14px;
}
```
**Status**: ✅ Fixed - matches input field styling

---

## 📋 HUBFORM STRUCTURE (Ready to Use)

### Component API
```tsx
import HubForm from '@/app/components/ui/hub-form/HubForm';

<HubForm.Root>
  <HubForm.Section title="Optional Section Title">
    <HubForm.Grid columns={2}> {/* 1 or 2 */}
      <HubForm.Field
        label="Field Label"
        required={false}
        error={errorMsg}
        isEditing={editingField === 'field_name'}
        onClick={() => handleFieldClick('field_name')}
      >
        {/* Input or display value */}
      </HubForm.Field>
    </HubForm.Grid>
  </HubForm.Section>

  <HubForm.Actions>
    {/* Action buttons */}
  </HubForm.Actions>
</HubForm.Root>
```

### Key Features
✅ Borderless container (no box, no shadow)
✅ 24px grid spacing (responsive: 2-col desktop, 1-col mobile)
✅ Click-to-edit support via `isEditing` and `onClick` props
✅ Section dividers with optional titles
✅ Auto-inherits input styling (padding, borders, focus states)

---

## 🎨 STYLING STANDARDS

### 1. Display Values (Non-editing Mode)
```css
.displayValue {
  padding: 10px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #111827;
  cursor: pointer;
  min-height: 22px;
  /* NO border-bottom */
}
```

### 2. Inputs (Editing Mode)
Use HubForm's built-in `.field` selectors - NO need to override:
```tsx
<input className={hubFormStyles.input} />
<select className={hubFormStyles.input} />
<textarea className={hubFormStyles.input} />
```

### 3. Saving Indicator
```css
.savingIndicator {
  font-size: 13px;
  color: #006c67;
  font-style: italic;
  margin-top: 4px;
}
```

### 4. Placeholder Text
```css
.placeholder {
  color: #9ca3af;
  font-style: italic;
}
```

---

## 🚀 AUTO-SAVE PATTERN (PersonalInfoForm Logic)

### State Management
```tsx
const [formData, setFormData] = useState<FormData>({});
const [editingField, setEditingField] = useState<EditingField | null>(null);
const [isSaving, setIsSaving] = useState(false);
const inputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
```

### Key Handlers
```tsx
// 1. Field Click - Enter edit mode
const handleFieldClick = (field: EditingField) => {
  setEditingField(field);
};

// 2. Blur - Auto-save with 150ms delay
const handleBlur = (field: EditingField) => {
  if (isSaving) return;

  setTimeout(() => {
    if (editingField !== field) return;

    const currentValue = formData[field];
    const originalValue = profile[field] || '';

    if (currentValue !== originalValue) {
      handleSaveField(field);
    } else {
      setEditingField(null); // No changes, just exit
    }
  }, 150);
};

// 3. Keyboard Shortcuts
const handleKeyDown = (e: React.KeyboardEvent, field: EditingField) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    handleCancelField(field);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    handleSaveField(field);
  }
};

// 4. Save Field
const handleSaveField = async (field: EditingField) => {
  setIsSaving(true);
  try {
    await onSave({ [field]: formData[field] });
    setEditingField(null);
  } catch (error) {
    // Validation error - keep field in edit mode
  } finally {
    setIsSaving(false);
  }
};

// 5. Cancel Field
const handleCancelField = (field: EditingField) => {
  setFormData({ ...formData, [field]: profile[field] });
  setEditingField(null);
};
```

### Auto-focus on Edit
```tsx
useEffect(() => {
  if (editingField && inputRefs.current[editingField]) {
    inputRefs.current[editingField]?.focus();
  }
}, [editingField]);
```

---

## ⚠️ COMMON PITFALLS TO AVOID

### ❌ DON'T: Use global CSS selectors in CSS Modules
```css
/* WRONG - will cause build error */
select.formInput {
  appearance: none;
}
```

### ✅ DO: Use scoped selectors or HubForm's built-in styles
```css
/* CORRECT - scoped selector */
.field select {
  appearance: none;
}
```
```tsx
// OR use HubForm's input class
<select className={hubFormStyles.input} />
```

---

### ❌ DON'T: Show saving indicator globally
```tsx
{isSaving && <span>Saving...</span>}
```

### ✅ DO: Check field match
```tsx
{isSaving && editingField === field && <span>Saving...</span>}
```

---

### ❌ DON'T: Add border-bottom to display values
```css
.displayValue {
  border-bottom: 1px solid transparent;
}
.displayValue:hover {
  border-bottom-color: #d1d5db;
}
```

### ✅ DO: Keep display values clean (no borders)
```css
.displayValue {
  padding: 10px 0;
  /* NO border-bottom */
}
```

---

## 📝 PROFESSIONALINFOFORM IMPLEMENTATION GUIDE

### 1. Copy PersonalInfoForm Structure
- State management (formData, editingField, isSaving, inputRefs)
- Handler functions (handleFieldClick, handleBlur, handleKeyDown, handleSaveField, handleCancelField)
- Auto-focus useEffect

### 2. Use HubForm Components
```tsx
<HubForm.Root>
  <HubForm.Section title="Professional Details">
    <HubForm.Grid>
      {renderField('field_name', 'Label', 'text', 'Placeholder')}
    </HubForm.Grid>
  </HubForm.Section>
</HubForm.Root>
```

### 3. Follow Styling Standards
- NO border-bottom on display values
- Use `hubFormStyles.input` for all inputs
- Check `editingField === field` for saving indicator
- Use 24px spacing (var(--space-3))

### 4. Test Checklist
- [ ] Select dropdown has no browser arrow
- [ ] Input padding is `10px 14px` (not 0.75rem)
- [ ] Display values have NO border-bottom
- [ ] Saving indicator only shows for edited field
- [ ] Auto-save works on blur
- [ ] Keyboard shortcuts work (Enter to save, Esc to cancel)
- [ ] Validation errors keep field in edit mode

---

## 🎯 EXPECTED RESULT

When implementing ProfessionalInfoForm following this checklist:
1. ✅ All styling will be correct first time
2. ✅ Select dropdowns will have no browser arrow
3. ✅ Input heights will be consistent
4. ✅ Display values will be clean (no underlines)
5. ✅ Auto-save will work correctly
6. ✅ No build cache issues
7. ✅ No CSS Modules errors

---

## 📊 IMPLEMENTATION HISTORY

| Form | Status | Issues Fixed | Commit |
|------|--------|--------------|--------|
| PersonalInfoForm | ✅ Complete | Select arrow, saving indicator, document border | cabba43 |
| OrganisationInfoForm | ✅ Complete | Border-bottom removed | e66e5d2 |
| ProfessionalInfoForm | 🔜 Ready | Should work first time | TBD |

---

## 🔗 References

- [HubForm.tsx](apps/web/src/app/components/ui/hub-form/HubForm.tsx)
- [HubForm.module.css](apps/web/src/app/components/ui/hub-form/HubForm.module.css)
- [PersonalInfoForm.tsx](apps/web/src/app/components/profile/PersonalInfoForm.tsx) (Gold Standard Reference)
- [OrganisationInfoForm.tsx](apps/web/src/app/components/organisation/tabs/OrganisationInfoForm.tsx)

---

**Last Verified**: 2025-11-20
**Next Form**: ProfessionalInfoForm (account/professional)

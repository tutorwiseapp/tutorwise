# Forms Admin UI Comparison

**Date:** 2026-01-13
**Purpose:** Compare two UI approaches for managing shared form fields

---

## 🎯 Problem Being Solved

Admin needs to manage form field options (subjects, qualifications, etc.) across multiple contexts:
- Onboarding (Tutor/Agent/Client)
- Account (Tutor/Agent/Client)
- Organisation (Tutor/Agent/Client)
- Create Listing (future)

**Current Pain Point:** Adding "Spanish" to subjects in Onboarding doesn't add it to Account or Listing forms → requires updating 3+ places.

---

## 🔧 Technical Solution (Both UIs Use This)

**Database Architecture:**
```sql
-- Single source of truth for options
shared_fields:
  - subjects → options: ["Maths", "English", "Spanish"]
  - qualifications → options: [...]

-- Context-specific configuration
form_context_fields:
  - onboarding.tutor → references shared_fields.subjects
  - account.tutor → references shared_fields.subjects
```

**Result:** Edit options once → updates all contexts automatically

---

## 📊 UI Comparison

### Option 1: Existing UI (Onboarding/Account/Organisation Pages)

**Location:** `/admin/forms/onboarding?role=tutor`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Onboarding Forms (EXISTING UI)                      │
├─────────────────────────────────────────────────────┤
│ [Tutor] [Agent] [Client]  ← Tabs                   │
├─────────────┬───────────────────────────────────────┤
│ FIELDS (22) │ academicQualifications                │
│             │                                       │
│ • academic  │ Field Metadata                        │
│ • availa... │ ┌──────────────────────────────────┐ │
│ • bio       │ │ Label: Academic Qualifications    │ │
│ • delivery  │ │ Placeholder: Select qualifications│ │
│ • email     │ │ Help Text: (optional)             │ │
│ • gender    │ └──────────────────────────────────┘ │
│ • ...       │                                       │
│             │ Dropdown Options         [+ Add]     │
│             │ ≡ University Degree    [Edit] [Del]  │
│             │ ≡ Master's Degree      [Edit] [Del]  │
│             │ ≡ PhD                  [Edit] [Del]  │
│             │ ≡ Professional Cert    [Edit] [Del]  │
└─────────────┴───────────────────────────────────────┘
```

**Strengths:**
- ✅ **All info in one view** - field list + metadata + options
- ✅ **Context-specific** - can see which fields are in Tutor vs Agent
- ✅ **Familiar** - admins already know this UI
- ✅ **Drag-and-drop reordering** - visible handles (≡)
- ✅ **Inline editing** - quick edits without modals

**Weaknesses:**
- ❌ **Context switching** - need to switch tabs to see different roles
- ❌ **No visibility into field usage** - can't see that editing here affects Account/Listing
- ❌ **Repetitive** - must go to Account page to configure Account-specific fields

---

### Option 2: New Fields UI

**Location:** `/admin/forms/fields`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Shared Fields (NEW UI)                              │
├─────────────┬───────────────────────────────────────┤
│ Fields (23) │ subjects                              │
│             │ Subjects (multiselect)                │
│ • academic  │                                       │
│ • bio       │ Options (9)              [+ Add]     │
│ • delivery  │ ≡ Maths           [Edit] [Delete]    │
│ • education │ ≡ English         [Edit] [Delete]    │
│ • gender    │ ≡ Science         [Edit] [Delete]    │
│ • ...       │ ≡ History         [Edit] [Delete]    │
│             │ ≡ Spanish         [Edit] [Delete]    │
│             │                                       │
│ [SIDEBAR]   │                                       │
│ Field Usage │                                       │
│ Used in 9   │                                       │
│ contexts:   │                                       │
│ • onboard.. │                                       │
│ • account.. │                                       │
│ • organis.. │                                       │
└─────────────┴───────────────────────────────────────┘
```

**Strengths:**
- ✅ **Field usage visibility** - sidebar shows all contexts using this field
- ✅ **Global focus** - clearly shows you're editing shared data
- ✅ **Simpler field list** - only one copy of each field
- ✅ **Drag-and-drop reordering** - same as existing
- ✅ **Statistics** - shows total fields and options at a glance

**Weaknesses:**
- ❌ **Two-page workflow** - Fields page (options) + Contexts page (per-context config)
- ❌ **Less intuitive** - requires understanding "shared fields" concept
- ❌ **No context-specific metadata** - can't see/edit field labels per context
- ❌ **Incomplete** - would need a separate "Contexts" page for field visibility/required/order

---

## 🏆 Recommendation

**Use Existing UI** (Onboarding/Account/Organisation pages)

**Why:**
1. **Better UX** - everything in one view, no mental model of "shared vs context"
2. **Already works** - no learning curve for admins
3. **Now has shared data** - API updated to use `shared_fields`, so editing options updates all contexts
4. **Less development** - no need to build Contexts page

**What Changed:**
- Backend now uses `shared_fields` + `form_context_fields`
- Frontend UI stays the same
- Adding "Spanish" in Onboarding → automatically appears in Account/Organisation

---

## 📝 Summary

| Aspect | Existing UI | New UI |
|--------|-------------|--------|
| **All info in view** | ✅ Yes | ❌ Split across pages |
| **Single source of truth** | ✅ Yes (after API update) | ✅ Yes |
| **Field usage visibility** | ❌ No | ✅ Yes (sidebar) |
| **Context-specific config** | ✅ Yes (tabs) | ❌ Would need Contexts page |
| **Learning curve** | ✅ Low (familiar) | ❌ Medium (new concept) |
| **Development effort** | ✅ Done | ❌ Need Contexts page |
| **Drag-and-drop** | ✅ Yes | ✅ Yes |

**Winner:** Existing UI ✅

---

## 🧪 How to Test

1. Go to `/admin/forms/onboarding?role=tutor`
2. Select "subjects" field
3. Add a new option "Spanish"
4. Go to `/admin/forms/account?role=tutor`
5. Select "subjects" field
6. **Verify:** "Spanish" appears in the options list ✅

This proves the single source of truth is working with the existing UI.

---

## 🗑️ What to Keep/Remove

**Keep:**
- ✅ Existing Onboarding/Account/Organisation pages
- ✅ Updated `formConfig.ts` API (uses shared_fields)
- ✅ Database migrations (170, 171)
- ✅ `shared_fields` and `form_context_fields` tables

**Remove (or keep for reference):**
- ❓ `/admin/forms/fields` page (New UI)
- ❓ `sharedFields.ts` API (separate from formConfig)

**Decision:** Keep both for now for comparison, remove Fields page after confirmation.

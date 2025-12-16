# [Feature Name] - AI Prompt Context v2

**Version**: v2.0
**Purpose**: Quick reference for AI assistants (Claude Code, etc.)
**Last Updated**: [YYYY-MM-DD]
**Estimated Read Time**: 10-15 minutes

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [System Architecture](#system-architecture)
3. [Common Usage Patterns](#common-usage-patterns)
4. [Integration Points](#integration-points)
5. [DO's and DON'Ts](#dos-and-donts)
6. [Performance Best Practices](#performance-best-practices)
7. [File References](#file-references)

---

## Quick Reference

### One-Sentence Summary

[Feature Name] is [concise description of what it does in business terms].

---

### Key Concepts Table

| Concept | Definition | Example |
|---------|------------|---------|
| [Concept 1] | [Brief definition] | [Quick example] |
| [Concept 2] | [Brief definition] | [Quick example] |
| [Concept 3] | [Brief definition] | [Quick example] |

---

### Core Service Methods

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `get[Feature]()` | Fetch single item | `id: string` | `[Feature] \| null` |
| `getAll[Features]()` | List all items | `filters?: object` | `[Feature][]` |
| `create[Feature]()` | Create new item | `CreateInput` | `[Feature]` |
| `update[Feature]()` | Update existing | `id, UpdateInput` | `[Feature]` |
| `delete[Feature]()` | Remove item | `id: string` | `void` |

**Service File**: `apps/web/src/lib/api/[feature].ts`

---

### API Endpoints Quick Map

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/[feature]` | GET | List all | Yes |
| `/api/[feature]` | POST | Create new | Yes |
| `/api/[feature]/[id]` | GET | Get single | Yes |
| `/api/[feature]/[id]` | PATCH | Update | Yes |
| `/api/[feature]/[id]` | DELETE | Delete | Yes |

---

## System Architecture

### Database Tables

**Table: `[table_name]`** (Primary table)

**Key Fields**:
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to profiles
- `[key_field_1]` ([type]) - [Purpose]
- `[key_field_2]` ([type]) - [Purpose]
- `metadata` (JSONB) - Flexible storage for [use case]

**RLS Policies**: [count] policies
- Users can read/write their own data
- Public data is readable by all
- [Other policy summaries]

**Migration**: `apps/api/migrations/XXX_create_[table].sql`

---

### TypeScript Types

**Core Interfaces** (in `apps/web/src/types/index.ts`):

```typescript
// Main entity type
interface [FeatureName] {
  id: string;
  userId: string;
  [key]: [type];
  // ... other fields
}

// Input types
interface Create[Feature]Input {
  [field]: [type];
}

interface Update[Feature]Input {
  [field]?: [type]; // Optional for partial updates
}
```

---

### Architecture Pattern

**Service Layer Pattern**:
```
UI Component
     (calls)
Service Layer (lib/api/[feature].ts)
     (uses)
Supabase Client
     (queries)
Database (with RLS)
```

**Key Principle**: All business logic lives in service layer, NOT in components or API routes.

---

## Common Usage Patterns

### Pattern 1: Fetch and Display [Feature]

**Use Case**: Display a list of items to the user

**Service Call**:
```typescript
const items = await getAll[Features]({ status: 'active' });
```

**Component Pattern**:
- Use React Query for caching
- Show loading state
- Handle empty state
- Handle errors gracefully

**Common Gotcha**: Remember to filter by user_id in service layer

---

### Pattern 2: Create New [Feature]

**Use Case**: User creates a new item

**Service Call**:
```typescript
const newItem = await create[Feature]({
  [field1]: value1,
  [field2]: value2,
});
```

**Validation**: Always validate input before calling service

**Error Handling**:
- Catch unique constraint violations
- Show user-friendly error messages
- Roll back optimistic updates on failure

---

### Pattern 3: Update Existing [Feature]

**Use Case**: User edits an item

**Service Call**:
```typescript
const updated = await update[Feature](id, {
  [field]: newValue,
});
```

**Pattern**: Use optimistic updates in UI for better UX

**Gotcha**: Partial updates only include changed fields

---

### Pattern 4: Delete [Feature]

**Use Case**: User removes an item

**Service Call**:
```typescript
await delete[Feature](id);
```

**Best Practice**: Show confirmation dialog before delete

**Cascade Behavior**: [Explain what happens to related data]

---

## Integration Points

### Integration 1: [Feature A]

**What it does**: [Brief description of how they integrate]

**When it triggers**: [Event that triggers integration]

**Data flow**:
- [Feature Name]  [data passed]  [Feature A]

**Code location**: `[file:line]`

**Common pattern**:
```typescript
// After creating [Feature], also create [related entity]
const item = await create[Feature](data);
await create[RelatedEntity]({ featureId: item.id });
```

---

### Integration 2: [Feature B]

**What it does**: [Integration description]

**When it triggers**: [Trigger condition]

**Error handling**: [How to handle integration failures]

---

## DO's and DON'Ts

###  DO

**1. Use service layer functions for all data operations**

```typescript
//  GOOD: Use service layer
import { get[Feature] } from '@/lib/api/[feature]';
const item = await get[Feature](id);

//  BAD: Direct Supabase query in component
const { data } = await supabase.from('[table]').select('*');
```

**Rationale**: Service layer encapsulates business logic and handles edge cases.

---

**2. Always validate user input before database operations**

```typescript
//  GOOD: Validate first
if (!data.[field] || data.[field].length === 0) {
  throw new Error('Field is required');
}
await create[Feature](data);

//  BAD: Trust input blindly
await create[Feature](data); // Database will reject, unclear error
```

**Rationale**: Provide clear error messages to users, prevent database errors.

---

**3. Handle loading and error states in UI**

```typescript
//  GOOD: Complete error handling
const { data, isLoading, error } = useQuery(['[feature]', id], () => get[Feature](id));

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <FeatureDisplay data={data} />;
```

**Rationale**: Better user experience, prevents blank screens.

---

**4. Use React Query for server state**

```typescript
//  GOOD: React Query handles caching, refetching
const { data } = useQuery(['[features]'], getAll[Features]);

//  BAD: Manual state management
const [data, setData] = useState([]);
useEffect(() => {
  getAll[Features]().then(setData);
}, []);
```

**Rationale**: React Query handles caching, background refetching, deduplication.

---

**5. Check user permissions before operations**

```typescript
//  GOOD: Verify ownership
const item = await get[Feature](id);
if (item.userId !== currentUser.id) {
  throw new Error('Unauthorized');
}
await update[Feature](id, updates);
```

**Rationale**: RLS is defense in depth, but check in app for better UX.

---

###  DON'T

**1. Don't bypass the service layer**

```typescript
//  BAD: Direct database access from component
const { data } = await supabase.from('[table]').select('*');

//  GOOD: Use service layer
const data = await getAll[Features]();
```

**Rationale**: Service layer ensures consistent business logic application.

---

**2. Don't forget to handle null/undefined**

```typescript
//  BAD: Assumes data exists
const title = data.title.toUpperCase(); // Crashes if data is null

//  GOOD: Defensive programming
const title = data?.title?.toUpperCase() ?? 'Untitled';
```

**Rationale**: Prevents runtime errors, improves reliability.

---

**3. Don't hardcode magic numbers**

```typescript
//  BAD: Magic number
if (items.length > 10) { ... }

//  GOOD: Named constant
const MAX_ITEMS_PER_PAGE = 10;
if (items.length > MAX_ITEMS_PER_PAGE) { ... }
```

**Rationale**: Makes code self-documenting and easier to maintain.

---

**4. Don't ignore errors**

```typescript
//  BAD: Silent failure
try {
  await create[Feature](data);
} catch (error) {
  // Nothing happens, user doesn't know it failed
}

//  GOOD: Handle error
try {
  await create[Feature](data);
} catch (error) {
  toast.error('Failed to create: ' + error.message);
  console.error(error); // For debugging
}
```

**Rationale**: Users need feedback, developers need error visibility.

---

**5. Don't make unnecessary API calls**

```typescript
//  BAD: Fetch on every render
function Component() {
  const data = await get[Feature](id); // Runs every render!

//  GOOD: Use React Query caching
function Component() {
  const { data } = useQuery(['[feature]', id], () => get[Feature](id));
```

**Rationale**: Reduces server load, improves performance, better UX.

---

**6. Don't mutate state directly**

```typescript
//  BAD: Direct mutation
items[0].name = 'New Name'; // Breaks React

//  GOOD: Immutable update
setItems(items.map(item =>
  item.id === targetId ? { ...item, name: 'New Name' } : item
));
```

**Rationale**: React relies on immutability for change detection.

---

## Performance Best Practices

### Database Queries

**1. Use selective field retrieval**
-  `select('id, name, status')` - Only needed fields
-  `select('*')` - Everything (wasteful)

**2. Add pagination for large datasets**
- Default: 10-20 items per page
- Use cursor-based for infinite scroll
- Use offset for numbered pages

**3. Leverage indexes**
- Queries on `user_id`, `status`, `created_at` are indexed
- Avoid filtering on unindexed JSONB fields

---

### Caching Strategy

**React Query defaults**:
- `staleTime`: 5 minutes (data considered fresh)
- `cacheTime`: 10 minutes (cache retained)

**When to invalidate cache**:
- After creating: `queryClient.invalidateQueries(['[features]'])`
- After updating: `queryClient.invalidateQueries(['[feature]', id])`
- After deleting: `queryClient.invalidateQueries(['[features]'])`

---

### Component Optimization

**1. Memoize expensive computations**
```typescript
const computed = useMemo(() => expensiveOperation(data), [data]);
```

**2. Avoid inline function definitions in renders**
```typescript
//  Creates new function every render
<Button onClick={() => handleClick(id)} />

//  Stable callback reference
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<Button onClick={handleButtonClick} />
```

---

## File References

### Quick Navigation

| File Type | Path | Purpose |
|-----------|------|---------|
| **Service Layer** | `apps/web/src/lib/api/[feature].ts` | Core business logic |
| **API Routes** | `apps/web/src/app/api/[feature]/route.ts` | REST endpoints |
| **Types** | `apps/web/src/types/index.ts` | TypeScript interfaces |
| **Components** | `apps/web/src/app/components/feature/[feature]/` | UI components |
| **Database** | `apps/api/migrations/XXX_[feature].sql` | Schema definition |
| **Tests** | `apps/web/src/__tests__/[feature].test.ts` | Unit tests |

---

### Detailed File Map

**For full file references**, see:
- [Solution Design](./[feature]-solution-design-v2.md) - Architecture details
- [Implementation Guide](./[feature]-implementation-v2.md) - How-to patterns
- [References Template](../templates/references-section-template.md) - Complete file listing

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Not authenticated" | User not logged in | Redirect to /signin |
| "Forbidden" | RLS policy blocked | Check user permissions |
| "Unique constraint violation" | Duplicate [field] | Check if exists first |
| "Foreign key violation" | Referenced record missing | Verify parent exists |

---

## Metadata Schemas

### [Feature] Metadata (JSONB field)

**Purpose**: Store flexible, non-queryable data

**Schema** (TypeScript):
```typescript
interface [Feature]Metadata {
  [field1]?: string;  // Optional field for [purpose]
  [field2]?: number;  // Optional [purpose]
  customData?: Record<string, any>; // User-defined data
}
```

**Common uses**:
- User preferences (UI state, settings)
- Temporary data (draft content)
- Integration-specific data

**Gotcha**: Don't use for data you need to query/filter on

---

## Related Features

| Feature | Relationship | Integration Point |
|---------|--------------|-------------------|
| [Feature A] | [Type of relationship] | [How they connect] |
| [Feature B] | [Type of relationship] | [How they connect] |

**For details**, see [Integration Points](#integration-points) section above.

---

## Quick Checklist for AI Code Generation

When generating code for this feature:

- [ ] Use service layer functions, not direct Supabase queries
- [ ] Include proper TypeScript types from `@/types`
- [ ] Add loading/error/empty states in UI
- [ ] Use React Query for server state
- [ ] Validate user input before database operations
- [ ] Check user permissions (even though RLS will enforce)
- [ ] Handle errors gracefully with user-friendly messages
- [ ] Follow existing component patterns (see Components file)
- [ ] Add console.logs for debugging (remove before production)
- [ ] Invalidate React Query cache after mutations

---

**Document Version**: v2.0
**Last Updated**: [YYYY-MM-DD]
**Maintainer**: [Team/Person]

---

**For Deeper Understanding**:
- Read: [Solution Design v2](./[feature]-solution-design-v2.md) for architecture
- Read: [Implementation Guide v2](./[feature]-implementation-v2.md) for patterns
- Browse: Code files listed in [File References](#file-references)

---

**End of AI Prompt Context**

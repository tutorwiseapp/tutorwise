# Organisation Feature - Implementation Guide

**Version**: v6.0
**Date**: 2025-12-12

## File Structure

```
apps/web/src/app/(authenticated)/
  organisation/
    page.tsx                    # Organization dashboard
    create/page.tsx             # Create organization
    [id]/
      settings/page.tsx         # Organization settings
      members/page.tsx          # Member management
```

## Common Tasks

### Create Organization

```typescript
const createOrganization = async (name: string, type: string) => {
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, type, owner_id: user.id })
    .select()
    .single();
  
  return data;
};
```

---

**Last Updated**: 2025-12-12

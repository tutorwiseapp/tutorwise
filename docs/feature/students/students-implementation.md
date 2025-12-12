# Students Feature - Implementation Guide

**Version**: v1.0
**Date**: 2025-12-12

## File Structure

```
apps/web/src/app/(authenticated)/
  my-students/
    page.tsx                   # Student list
    [id]/page.tsx              # Student detail
```

## Common Tasks

### Fetch Students

```typescript
const fetchMyStudents = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      student_id,
      student:profiles!bookings_student_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('tutor_id', user.id)
    .order('session_start_time', { ascending: false });
  
  // Deduplicate and count sessions
  const students = data.reduce((acc, booking) => {
    const student = booking.student;
    if (!acc[student.id]) {
      acc[student.id] = { ...student, session_count: 0 };
    }
    acc[student.id].session_count++;
    return acc;
  }, {});
  
  return Object.values(students);
};
```

---

**Last Updated**: 2025-12-12

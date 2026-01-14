# Supabase Automation Reference

This document provides reference code for automating Supabase operations during development.

## Environment Setup

The project uses environment variables stored in `/apps/web/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key with admin privileges

## Common Operations

### 1. Running SQL Migrations

```javascript
// Example: Run a migration file
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const migrationSql = fs.readFileSync('/path/to/migration.sql', 'utf8');

const { data, error } = await supabase.rpc('exec_sql', {
  sql_query: migrationSql
});

if (error) {
  console.error('Migration failed:', error);
} else {
  console.log('✅ Migration completed successfully');
}
```

### 2. Creating Storage Buckets

```javascript
// Example: Create a storage bucket with policies
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create bucket
const { data: bucket, error: bucketError } = await supabase
  .storage
  .createBucket('verification-documents', {
    public: true,
    fileSizeLimit: 5242880 // 5MB
  });

if (bucketError) {
  console.error('Bucket creation failed:', bucketError);
} else {
  console.log('✅ Bucket created:', bucket);
}

// Set bucket policies via SQL
const policySql = `
-- Upload policy
create policy "Users can upload their own verification documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = 'identity-documents'
);

-- View own documents policy
create policy "Users can view their own verification documents"
on storage.objects for select
to authenticated
using (bucket_id = 'verification-documents');

-- Admin view all policy
create policy "Admins can view all verification documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'verification-documents' AND
  auth.uid() in (
    select id from profiles where 'admin' = ANY(roles)
  )
);
`;

const { error: policyError } = await supabase.rpc('exec_sql', {
  sql_query: policySql
});

if (policyError) {
  console.error('Policy creation failed:', policyError);
} else {
  console.log('✅ Policies created successfully');
}
```

### 3. Querying Database Schema

```javascript
// Check if columns exist
const { data, error } = await supabase.rpc('exec_sql', {
  sql_query: `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    ORDER BY ordinal_position;
  `
});

console.log('Profile table columns:', data);
```

### 4. Updating Profile Data

```javascript
// Direct database update
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: 'John Doe',
    gender: 'Male'
  })
  .eq('email', 'user@example.com')
  .select();

if (error) {
  console.error('Update failed:', error);
} else {
  console.log('✅ Profile updated:', data);
}
```

## Migration Execution Script Template

```bash
#!/bin/bash
# Example: Execute migration via Node.js

node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = '/Users/michaelquan/projects/tutorwise/apps/web/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');

const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=\"(.+?)\"/)[1];
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=\"(.+?)\"/)[1];

const supabase = createClient(supabaseUrl, serviceKey);

const migration = fs.readFileSync('$MIGRATION_FILE', 'utf8');

supabase.rpc('exec_sql', { sql_query: migration })
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Migration error:', error);
      process.exit(1);
    }
    console.log('✅ Migration completed successfully');
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
"
```

## Storage Operations

### Upload File
```javascript
const { data, error } = await supabase.storage
  .from('verification-documents')
  .upload('identity-documents/test.pdf', fileBuffer, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: false
  });
```

### Get Public URL
```javascript
const { data } = supabase.storage
  .from('verification-documents')
  .getPublicUrl('identity-documents/test.pdf');

console.log('Public URL:', data.publicUrl);
```

### List Files
```javascript
const { data, error } = await supabase.storage
  .from('verification-documents')
  .list('identity-documents');

console.log('Files:', data);
```

### Delete File
```javascript
const { data, error } = await supabase.storage
  .from('verification-documents')
  .remove(['identity-documents/test.pdf']);
```

## Notes

- Always use `SUPABASE_SERVICE_ROLE_KEY` for admin operations (migrations, bucket creation, etc.)
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side operations with RLS
- The service role key bypasses Row Level Security (RLS) - use carefully
- Always validate and sanitize user input before database operations
- Test migrations in development before running in production

## Current Buckets

- `verification-documents`: Stores identity verification documents (passports, driver's licenses, etc.)
  - Subfolder: `identity-documents/` - User identity documents
  - Max file size: 5MB
  - Public: Yes (with RLS policies)
  - Allowed types: JPG, PNG, PDF

## Useful SQL Queries

### Check if bucket exists
```sql
SELECT * FROM storage.buckets WHERE id = 'verification-documents';
```

### List all buckets
```sql
SELECT * FROM storage.buckets;
```

### Check storage policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### View all profile columns
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

-- File: apps/api/migrations/091_upgrade_network_groups_for_organisations.sql
-- Purpose: Upgrade connection_groups to support Organisation feature (v6.1)
-- Date: 2025-11-19
-- Reference: organisation-solution-design-v6.md

-- 1. Add new columns to connection_groups for organisation support
ALTER TABLE public.connection_groups
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('personal', 'organisation')) DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
-- Contact information
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
-- Address information
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_town TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_postcode TEXT,
ADD COLUMN IF NOT EXISTS address_country TEXT;

-- 2. Update description column to be nullable (it already exists)
-- The description column was created in migration 039, no change needed

-- 3. Create unique constraint on slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_groups_slug_unique
    ON public.connection_groups(slug)
    WHERE slug IS NOT NULL;

-- 4. Create index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_connection_groups_type
    ON public.connection_groups(type);

-- 5. Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_connection_groups_slug
    ON public.connection_groups(slug)
    WHERE slug IS NOT NULL;

-- 6. Update RLS policies to allow public read access for organisations
CREATE POLICY "Public can view organisations"
    ON public.connection_groups FOR SELECT
    USING (type = 'organisation');

-- 7. Create function to generate unique slug from name
CREATE OR REPLACE FUNCTION public.generate_group_slug(group_name TEXT, group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert name to lowercase, replace spaces and special chars with hyphens
    base_slug := lower(regexp_replace(group_name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);
    -- Limit length to 50 characters
    base_slug := substring(base_slug from 1 for 50);

    final_slug := base_slug;

    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (
        SELECT 1 FROM public.connection_groups
        WHERE slug = final_slug AND id != group_id
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$;

-- 8. Create function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION public.ensure_group_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only generate slug for organisations if not provided
    IF NEW.type = 'organisation' AND (NEW.slug IS NULL OR NEW.slug = '') THEN
        NEW.slug := public.generate_group_slug(NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

-- 9. Create trigger for slug generation
DROP TRIGGER IF EXISTS ensure_organisation_slug ON public.connection_groups;
CREATE TRIGGER ensure_organisation_slug
    BEFORE INSERT OR UPDATE ON public.connection_groups
    FOR EACH ROW
    WHEN (NEW.type = 'organisation')
    EXECUTE FUNCTION public.ensure_group_slug();

-- 10. Update RLS to ensure only owner can update organisation details
CREATE POLICY IF NOT EXISTS "Owner can update organisation details"
    ON public.connection_groups FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- 11. Comments for documentation
COMMENT ON COLUMN public.connection_groups.type IS
    'Group type: personal (default) or organisation (for agencies/schools/companies)';
COMMENT ON COLUMN public.connection_groups.slug IS
    'URL-friendly unique identifier for organisations (auto-generated from name)';
COMMENT ON COLUMN public.connection_groups.avatar_url IS
    'Organisation logo URL (for public branding)';
COMMENT ON COLUMN public.connection_groups.website IS
    'Organisation website URL';
COMMENT ON COLUMN public.connection_groups.settings IS
    'JSONB field for future configuration options';
COMMENT ON COLUMN public.connection_groups.contact_name IS
    'Primary contact person name for the organisation';
COMMENT ON COLUMN public.connection_groups.contact_email IS
    'Primary contact email for the organisation';
COMMENT ON COLUMN public.connection_groups.contact_phone IS
    'Primary contact phone number for the organisation';
COMMENT ON COLUMN public.connection_groups.address_line1 IS
    'Organisation street address';
COMMENT ON COLUMN public.connection_groups.address_town IS
    'Organisation town/suburb';
COMMENT ON COLUMN public.connection_groups.address_city IS
    'Organisation city';
COMMENT ON COLUMN public.connection_groups.address_postcode IS
    'Organisation postcode/ZIP code';
COMMENT ON COLUMN public.connection_groups.address_country IS
    'Organisation country';

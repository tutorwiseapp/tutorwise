-- File: apps/api/migrations/039_create_network_groups.sql
-- Purpose: Network groups, reminder tracking, and group management (SDD v4.5)
-- Date: 2025-11-07

-- 1. Connection Groups (Enhanced with metadata)
CREATE TABLE IF NOT EXISTS public.connection_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#006c67', -- Hex color for UI
    icon VARCHAR(50) DEFAULT 'folder', -- Icon name from icon library
    is_favorite BOOLEAN DEFAULT false,
    member_count INTEGER DEFAULT 0, -- Denormalized for quick access
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_group_name_per_profile UNIQUE (profile_id, name),
    CONSTRAINT valid_hex_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- 2. Group Members (Enhanced with added_at tracking)
CREATE TABLE IF NOT EXISTS public.group_members (
    group_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (group_id, connection_id)
);

-- 3. Add reminder tracking to connections
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS message TEXT; -- Optional message with request

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connection_groups_profile_id
    ON public.connection_groups(profile_id);
CREATE INDEX IF NOT EXISTS idx_connection_groups_favorite
    ON public.connection_groups(profile_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id
    ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_connections_reminder
    ON public.connections(status, reminder_sent, created_at)
    WHERE status = 'pending';

-- 5. Function to update member_count
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.connection_groups
        SET member_count = member_count + 1,
            updated_at = NOW()
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.connection_groups
        SET member_count = GREATEST(0, member_count - 1),
            updated_at = NOW()
        WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$;

-- 6. Trigger for member count
DROP TRIGGER IF EXISTS on_group_member_change ON public.group_members;
CREATE TRIGGER on_group_member_change
    AFTER INSERT OR DELETE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_group_member_count();

-- 7. Function to update groups updated_at
CREATE OR REPLACE FUNCTION public.update_group_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 8. Trigger for updated_at
DROP TRIGGER IF EXISTS connection_groups_updated_at ON public.connection_groups;
CREATE TRIGGER connection_groups_updated_at
    BEFORE UPDATE ON public.connection_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_group_updated_at();

-- 9. RLS Policies
ALTER TABLE public.connection_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connection groups"
    ON public.connection_groups
    FOR ALL
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can manage members of groups they own"
    ON public.group_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.connection_groups
            WHERE id = group_id AND profile_id = auth.uid()
        )
    );

COMMENT ON TABLE public.connection_groups IS
    'User-defined groups for organizing connections (v4.5)';
COMMENT ON TABLE public.group_members IS
    'Many-to-many join table for connection groups (v4.5)';

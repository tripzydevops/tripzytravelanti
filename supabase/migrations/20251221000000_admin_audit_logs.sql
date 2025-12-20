-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id),
    action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can view all audit logs" 
ON public.admin_audit_logs FOR SELECT 
TO authenticated 
USING (check_is_admin());

-- Function to handle audit logging
CREATE OR REPLACE FUNCTION public.handle_admin_audit()
RETURNS TRIGGER AS $$
DECLARE
    current_admin_id UUID;
BEGIN
    -- Get the ID of the user performing the action
    -- We use auth.uid() if available, assuming the action comes from a JWT-authed session
    current_admin_id := auth.uid();

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.admin_audit_logs (admin_id, action_type, table_name, record_id, new_data)
        VALUES (current_admin_id, 'CREATE', TG_TABLE_NAME, (NEW.id)::text, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if something meaningful changed (excluding updated_at)
        IF row_to_json(OLD)::jsonb - 'updated_at' != row_to_json(NEW)::jsonb - 'updated_at' THEN
            INSERT INTO public.admin_audit_logs (admin_id, action_type, table_name, record_id, old_data, new_data)
            VALUES (current_admin_id, 'UPDATE', TG_TABLE_NAME, (NEW.id)::text, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.admin_audit_logs (admin_id, action_type, table_name, record_id, old_data)
        VALUES (current_admin_id, 'DELETE', TG_TABLE_NAME, (OLD.id)::text, row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- triggers for deals
DROP TRIGGER IF EXISTS audit_deals_changes ON public.deals;
CREATE TRIGGER audit_deals_changes
AFTER INSERT OR UPDATE OR DELETE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.handle_admin_audit();

-- triggers for profiles (to track tier changes or admin grants)
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
AFTER UPDATE ON public.profiles -- We mainly care about updates (tier/admin status)
FOR EACH ROW 
WHEN (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.is_admin IS DISTINCT FROM NEW.is_admin)
EXECUTE FUNCTION public.handle_admin_audit();

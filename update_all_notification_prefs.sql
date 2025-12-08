-- Function to update notification preferences for ALL users
-- Only accessible by admins
create or replace function public.update_all_notification_preferences(new_prefs jsonb) returns void language plpgsql security definer -- Runs with privileges of the creator (postgres/service role) to bypass RLS for the update
    as $$
declare is_admin boolean;
begin -- 1. Security Check: Ensure the caller is an admin
select profiles.is_admin into is_admin
from public.profiles
where id = auth.uid();
if is_admin is not true then raise exception 'Access Denied: Only administrators can perform this action.';
end if;
-- 2. Bulk Update
-- We use the || operator to merge existing jsonb with the new keys
-- coalesce ensures we handle nulls gracefully (though preferences should probably default to {})
update public.profiles
set notification_preferences = coalesce(notification_preferences, '{}'::jsonb) || new_prefs,
    updated_at = now();
end;
$$;
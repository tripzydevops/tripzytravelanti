-- Function to get all users mixed with their profile data and auth verification status
-- Renamed to get_admin_users_list to avoid caching issues
create or replace function get_admin_users_list() returns table (
        id uuid,
        email text,
        email_confirmed_at timestamptz,
        last_sign_in_at timestamptz,
        created_at timestamptz,
        name text,
        tier text,
        is_admin boolean,
        avatar_url text,
        mobile text,
        status text,
        extra_redemptions int,
        referred_by uuid,
        notification_preferences jsonb,
        saved_deals jsonb,
        deal_redemptions jsonb,
        address text,
        billing_address text,
        role text
    ) security definer
set search_path = public,
    auth language plpgsql as $$ begin -- Check if the requesting user is an admin
    if not exists (
        select 1
        from public.profiles p_admin
        where p_admin.id = auth.uid()
            and p_admin.is_admin = true
    ) then return;
-- Return empty if not admin
end if;
return query
select au.id,
    au.email::text,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at,
    p.name::text,
    p.tier::text,
    p.is_admin,
    p.avatar_url::text,
    p.mobile::text,
    p.status::text,
    p.extra_redemptions,
    p.referred_by,
    p.notification_preferences,
    coalesce(
        (
            select jsonb_agg(item)
            from (
                    select sd.deal_id
                    from public.saved_deals sd
                    where sd.user_id = au.id
                ) item
        ),
        '[]'::jsonb
    ) as saved_deals,
    coalesce(
        (
            select jsonb_agg(item)
            from (
                    select dr.id,
                        dr.deal_id,
                        dr.user_id,
                        dr.redeemed_at
                    from public.deal_redemptions dr
                    where dr.user_id = au.id
                ) item
        ),
        '[]'::jsonb
    ) as deal_redemptions,
    p.address::text,
    p.billing_address::text,
    p.role::text
from auth.users au
    left join public.profiles p on p.id = au.id
order by au.created_at desc;
end;
$$;
-- Function to manually verify a user's email
create or replace function admin_confirm_user_email(target_user_id uuid) returns void security definer
set search_path = public,
    auth language plpgsql as $$ begin -- Check if the executing user is an admin
    if not exists (
        select 1
        from public.profiles
        where id = auth.uid()
            and is_admin = true
    ) then raise exception 'Access denied: Only admins can verify users.';
end if;
-- Update the user's email_confirmed_at field
update auth.users
set email_confirmed_at = now()
where id = target_user_id;
end;
$$;
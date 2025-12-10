-- Function to get all users mixed with their profile data and auth verification status
-- Renamed to get_admin_users_list to avoid caching issues
create or replace function get_admin_users_list() returns table (
        id uuid,
        name text,
        email text,
        tier text,
        is_admin boolean,
        role text,
        avatar_url text,
        referred_by text,
        extra_redemptions int,
        notification_preferences jsonb,
        saved_deals jsonb,
        deal_redemptions jsonb,
        owned_deals jsonb,
        mobile text,
        address text,
        billing_address text,
        status text,
        email_confirmed_at timestamptz,
        last_sign_in_at timestamptz,
        created_at timestamptz
    ) security definer
set search_path = public,
    auth language plpgsql as $$ begin -- Check if the requesting user is an admin
    if not exists (
        select 1
        from public.profiles p_admin
        where p_admin.id = auth.uid()
            and p_admin.is_admin = true
    ) then return;
end if;
return query
select p.id,
    p.name,
    p.email,
    p.tier,
    p.is_admin,
    p.role,
    p.avatar_url,
    p.referred_by,
    p.extra_redemptions,
    p.notification_preferences,
    coalesce(
        (
            select jsonb_agg(jsonb_build_object('deal_id', sd.deal_id))
            from public.saved_deals sd
            where sd.user_id = p.id
        ),
        '[]'::jsonb
    ) as saved_deals,
    coalesce(
        (
            select jsonb_agg(
                    jsonb_build_object(
                        'id',
                        dr.id,
                        'deal_id',
                        dr.deal_id,
                        'user_id',
                        dr.user_id,
                        'redeemed_at',
                        dr.redeemed_at
                    )
                )
            from public.deal_redemptions dr
            where dr.user_id = p.id
        ),
        '[]'::jsonb
    ) as deal_redemptions,
    coalesce(
        (
            select jsonb_agg(jsonb_build_object('deal_id', ud.deal_id))
            from public.user_deals ud
            where ud.user_id = p.id
        ),
        '[]'::jsonb
    ) as owned_deals,
    p.mobile,
    p.address,
    p.billing_address,
    p.status,
    au.email_confirmed_at,
    au.last_sign_in_at,
    p.created_at
from public.profiles p
    left join auth.users au on p.id = au.id
order by p.created_at desc;
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
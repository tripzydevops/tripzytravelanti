-- Trigger to automatically create a profile when a new user signs up
-- This avoids RLS issues where the client tries to insert their own profile before the session is fully established.
-- 1. Create the function that will be called by the trigger
create or replace function public.handle_new_user() returns trigger language plpgsql security definer
set search_path = public as $$ begin
insert into public.profiles (
        id,
        email,
        name,
        avatar_url,
        tier,
        referred_by
    )
values (
        new.id,
        new.email,
        -- Extract metadata if available, otherwise default
        coalesce(new.raw_user_meta_data->>'full_name', new.email),
        new.raw_user_meta_data->>'avatar_url',
        'FREE',
        new.raw_user_meta_data->>'referred_by'
    );
return new;
end;
$$;
-- 2. Create the trigger on the auth.users table
-- Drop it first to ensure idempotency
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();
-- 3. Ensure profiles are writable by the service role (which the trigger uses implicitly via security definer)
-- This is standard, but good to ensure.
-- The RLS policies we added previously are still useful for UPDATE/SELECT.
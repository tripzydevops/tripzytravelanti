-- Migration to add Churn and Retention metrics
-- We'll calculate churn based on users who haven't redeemed a deal in 30 days.
-- We'll calculate retention based on repeat redemptions.

CREATE OR REPLACE FUNCTION public.get_retention_stats()
RETURNS JSON AS $$
DECLARE
    total_users INT;
    active_users INT; -- users who redeemed in last 30 days
    churned_users INT; -- users who haven't redeemed in last 30 days but have in the past
    retention_rate FLOAT;
BEGIN
    SELECT COUNT(*) INTO total_users FROM public.profiles;
    
    SELECT COUNT(DISTINCT user_id) INTO active_users 
    FROM public.deal_redemptions 
    WHERE redeemed_at > (NOW() - INTERVAL '30 days');
    
    SELECT COUNT(DISTINCT user_id) INTO churned_users
    FROM public.deal_redemptions
    WHERE user_id NOT IN (
        SELECT DISTINCT user_id 
        FROM public.deal_redemptions 
        WHERE redeemed_at > (NOW() - INTERVAL '30 days')
    );
    
    IF total_users > 0 THEN
        retention_rate := (active_users::FLOAT / total_users::FLOAT) * 100;
    ELSE
        retention_rate := 0;
    END IF;

    RETURN json_build_object(
        'total_users', total_users,
        'active_users_30d', active_users,
        'churned_users', churned_users,
        'retention_rate', retention_rate
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly Active Users (MAU) Trend
CREATE OR REPLACE FUNCTION public.get_mau_trend()
RETURNS TABLE (month DATE, active_users BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('month', redeemed_at)::DATE as month,
        COUNT(DISTINCT user_id) as active_users
    FROM public.deal_redemptions
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

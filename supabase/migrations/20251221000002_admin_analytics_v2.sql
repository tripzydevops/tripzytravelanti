-- Add city column to profiles for geographical tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Index for faster grouping
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

-- RPC: Get overall admin statistics efficiently
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB AS $$
DECLARE
    total_users INT;
    total_revenue NUMERIC;
    active_deals_count INT;
    total_redemptions_count INT;
BEGIN
    SELECT count(*) INTO total_users FROM public.profiles;
    
    SELECT COALESCE(sum(amount), 0) INTO total_revenue 
    FROM public.payment_transactions 
    WHERE status = 'success';
    
    SELECT count(*) INTO active_deals_count 
    FROM public.deals 
    WHERE status = 'approved' AND (expires_at > now() OR expires_at IS NULL);
    
    SELECT count(*) INTO total_redemptions_count 
    FROM public.deal_redemptions;

    RETURN jsonb_build_object(
        'totalUsers', total_users,
        'totalRevenue', total_revenue,
        'activeDeals', active_deals_count,
        'totalRedemptions', total_redemptions_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get revenue grouped by month for the last 12 months
CREATE OR REPLACE FUNCTION public.get_revenue_by_month()
RETURNS TABLE (month_name TEXT, revenue NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(date_trunc('month', created_at), 'Mon YYYY') as month_name,
        sum(amount) as revenue
    FROM public.payment_transactions
    WHERE status = 'success'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at) DESC
    LIMIT 12;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get city distribution for heatmap/charts
CREATE OR REPLACE FUNCTION public.get_city_distribution()
RETURNS TABLE (city_name TEXT, user_count INT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(city, 'Other') as city_name,
        count(*)::int as user_count
    FROM public.profiles
    GROUP BY city
    ORDER BY count(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

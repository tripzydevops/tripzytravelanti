-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    code text PRIMARY KEY,
    discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value numeric NOT NULL CHECK (discount_value > 0),
    max_uses integer,
    -- NULL means unlimited
    current_uses integer DEFAULT 0,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);
-- Create user_promo_usages table to track which user used which code
CREATE TABLE IF NOT EXISTS public.user_promo_usages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    promo_code text REFERENCES public.promo_codes(code) NOT NULL,
    used_at timestamp with time zone DEFAULT now(),
    transaction_id text -- Link to payment transaction if available
);
-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_promo_usages ENABLE ROW LEVEL SECURITY;
-- Policies for promo_codes
-- Admins can do everything
CREATE POLICY "Admins can do everything on promo_codes" ON public.promo_codes FOR ALL USING (public.is_admin());
-- Public (Users) can read active codes ONLY via the verify function, 
-- but we might want them to be able to read some basic info if we want to list available global codes.
-- However, for now, let's keep it restricted. 
-- We'll use a specific function `verify_promo_code` with SECURITY DEFINER to check codes.
-- Policies for user_promo_usages
-- Admins can view all
CREATE POLICY "Admins can view all usages" ON public.user_promo_usages FOR
SELECT USING (public.is_admin());
-- Users can view their own usages
CREATE POLICY "Users can view own usages" ON public.user_promo_usages FOR
SELECT USING (auth.uid() = user_id);
-- Function to verify a promo code (for User Checkout)
-- Returns JSON with status and discount info
CREATE OR REPLACE FUNCTION public.verify_promo_code(code_input text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE p_code public.promo_codes %ROWTYPE;
usage_count integer;
BEGIN -- clean input
code_input := trim(upper(code_input));
-- Fetch code
SELECT * INTO p_code
FROM public.promo_codes
WHERE code = code_input;
IF NOT FOUND THEN RETURN json_build_object('valid', false, 'message', 'Invalid promo code');
END IF;
IF NOT p_code.is_active THEN RETURN json_build_object(
    'valid',
    false,
    'message',
    'Promo code is inactive'
);
END IF;
IF p_code.expires_at IS NOT NULL
AND p_code.expires_at < now() THEN RETURN json_build_object(
    'valid',
    false,
    'message',
    'Promo code has expired'
);
END IF;
IF p_code.max_uses IS NOT NULL
AND p_code.current_uses >= p_code.max_uses THEN RETURN json_build_object(
    'valid',
    false,
    'message',
    'Promo code usage limit reached'
);
END IF;
-- Check if user has already used it (Optional: Business rule - 1 use per user?)
-- Let's enforce 1 use per user for now as it's standard for sub promos
IF auth.uid() IS NOT NULL THEN
SELECT count(*) INTO usage_count
FROM public.user_promo_usages
WHERE user_id = auth.uid()
    AND promo_code = code_input;
IF usage_count > 0 THEN RETURN json_build_object(
    'valid',
    false,
    'message',
    'You have already used this promo code'
);
END IF;
END IF;
RETURN json_build_object(
    'valid',
    true,
    'code',
    p_code.code,
    'discount_type',
    p_code.discount_type,
    'discount_value',
    p_code.discount_value,
    'message',
    'Promo code applied!'
);
END;
$$;
-- Function to apply a promo code (Called after successful payment)
CREATE OR REPLACE FUNCTION public.apply_promo_code(code_input text, txn_id text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE p_code public.promo_codes %ROWTYPE;
BEGIN code_input := trim(upper(code_input));
SELECT * INTO p_code
FROM public.promo_codes
WHERE code = code_input;
IF NOT FOUND
OR NOT p_code.is_active THEN RETURN false;
END IF;
-- Update usage count
UPDATE public.promo_codes
SET current_uses = current_uses + 1
WHERE code = code_input;
-- Record user usage
IF auth.uid() IS NOT NULL THEN
INSERT INTO public.user_promo_usages (user_id, promo_code, transaction_id)
VALUES (auth.uid(), code_input, txn_id);
END IF;
RETURN true;
END;
$$;
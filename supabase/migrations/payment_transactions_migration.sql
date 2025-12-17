-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    status VARCHAR(20) CHECK (
        status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    provider VARCHAR(50),
    -- 'stripe', 'iyzico', etc.
    provider_transaction_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
-- Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
CREATE POLICY "Users can view own transactions" ON payment_transactions FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all transactions" ON payment_transactions;
CREATE POLICY "Admins can view all transactions" ON payment_transactions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND (
                    profiles.role = 'admin'
                    OR profiles.is_admin = true
                )
        )
    );
DROP POLICY IF EXISTS "Service can insert transactions" ON payment_transactions;
CREATE POLICY "Service can insert transactions" ON payment_transactions FOR
INSERT WITH CHECK (true);
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);
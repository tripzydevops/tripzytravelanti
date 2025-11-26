-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('stripe', 'iyzico')),
    tier VARCHAR(20) NOT NULL,
    tax_id VARCHAR(100),
    transaction_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
-- Policy: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON payment_transactions FOR
SELECT USING (auth.uid() = user_id);
-- Policy: Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON payment_transactions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = auth.uid()
                AND users.is_admin = true
        )
    );
-- Policy: Service can insert transactions (service role)
CREATE POLICY "Service can insert transactions" ON payment_transactions FOR
INSERT WITH CHECK (true);
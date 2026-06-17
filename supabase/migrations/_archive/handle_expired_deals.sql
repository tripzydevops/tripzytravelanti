-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Create the function to handle expired deals
CREATE OR REPLACE FUNCTION handle_expired_deals() RETURNS void AS $$ BEGIN
UPDATE deals
SET status = 'expired'
WHERE expires_at < NOW()
    AND status NOT IN ('expired', 'rejected');
END;
$$ LANGUAGE plpgsql;
-- Schedule the function to run once a day at midnight
SELECT cron.schedule(
        'handle_expired_deals_job',
        '0 0 * * *',
        'SELECT handle_expired_deals()'
    );
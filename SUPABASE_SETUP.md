# Supabase Setup Guide for TRIPZY

This guide will help you set up and configure Supabase for the TRIPZY travel deals application.

## Prerequisites

- Supabase account ([Sign up here](https://supabase.com))
- Node.js and npm installed
- TRIPZY project files

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Fill in project details:
   - **Name**: TRIPZY (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **Create new project**
5. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Get Your Credentials

Your Supabase credentials are already configured in `.env.local`:

```
VITE_SUPABASE_URL=https://cwmerdoqeokuufotsvmd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Fr2T3b3eMzahfZKdGAGCrQ_IICOScGS
```

> **Note**: These credentials are already set up in your project. The anon/public key is safe to use in client-side code.

## Step 3: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from your project
4. Paste it into the SQL editor
5. Click **Run** or press `Ctrl+Enter`

This will create:
- ✅ All database tables (profiles, deals, saved_deals, referrals, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Triggers for automatic timestamps
- ✅ Seed data for subscription tiers
- ✅ Helper functions for referral tracking

## Step 4: Configure Authentication

### Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure settings:
   - ✅ Enable email confirmations (recommended for production)
   - ✅ For development, you can disable confirmations

### Enable Social Logins (Optional)

To enable Google, Facebook, or other social logins:

1. Go to **Authentication** → **Providers**
2. Click on the provider you want to enable
3. Follow the provider-specific setup instructions
4. Add the required credentials (Client ID, Client Secret)

## Step 5: Seed Sample Deals (Optional)

To add sample deals for testing, run this SQL in the SQL Editor:

```sql
INSERT INTO deals (
  title, title_tr, description, description_tr, image_url,
  category, category_tr, original_price, discounted_price,
  required_tier, is_external, vendor, expires_at,
  rating, rating_count, usage_limit, usage_limit_tr,
  validity, validity_tr, terms_url, redemption_code
) VALUES
(
  'Exclusive Dining Experience',
  'Özel Akşam Yemeği Deneyimi',
  'Enjoy a curated dining experience at a top-rated restaurant in Istanbul.',
  'İstanbul''un en iyi restoranlarından birinde özenle hazırlanmış bir akşam yemeği deneyimi.',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1074&q=80',
  'Dining', 'Yemek',
  120, 80,
  'PREMIUM', false, 'WanderWise Exclusives',
  NOW() + INTERVAL '30 days',
  4.8, 125,
  '1 per user', 'Kullanıcı başına 1',
  'Valid for 3 months', '3 ay geçerli',
  '#', 'WW-DINING-XYZ'
),
(
  'Weekend Getaway to Cappadocia',
  'Kapadokya''ya Hafta Sonu Kaçamağı',
  'Experience the magical landscapes with a hot air balloon ride.',
  'Sıcak hava balonu gezisi ile büyülü manzaraları deneyimleyin.',
  'https://images.unsplash.com/photo-1593436528333-a2453853846c?w=1287&q=80',
  'Travel', 'Seyahat',
  250, 200,
  'VIP', false, 'WanderWise Exclusives',
  NOW() + INTERVAL '60 days',
  4.9, 210,
  '2 people per deal', 'Fırsat başına 2 kişi',
  'Only valid on weekends', 'Sadece hafta sonları geçerli',
  '#', 'CAPP-VIP-2024'
);
```

## Step 6: Test the Integration

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

### Test Authentication

1. Open the app in your browser
2. Try signing up with a new email
3. Check Supabase dashboard → **Authentication** → **Users** to see the new user
4. Try signing in with the credentials

### Test Deal Operations

1. Browse deals in the app
2. Try saving/unsaving deals
3. Check Supabase dashboard → **Table Editor** → **saved_deals** to verify

## Step 7: Verify Database

In the Supabase dashboard:

1. Go to **Table Editor**
2. Check these tables:
   - **subscription_tiers** - Should have 4 tiers (FREE, BASIC, PREMIUM, VIP)
   - **profiles** - Will populate as users sign up
   - **deals** - Add sample deals or wait for admin to create them
   - **saved_deals** - Will populate as users save deals

## Database Schema Overview

```
┌─────────────────────┐
│ subscription_tiers  │
│ - id (PK)          │
│ - name             │
│ - price            │
│ - features         │
└─────────────────────┘
         ↑
         │
┌─────────────────────┐      ┌─────────────────────┐
│ profiles           │      │ deals              │
│ - id (PK)          │      │ - id (PK)          │
│ - name             │      │ - title            │
│ - email            │      │ - description      │
│ - tier (FK)        │      │ - price            │
│ - referred_by (FK) │      │ - required_tier    │
└─────────────────────┘      └─────────────────────┘
         │                            │
         │                            │
         └────────┬───────────────────┘
                  │
         ┌────────▼────────┐
         │ saved_deals     │
         │ - user_id (FK)  │
         │ - deal_id (FK)  │
         └─────────────────┘
```

## Troubleshooting

### "Missing Supabase environment variables" Error

- Check that `.env.local` exists and contains both variables
- Restart the dev server after adding environment variables

### Authentication Not Working

- Verify email provider is enabled in Supabase dashboard
- Check browser console for error messages
- Ensure RLS policies are set up correctly

### Deals Not Showing

- Run the seed data SQL to add sample deals
- Check that subscription tiers are created
- Verify the user's tier allows access to the deals

### Database Connection Issues

- Verify your Supabase project is active
- Check that the URL and anon key are correct
- Ensure you're not hitting rate limits (free tier has limits)

## Security Notes

> **Important**: The `VITE_SUPABASE_ANON_KEY` is safe to use in client-side code. It's protected by Row Level Security (RLS) policies.

> **Never commit** the secret key (`sb_secret_...`) to version control. Only use it for server-side operations.

## Next Steps

1. ✅ Database schema created
2. ✅ Authentication configured
3. ✅ Sample data added
4. 🔄 Update app contexts to use Supabase (see implementation plan)
5. 🔄 Test all features
6. 🔄 Deploy to production

## Production Checklist

Before deploying to production:

- [ ] Enable email confirmations
- [ ] Set up custom SMTP (optional, for branded emails)
- [ ] Configure custom domain for auth emails
- [ ] Review and test all RLS policies
- [ ] Set up database backups
- [ ] Monitor usage and set up alerts
- [ ] Add environment variables to Vercel/hosting platform

---

**Need Help?** Check [Supabase Documentation](https://supabase.com/docs) or [Supabase Discord](https://discord.supabase.com)

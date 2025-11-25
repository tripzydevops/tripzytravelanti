# 🔧 Fix Black Screen - Add Environment Variables to Vercel

## The Problem

Your app is deployed successfully on Vercel, but shows a **black screen** because the Supabase environment variables are missing. The app crashes on load when trying to initialize the Supabase client.

## The Solution

You need to add the Supabase environment variables to your Vercel project.

## Step-by-Step Instructions

### 1. Go to Vercel Dashboard

1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project: **tripzytravelanti**
3. Click on the project to open it

### 2. Navigate to Environment Variables

1. Click on **Settings** tab (top navigation)
2. Click on **Environment Variables** in the left sidebar

### 3. Add Supabase Variables

Add these **two** environment variables:

#### Variable 1: VITE_SUPABASE_URL
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://cwmerdoqeokuufotsvmd.supabase.co`
- **Environments**: Check all three boxes:
  - ✅ Production
  - ✅ Preview  
  - ✅ Development

Click **Save**

#### Variable 2: VITE_SUPABASE_ANON_KEY
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_Fr2T3b3eMzahfZKdGAGCrQ_IICOScGS`
- **Environments**: Check all three boxes:
  - ✅ Production
  - ✅ Preview
  - ✅ Development

Click **Save**

### 4. Redeploy Your App

**Important**: Adding environment variables doesn't automatically redeploy. You need to trigger a redeployment:

**Option A: Redeploy from Vercel Dashboard**
1. Go to the **Deployments** tab
2. Find the latest deployment
3. Click the **three dots (⋯)** menu
4. Click **Redeploy**
5. Confirm the redeployment

**Option B: Push a Small Change to GitHub**
```bash
# Make a small change (add a comment or space)
git add .
git commit -m "Trigger redeploy"
git push
```

### 5. Wait for Deployment

- Wait 1-2 minutes for Vercel to rebuild and redeploy
- Watch the deployment progress in the Vercel dashboard
- Once it shows "Ready", your app should work!

### 6. Test Your App

Visit your URL: https://tripzytravelanti-git-main-tripzys-projects-759c818d.vercel.app

You should now see:
- ✅ The login page (not a black screen)
- ✅ App loads correctly
- ✅ No console errors

## Visual Guide

Here's what you're looking for in Vercel:

```
Vercel Dashboard
└── Your Project (tripzytravelanti)
    └── Settings
        └── Environment Variables
            ├── Add: VITE_SUPABASE_URL
            └── Add: VITE_SUPABASE_ANON_KEY
```

## Troubleshooting

### Still Black Screen After Adding Variables?

1. **Make sure you redeployed** - Variables don't apply automatically
2. **Check variable names** - Must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Check all environments are selected** - Production, Preview, and Development
4. **Clear browser cache** - Hard refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### How to Verify Variables Are Set

1. Go to **Settings** → **Environment Variables**
2. You should see both variables listed
3. They should show "Production, Preview, Development" under "Environments"

### Check Browser Console

1. Open your deployed app
2. Press F12 to open Developer Tools
3. Go to **Console** tab
4. If you see errors about "Missing Supabase environment variables", the variables aren't set correctly

## Why This Happened

The Supabase client (`lib/supabaseClient.ts`) requires these environment variables to initialize:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```

When these variables are missing, the app crashes immediately on load, resulting in a black screen.

---

**After adding the variables and redeploying, your app should work perfectly!** 🎉

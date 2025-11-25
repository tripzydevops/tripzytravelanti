# 🚀 Deploying TRIPZY to Vercel

This guide will help you deploy your TRIPZY travel app to Vercel with continuous deployment via GitHub.

## Prerequisites

- ✅ Git installed on your computer
- ✅ GitHub account ([Sign up here](https://github.com/join))
- ✅ Vercel account ([Sign up here](https://vercel.com/signup))

## Step 1: Initialize Git Repository

If you haven't already, initialize Git in your project:

```bash
git init
git add .
git commit -m "Initial commit - TRIPZY travel app"
```

## Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository:
   - **Name**: `tripzy` (or your preferred name)
   - **Visibility**: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click **Create repository**

## Step 3: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

> Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

## Step 4: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. **Import Git Repository**:
   - Find your `tripzy` repository
   - Click **Import**
4. **Configure Project**:
   - **Framework Preset**: Vite (should auto-detect)
   - **Build Command**: `npm run build` (should auto-fill)
   - **Output Directory**: `dist` (should auto-fill)
   - Leave other settings as default
5. **Add Environment Variables**:
   - Click **Environment Variables**
   - Add: `GEMINI_API_KEY` = `your-api-key-here`
   - Copy the value from your `.env.local` file
6. Click **Deploy**

## Step 5: Wait for Deployment

Vercel will:
- ✅ Install dependencies
- ✅ Build your project
- ✅ Deploy to a production URL

This usually takes 1-2 minutes.

## Step 6: Access Your Live App

Once deployed, Vercel will provide:
- **Production URL**: `https://your-project.vercel.app`
- **Deployment Dashboard**: Monitor builds and logs

## 🎉 Continuous Deployment is Now Active!

Every time you push to GitHub:
1. Vercel automatically detects the change
2. Builds your project
3. Deploys the new version
4. Updates your live site

## Testing PWA on Mobile

1. Open your Vercel URL on a mobile device
2. You should see an "Add to Home Screen" prompt
3. Install the PWA and test offline functionality

## Troubleshooting

### Build Fails
- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Environment Variables Not Working
- Make sure you added `GEMINI_API_KEY` in Vercel dashboard
- Redeploy after adding environment variables

### App Not Loading
- Check browser console for errors
- Verify the build completed successfully
- Check that `vercel.json` routing is configured correctly

## Making Changes

To update your live app:

```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push
```

Vercel will automatically deploy the changes!

## Custom Domain (Optional)

To add a custom domain:
1. Go to your project in Vercel dashboard
2. Click **Settings** → **Domains**
3. Add your domain and follow DNS configuration steps

---

**Need Help?** Check [Vercel Documentation](https://vercel.com/docs) or [Vercel Support](https://vercel.com/support)

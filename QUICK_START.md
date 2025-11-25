# 🚀 Quick Start: Deploy TRIPZY to Vercel

## Current Status
✅ Project is ready for deployment  
✅ `vercel.json` configuration created  
✅ `.gitignore` properly configured  
⏳ Git installation in progress (requires your approval)

---

## Step 1: Complete Git Installation

**A Git installer window should be open** - approve the administrator prompt and follow the installation wizard:

1. Click **Yes** on the administrator prompt
2. Click **Next** through the installer (default settings are fine)
3. Click **Install** and wait for completion
4. Click **Finish**

**After installation, close and reopen your terminal/PowerShell** for Git to be available.

---

## Step 2: Initialize Git Repository

Open a **new PowerShell window** in your project folder and run:

```powershell
# Navigate to your project (if not already there)
cd "c:\Users\elif\OneDrive\Masaüstü\Yeni klasör (5)"

# Initialize Git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - TRIPZY travel app"
```

---

## Step 3: Create GitHub Repository

1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name**: `tripzy` (or your choice)
   - **Visibility**: Public or Private
   - **DO NOT** check "Initialize with README"
3. Click **Create repository**

---

## Step 4: Push to GitHub

GitHub will show you commands. Copy your repository URL and run:

```powershell
# Add GitHub as remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## Step 5: Deploy to Vercel

### 5.1 Sign Up/Login to Vercel
- Go to **https://vercel.com/signup**
- Sign up with GitHub (recommended)

### 5.2 Import Project
1. Click **Add New** → **Project**
2. Find your `tripzy` repository
3. Click **Import**

### 5.3 Configure Build Settings
Vercel should auto-detect everything, but verify:
- ✅ Framework: **Vite**
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`

### 5.4 Add Environment Variable
**CRITICAL**: Before deploying, add your API key:

1. Click **Environment Variables**
2. Add variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Copy from your `.env.local` file
   - **Environment**: All (Production, Preview, Development)
3. Click **Add**

### 5.5 Deploy!
Click **Deploy** and wait 1-2 minutes.

---

## Step 6: Access Your Live App

Once deployed:
- 🌐 **Production URL**: `https://your-project.vercel.app`
- 📱 **Test on mobile**: Open URL on your phone
- 📲 **Install PWA**: You should see "Add to Home Screen" prompt

---

## 🎉 Continuous Deployment Active!

Every time you push to GitHub:
```powershell
git add .
git commit -m "Your changes"
git push
```
Vercel automatically deploys! 🚀

---

## Need Help?

- **Git Issues**: Make sure you closed and reopened PowerShell after installation
- **Build Fails**: Check Vercel dashboard logs
- **Environment Variables**: Verify `GEMINI_API_KEY` is set in Vercel
- **Full Guide**: See `DEPLOYMENT.md` for detailed instructions

---

## What's Next?

After deployment, you can:
- 🔗 Add a custom domain in Vercel settings
- 📊 Monitor analytics in Vercel dashboard
- 🔄 Set up preview deployments for branches
- 👥 Invite team members to collaborate

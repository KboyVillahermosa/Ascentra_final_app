# 🚀 Quick Setup Guide - Fix Registration Error

## Current Issue
Your registration is failing because the Supabase URL in `.env` points to a non-existent project.

## ⚡ Quick Fix (5 minutes)

### Step 1: Create Supabase Project
1. **Go to**: https://supabase.com
2. **Sign in/up** with GitHub, Google, or email
3. **Click**: "New Project"
4. **Fill in**:
   - Project Name: `Ascentra Hiking App`
   - Database Password: (create a strong one - save it!)
   - Region: (choose closest to you)
5. **Click**: "Create new project"
6. **Wait**: 2-3 minutes for setup

### Step 2: Get Your Credentials
1. **Go to**: Settings → API (in left sidebar)
2. **Copy these two values**:
   - **Project URL** (starts with `https://`)
   - **anon public** key (long string starting with `eyJ`)

### Step 3: Update Your .env File
1. **Open**: `.env` file in your project
2. **Replace** the current content with:
```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL_HERE
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```
3. **Paste** your actual values (no quotes, no extra spaces)

### Step 4: Deploy Database Schema
1. **In Supabase Dashboard**: Go to SQL Editor
2. **Click**: "New Query"
3. **Copy & Paste**: The entire content from `deploy_schema.sql`
4. **Click**: "Run" button
5. **Wait**: for "Database schema deployed successfully!" message

### Step 5: Test the Fix
1. **Stop** your development server (Ctrl+C)
2. **Run**: `npm start`
3. **Try registration** again
4. **Check**: Console for success messages

## 🎯 Expected Results

✅ **Before Fix**: "Unable to connect to server" error  
✅ **After Fix**: "Registration successful! Please check your email for confirmation."

## 📁 Files Created for You

- `SUPABASE_SETUP_GUIDE.md` - Detailed setup instructions
- `deploy_schema.sql` - Complete database schema
- `REGISTRATION_ERROR_FIX.md` - Troubleshooting guide
- Updated `.env.example` - Template with clear instructions

## 🔧 Troubleshooting

**Still getting errors?**
1. Check browser console for specific error messages
2. Verify Supabase project is active (not paused)
3. Double-check URL and key are copied correctly
4. Ensure no extra spaces or quotes in `.env`
5. Restart development server after `.env` changes

**Need help?** Check the detailed guides or console logs for specific error messages.

## 🚀 Next Steps After Fix

1. **Test all features**: Registration, login, posting activities
2. **Customize**: Database schema if needed
3. **Configure**: Email templates in Supabase
4. **Deploy**: When ready for production

---

**⏱️ Total time**: ~5 minutes  
**💡 Tip**: Save your Supabase credentials securely for future reference!
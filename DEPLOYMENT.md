# AutoXShift v2.0 - Complete Deployment Guide

## Overview

This guide covers deploying AutoXShift to:
- **Backend**: Render (Node.js/Express API)
- **Frontend**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)

## Prerequisites

- GitHub account with repository: `ayushsaklani-min/AutoXshift_2.0`
- Render account (free tier available)
- Vercel account (free tier available)
- Supabase account (free tier available)
- API keys:
  - SideShift API key: https://sideshift.ai/settings/api
  - Google Gemini API key: https://ai.google.dev/
  - WalletConnect Project ID: https://cloud.walletconnect.com

## Step 1: Backend Deployment (Render)

### 1.1 Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `ayushsaklani-min/AutoXshift_2.0`
4. Select branch: `main`

### 1.2 Configure Service

**Critical Settings:**
- **Name**: `autoxshift-backend`
- **Environment**: `Node`
- **Region**: Choose closest to you (e.g., `Oregon`)
- **Root Directory**: `backend` ⚠️ **CRITICAL - Must be set to `backend`**
- **Branch**: `main`

**Build & Start Commands:**
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

**Note**: The `render.yaml` file in the repo already has these settings configured.

### 1.3 Environment Variables

Add these in the **Environment** tab:

```env
NODE_ENV=production
PORT=10000
LOG_LEVEL=INFO

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres

# SideShift API
SIDESHIFT_API_KEY=your_sideshift_api_key
X_SIDESHIFT_SECRET=your_sideshift_api_key
SIDESHIFT_AFFILIATE_ID=your_affiliate_id

# Google Gemini API
GOOGLE_API_KEY=your_google_gemini_api_key

# JWT Authentication
JWT_SECRET=generate_random_32_char_secret
JWT_EXPIRY=7d

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app

# Redis (Optional)
REDIS_URL=redis://your-redis-url:6379

# Encryption (Optional)
ENCRYPTION_KEY=your_encryption_key
```

**Important Notes:**
- Generate JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- URL-encode special characters in DATABASE_URL (e.g., `@` becomes `%40`)
- Use Supabase Session Pooler URL for better connection handling

### 1.4 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://autoxshift-backend.onrender.com`

### 1.5 Verify Backend

```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": { ... }
  }
}
```

## Step 2: Frontend Deployment (Vercel)

### 2.1 Create Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import repository: `ayushsaklani-min/AutoXshift_2.0`
4. Select branch: `main`

### 2.2 Configure Project

**Critical Settings:**
- **Framework Preset**: `Next.js` (auto-detected)
- **Root Directory**: `frontend` ⚠️ **CRITICAL - Must be set to `frontend`**
- **Build Command**: Auto-detected (uses `frontend/vercel.json`)
- **Output Directory**: `.next` (auto-detected)

**Note**: The `frontend/vercel.json` file is already configured.

### 2.3 Environment Variables

Add these in **Settings** → **Environment Variables**:

```env
# Backend API URL (your Render backend URL)
NEXT_PUBLIC_API_URL=https://autoxshift-backend.onrender.com

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Environment
NEXT_PUBLIC_ENV=production
```

**Important:**
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Set for all environments: Production, Preview, Development

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment (2-5 minutes)
3. Note your frontend URL: `https://your-app.vercel.app`

### 2.5 Update Backend with Frontend URL

1. Go back to Render dashboard
2. Edit your backend service
3. Update `FRONTEND_URL` environment variable with your Vercel URL
4. Save (service will restart automatically)

## Step 3: Database Setup (Supabase)

### 3.1 Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details
4. Note your project credentials

### 3.2 Initialize Database

1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of `backend/src/database/schema.sql`
3. Paste and run in SQL Editor
4. Verify tables are created

### 3.3 Get Connection String

1. Go to **Settings** → **Database**
2. Under **Connection String**, select **"Session pooler"** (recommended for Render)
3. Copy the connection string
4. Use it as `DATABASE_URL` in Render environment variables

**Connection String Format:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres
```

## Step 4: Post-Deployment Verification

### 4.1 Backend Health Check

```bash
curl https://your-backend.onrender.com/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "up",
      "redis": "down",  // OK if not using Redis
      "websocket": "up",
      "sideshift": "up",
      "googleai": "up"
    }
  }
}
```

### 4.2 Frontend Check

1. Visit: `https://your-app.vercel.app`
2. Check browser console for errors
3. Verify API calls are working
4. Test wallet connection
5. Test swap functionality

### 4.3 API Integration Test

```bash
# Get tokens
curl https://your-backend.onrender.com/api/swap/tokens

# Should return list of supported tokens
```

## Troubleshooting

### Backend Build Fails

**Error**: "cd: backend: No such file or directory"
- **Solution**: Set **Root Directory** to `backend` in Render settings

**Error**: "Cannot find module"
- **Solution**: Verify `rootDir` is set to `backend` so npm install runs correctly

**Error**: TypeScript compilation errors
- **Solution**: Check `backend/tsconfig.json` and ensure all dependencies are installed

### Frontend Build Fails

**Error**: "Module not found: Can't resolve 'pino-pretty'"
- **Solution**: This is handled in `frontend/next.config.js` - should not cause build failure

**Error**: "Cannot find module"
- **Solution**: Verify `rootDir` is set to `frontend` in Vercel settings

### Database Connection Fails

**Error**: "password authentication failed"
- **Solution**: 
  - Verify DATABASE_URL format
  - URL-encode special characters (`@` → `%40`)
  - Check Supabase project is active
  - Verify password is correct

**Error**: "Connection timeout"
- **Solution**:
  - Use Session Pooler URL (not direct connection)
  - Check Supabase network restrictions
  - Verify firewall rules

### API Calls Fail

**Error**: "Network error" or "CORS error"
- **Solution**:
  - Verify `FRONTEND_URL` is set correctly in backend
  - Check CORS settings in backend
  - Verify `NEXT_PUBLIC_API_URL` is set in Vercel

**Error**: "DNS resolution failed"
- **Solution**:
  - Backend DNS fixes are already applied
  - Check Render network settings
  - Verify SideShift API is accessible

### Environment Variables Not Loading

**Backend:**
- Restart service after adding env vars
- Verify variable names match exactly
- Check for typos

**Frontend:**
- Use `NEXT_PUBLIC_` prefix for client-side vars
- Redeploy after adding env vars
- Check Vercel environment variable settings

## Configuration Files

### render.yaml
Located at repo root. Configured for:
- Root directory: `backend`
- Build command: `npm ci && npm run build`
- Start command: `npm start`

### frontend/vercel.json
Located in frontend folder. Configured for:
- Framework: Next.js
- Build command: `npm ci && npm run build`
- Output directory: `.next`

## Environment Variable Reference

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `10000` (Render sets automatically) |
| `DATABASE_URL` | Yes | Supabase connection string |
| `SIDESHIFT_API_KEY` | Yes | SideShift API secret |
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `JWT_SECRET` | Yes | Random 32+ character string |
| `FRONTEND_URL` | Yes | Your Vercel frontend URL |
| `REDIS_URL` | No | Redis connection string |
| `LOG_LEVEL` | No | `INFO` (default) |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Your Render backend URL |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect project ID |
| `NEXT_PUBLIC_ENV` | No | `production` |

## Monitoring

### Render Monitoring
- Check service logs: Dashboard → Your Service → Logs
- Monitor uptime: Dashboard → Your Service → Metrics
- Set up alerts for downtime

### Vercel Monitoring
- Check function logs: Dashboard → Your Project → Functions
- Monitor analytics: Dashboard → Your Project → Analytics
- Review build logs: Dashboard → Your Project → Deployments

### Database Monitoring
- Supabase Dashboard → Database → Connection Pooling
- Monitor query performance
- Check connection count

## Updates and Maintenance

### Updating Code
1. Make changes locally
2. Test thoroughly
3. Commit and push to GitHub
4. Render and Vercel auto-deploy on push

### Updating Environment Variables
1. Update in Render/Vercel dashboard
2. Service restarts automatically
3. Verify changes took effect

### Database Migrations
1. Update `backend/src/database/schema.sql`
2. Run new migrations in Supabase SQL Editor
3. Test thoroughly before deploying

## Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Project Repository**: https://github.com/ayushsaklani-min/AutoXshift_2.0

## Quick Reference

### Backend URL
```
https://autoxshift-backend.onrender.com
```

### Frontend URL
```
https://your-app.vercel.app
```

### Health Check
```
https://autoxshift-backend.onrender.com/api/health
```

### API Endpoints
- Swaps: `/api/swap/*`
- Campaigns: `/api/campaigns/*`
- Analytics: `/api/analytics/*`
- AI: `/api/ai/*`
- WebSocket: `ws://autoxshift-backend.onrender.com/ws`

---

**Last Updated**: After cleanup and optimization
**Status**: Ready for deployment ✅

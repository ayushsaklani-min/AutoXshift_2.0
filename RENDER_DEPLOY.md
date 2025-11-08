# Render Deployment Guide

## Quick Setup

### 1. Create Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository: `ayushsaklani-min/AutoXshift_2.0`

### 2. Configure Service Settings

**Basic Settings:**
- **Name**: `autoxshift-backend`
- **Environment**: `Node`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **IMPORTANT: Set this to `backend`**

**Build & Deploy:**
- **Build Command**: `npm install && npm run build` (no `cd backend` needed - rootDir handles it)
- **Start Command**: `npm start`
- **Auto-Deploy**: Yes

### 3. Environment Variables

Add these in the Environment tab:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres:%40Yush8126497037@db.jsyhysugyhgduhgfinsc.supabase.co:5432/postgres
SIDESHIFT_API_KEY=90ee68590c589a33be1b4d16e19c000e
GOOGLE_API_KEY=AIzaSyANyQU1yJNalGnggvRHtOBl85TxQcPz5Z8
JWT_SECRET=eac6d0d9e7ad7f17ffd1badd628538b32fd046816c7fc302c9d4a4266ea1299e
FRONTEND_URL=https://your-frontend-url.com
REDIS_URL=redis://localhost:6379 (optional)
```

### 4. Health Check
- **Health Check Path**: `/api/health`

### 5. Deploy
Click "Create Web Service" and wait for deployment.

## Troubleshooting

### Build Fails: "cd: backend: No such file or directory"
**Solution**: Set **Root Directory** to `backend` in Render settings. This tells Render to run all commands from the `backend` directory.

### Build Fails: "Cannot find module"
**Solution**: Make sure `rootDir` is set to `backend` so npm install runs in the correct directory.

### Database Connection Fails
**Solution**: 
- Verify DATABASE_URL is correct
- Check password is URL-encoded (e.g., `@` becomes `%40`)
- Ensure Supabase project is active

### Port Issues
**Solution**: Render automatically sets PORT env var. Don't hardcode port numbers in code.

## Important Notes

1. **Root Directory MUST be `backend`** - This is critical for the build to work
2. **No `cd backend` in commands** - Root directory handles this
3. **Environment variables** - Set all required vars before first deploy
4. **Health check** - Must be `/api/health` for Render to detect service health

## After Deployment

1. Check logs: Dashboard → Your Service → Logs
2. Test health endpoint: `https://your-service.onrender.com/api/health`
3. Verify database connection in logs
4. Test API endpoints


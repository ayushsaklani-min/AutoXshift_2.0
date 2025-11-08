# Deployment Guide for AutoXShift v2.0

## Prerequisites
- GitHub account
- Vercel account (for frontend)
- Render account (for backend)
- Supabase account (for PostgreSQL database)

## Backend Deployment (Render)

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Connect Repository to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `ayushsaklani-min/AutoXshift_2.0`
4. Select the repository and branch (main)

### 3. Configure Render Service
- **Name**: `autoxshift-backend`
- **Environment**: `Node`
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm start`
- **Root Directory**: Leave empty (or set to `backend` if needed)

### 4. Set Environment Variables in Render
Go to Environment tab and add:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SIDESHIFT_API_KEY=your_sideshift_api_key
GOOGLE_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend.vercel.app
REDIS_URL=redis://your-redis-url (optional)
```

**Important**: Replace `[PASSWORD]` and `[PROJECT]` with your actual Supabase credentials.

### 5. Health Check
Render will automatically check `/api/health` endpoint.

## Frontend Deployment (Vercel)

### 1. Connect Repository to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository: `ayushsaklani-min/AutoXshift_2.0`

### 2. Configure Vercel Project
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)

### 3. Set Environment Variables in Vercel
Go to Settings → Environment Variables and add:

```
NEXT_PUBLIC_API_URL=https://autoxshift-backend.onrender.com
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 4. Deploy
Click "Deploy" and wait for the build to complete.

## Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note your database password and connection string

### 2. Run Database Schema
1. Go to SQL Editor in Supabase
2. Copy the contents of `backend/src/database/schema.sql`
3. Paste and run in SQL Editor

### 3. Get Connection String
1. Go to Settings → Database
2. Copy the connection string (URI format)
3. Use it in Render environment variables

## Post-Deployment Checklist

- [ ] Backend is accessible at `https://autoxshift-backend.onrender.com/api/health`
- [ ] Frontend is accessible at `https://your-app.vercel.app`
- [ ] Database connection is working (check backend logs)
- [ ] API endpoints are responding
- [ ] Frontend can connect to backend API
- [ ] Wallet connection works
- [ ] Swap functionality works

## Troubleshooting

### Backend Issues
- **Build fails**: Check Node version (should be 18+)
- **Database connection fails**: Verify DATABASE_URL format and credentials
- **Port issues**: Render uses port 10000 by default

### Frontend Issues
- **Build fails**: Check Next.js version compatibility
- **API calls fail**: Verify NEXT_PUBLIC_API_URL is set correctly
- **Environment variables not loading**: Restart deployment after adding env vars

## Environment Variables Reference

### Backend (Render)
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render default)
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `SIDESHIFT_API_KEY`: Your SideShift.ai API key
- `GOOGLE_API_KEY`: Your Google Gemini API key
- `JWT_SECRET`: Random secret for JWT tokens
- `FRONTEND_URL`: Your Vercel frontend URL
- `REDIS_URL`: (Optional) Redis connection string

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL`: Your Render backend URL
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: WalletConnect project ID

## Support
For issues, check:
- Render logs: Dashboard → Your Service → Logs
- Vercel logs: Dashboard → Your Project → Deployments → View Function Logs
- Backend health: `https://your-backend.onrender.com/api/health`


# Deployment Checklist for AutoXShift v2.0

## ✅ Pre-Deployment Checklist

### Code Repository
- [x] Code pushed to GitHub: `ayushsaklani-min/AutoXshift_2.0`
- [x] All environment files excluded from git (.env, .env.local)
- [x] Deployment configs created (render.yaml, vercel.json)
- [x] Build scripts verified

### Backend (Render)
- [ ] Create Render account and connect GitHub
- [ ] Create new Web Service
- [ ] Set build command: `cd backend && npm install && npm run build`
- [ ] Set start command: `cd backend && npm start`
- [ ] Set environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `DATABASE_URL` (Supabase connection string)
  - [ ] `SIDESHIFT_API_KEY`
  - [ ] `GOOGLE_API_KEY`
  - [ ] `JWT_SECRET` (generate random secret)
  - [ ] `FRONTEND_URL` (will update after Vercel deploy)
  - [ ] `REDIS_URL` (optional)
- [ ] Verify health check endpoint: `/api/health`
- [ ] Test backend API endpoints

### Frontend (Vercel)
- [ ] Create Vercel account and connect GitHub
- [ ] Import repository: `ayushsaklani-min/AutoXshift_2.0`
- [ ] Set root directory: `frontend`
- [ ] Framework: Next.js (auto-detected)
- [ ] Set environment variables:
  - [ ] `NEXT_PUBLIC_API_URL` (your Render backend URL)
  - [ ] `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- [ ] Deploy and get frontend URL
- [ ] Update backend `FRONTEND_URL` env var with Vercel URL

### Database (Supabase)
- [ ] Create Supabase project
- [ ] Run database schema: `backend/src/database/schema.sql`
- [ ] Get connection string from Supabase dashboard
- [ ] Test database connection
- [ ] Verify tables created successfully

## 🚀 Deployment Steps

### Step 1: Deploy Backend (Render)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Select `ayushsaklani-min/AutoXshift_2.0`
5. Configure:
   - Name: `autoxshift-backend`
   - Environment: `Node`
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
6. Add environment variables (see above)
7. Click "Create Web Service"
8. Wait for deployment (5-10 minutes)
9. Note your backend URL: `https://autoxshift-backend.onrender.com`

### Step 2: Deploy Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import `ayushsaklani-min/AutoXshift_2.0`
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Your WalletConnect ID
6. Click "Deploy"
7. Wait for deployment (2-5 minutes)
8. Note your frontend URL: `https://your-app.vercel.app`

### Step 3: Update Backend with Frontend URL
1. Go back to Render dashboard
2. Edit your backend service
3. Update `FRONTEND_URL` environment variable with your Vercel URL
4. Save and redeploy

### Step 4: Database Setup
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project
3. Go to SQL Editor
4. Copy contents of `backend/src/database/schema.sql`
5. Paste and run in SQL Editor
6. Go to Settings → Database
7. Copy connection string (URI format)
8. Use in Render `DATABASE_URL` environment variable

## ✅ Post-Deployment Verification

### Backend Health Check
- [ ] Visit: `https://your-backend.onrender.com/api/health`
- [ ] Should return: `{ "status": "healthy", ... }`
- [ ] Check Render logs for any errors

### Frontend Check
- [ ] Visit: `https://your-app.vercel.app`
- [ ] Page loads without errors
- [ ] Check browser console for errors
- [ ] Check Vercel function logs

### API Integration
- [ ] Frontend can connect to backend API
- [ ] Wallet connection works
- [ ] Swap functionality works
- [ ] Database queries succeed (check backend logs)

### Database Connection
- [ ] Backend logs show: "✅ Database connection successful"
- [ ] No database connection errors in logs
- [ ] Test API endpoints that use database

## 🔧 Troubleshooting

### Backend Issues
**Build fails:**
- Check Node version (should be 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

**Database connection fails:**
- Verify DATABASE_URL format
- Check Supabase project is active
- Verify password is URL-encoded if contains special chars
- Check network restrictions in Supabase

**Port issues:**
- Render uses PORT env var automatically
- Don't hardcode port numbers
- Use `process.env.PORT || 3001`

### Frontend Issues
**Build fails:**
- Check Next.js version compatibility
- Verify all dependencies installed
- Check for TypeScript errors

**API calls fail:**
- Verify NEXT_PUBLIC_API_URL is set correctly
- Check CORS settings in backend
- Verify backend is accessible

**Environment variables not loading:**
- Restart deployment after adding env vars
- Use NEXT_PUBLIC_ prefix for client-side vars
- Check Vercel environment variable settings

## 📊 Monitoring

### Render Monitoring
- Check service logs regularly
- Monitor response times
- Set up alerts for downtime

### Vercel Monitoring
- Check function logs
- Monitor build times
- Review analytics

### Database Monitoring
- Monitor Supabase dashboard
- Check connection pool usage
- Review query performance

## 🔄 Updates and Maintenance

### Updating Code
1. Make changes locally
2. Test thoroughly
3. Commit and push to GitHub
4. Render and Vercel auto-deploy on push

### Updating Environment Variables
1. Update in Render/Vercel dashboard
2. Service will restart automatically
3. Verify changes took effect

### Database Migrations
1. Update schema.sql
2. Run new migrations in Supabase SQL Editor
3. Test thoroughly before deploying

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: https://github.com/ayushsaklani-min/AutoXshift_2.0/issues

---

**Last Updated**: After successful deployment
**Status**: Ready for deployment ✅


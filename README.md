# AutoXShift v2.0 - AI-Powered Cross-Chain Financial Ecosystem

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ayushsaklani-min/AutoXshift_2.0)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

> **Next-generation DeFi platform** combining AI intelligence with seamless cross-chain token swaps, portfolio management, and community-driven fundraising.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (Supabase recommended)
- SideShift.ai API key
- Google Gemini API key

### Local Development

```bash
# Clone repository
git clone https://github.com/ayushsaklani-min/AutoXshift_2.0.git
cd AutoXshift_2.0

# Install dependencies
npm run install:all

# Setup environment variables
cp backend/env.example backend/.env
cp frontend/env.local.example frontend/.env.local

# Configure your .env files with API keys

# Start development servers
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 📦 Deployment

### Backend (Render)

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - New → Web Service
   - Connect GitHub repository

2. **Configure Service**
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: Node

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=your_supabase_connection_string
   SIDESHIFT_API_KEY=your_key
   GOOGLE_API_KEY=your_key
   JWT_SECRET=your_secret
   FRONTEND_URL=https://your-app.vercel.app
   ```

### Frontend (Vercel)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import GitHub repository

2. **Configure Project**
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detected)

3. **Set Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
   ```

📖 **Full deployment guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## ✨ Features

### Core Features
- 🔄 **Cross-Chain Swaps** - Seamless token swaps via SideShift.ai
- 🤖 **AI Portfolio Assistant** - Intelligent portfolio analysis and recommendations
- 💰 **Campaign Fundraising** - Create and manage fundraising campaigns
- 📊 **Real-Time Analytics** - Track swaps, volume, and user activity
- 🔔 **Notifications** - Real-time updates via WebSocket
- 👥 **Social Feed** - Share insights and swap activities

### Technical Features
- ✅ PostgreSQL database with comprehensive schema
- ✅ Redis caching (optional)
- ✅ WebSocket real-time updates
- ✅ JWT authentication
- ✅ Rate limiting and security headers
- ✅ Comprehensive error handling
- ✅ TypeScript throughout
- ✅ Production-ready deployment configs

## 🏗️ Architecture

```
AutoXShift v2.0
├── frontend/          # Next.js 14 App Router
│   ├── app/          # Pages and routes
│   ├── components/   # React components
│   └── lib/          # Utilities and API clients
│
├── backend/          # Express.js API
│   ├── src/
│   │   ├── routes/  # API endpoints
│   │   ├── services/ # Business logic
│   │   ├── database/ # Database schema and connection
│   │   └── middleware/ # Auth, validation, security
│   └── scripts/     # Deployment scripts
│
└── docs/            # Documentation
```

## 🔧 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, TailwindCSS, ShadCN UI
- **Web3**: Wagmi, Viem, Ethers.js
- **State**: TanStack Query
- **Styling**: TailwindCSS, Framer Motion

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis (optional)
- **AI**: Google Gemini 1.5 Flash
- **WebSocket**: ws

## 📚 API Documentation

### Health Check
```
GET /api/health
```

### Swap Endpoints
```
GET  /api/swap/tokens
POST /api/swap/quote
POST /api/swap/shift
GET  /api/swap/status/:shiftId
```

### AI Endpoints
```
POST /api/ai/recommend
POST /api/ai/analyze
POST /api/ai/explain
POST /api/ai/optimize
```

### Campaign Endpoints
```
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
POST   /api/campaigns/:id/donate
```

See full API docs in code comments and [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://...
SIDESHIFT_API_KEY=your_key
GOOGLE_API_KEY=your_key
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379 (optional)
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## 🗄️ Database Schema

The database includes tables for:
- Users and authentication
- Swap history
- Campaigns and donations
- AI insights
- Portfolio snapshots
- Analytics events
- Notifications
- Social posts and interactions
- Referrals and rewards

See `backend/src/database/schema.sql` for full schema.

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ayushsaklani-min/AutoXshift_2.0/issues)
- **Documentation**: See [DEPLOYMENT.md](./DEPLOYMENT.md) and [ARCHITECTURE_V2.md](./ARCHITECTURE_V2.md)

## 🙏 Acknowledgments

- SideShift.ai for cross-chain swap infrastructure
- Google Gemini for AI capabilities
- Supabase for PostgreSQL hosting
- Vercel and Render for deployment platforms

---

**Built with ❤️ by the AutoXShift Team**

# AutoXShift v2.0 Architecture

## System Overview

AutoXShift v2.0 is a comprehensive AI-powered cross-chain financial ecosystem built with a modern, scalable architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Web App    │  │  Mobile App  │  │   API Users  │    │
│  │  (Next.js)   │  │   (Future)   │  │   (Future)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          │ HTTP/HTTPS       │                  │
          │ WebSocket        │                  │
┌─────────▼──────────────────▼──────────────────▼────────────┐
│                  API Gateway Layer                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Express.js Server (Port 3001)               │  │
│  │  - Authentication Middleware                       │  │
│  │  - Rate Limiting                                   │  │
│  │  - Request Validation                              │  │
│  │  - Error Handling                                  │  │
│  └────────────────────────────────────────────────────┘  │
└─────────┬──────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────┐
│                  Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Swap Service │  │ AI Service   │  │Campaign Svc  │    │
│  │ (SideShift)  │  │ (Gemini)     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │Portfolio Svc │  │Analytics Svc │  │  Auth Svc    │    │
│  │              │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────┬──────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────┐
│                  Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │    Redis     │  │  WebSocket   │    │
│  │   Database    │  │    Cache     │  │   Server     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────┬──────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────┐
│              External Services Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ SideShift.ai │  │ Google Gemini│  │  Blockchain  │    │
│  │     API      │  │     API      │  │   Networks   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Client Layer

#### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Hooks + TanStack Query
- **Web3**: Wagmi + Viem
- **Real-time**: WebSocket client

**Key Pages:**
- `/` - Home/Dashboard
- `/swap` - Token Swaps
- `/campaigns` - Campaign Management
- `/portfolio` - Portfolio Analysis
- `/analytics` - Analytics Dashboard
- `/ai-insights` - AI Insights Hub

### 2. API Gateway Layer

#### Express.js Server
- **Port**: 3001
- **Middleware Stack**:
  - Helmet (Security headers)
  - CORS (Cross-origin requests)
  - Compression (Response compression)
  - Rate Limiting (100 req/15min)
  - Body Parser (JSON/URL-encoded)
  - Authentication (JWT)
  - Error Handler (Centralized)

**Routes:**
```
/api/auth/*          - Authentication
/api/swap/*          - Token swaps
/api/ai/*            - AI features
/api/campaigns/*     - Campaigns
/api/portfolio/*     - Portfolio
/api/analytics/*     - Analytics
/ws                  - WebSocket
```

### 3. Service Layer

#### Swap Service
- **Purpose**: Handle cross-chain token swaps
- **Integration**: SideShift.ai API
- **Features**:
  - Quote generation
  - Shift creation
  - Status tracking
  - Database persistence

#### AI Service
- **Purpose**: AI-powered recommendations
- **Integration**: Google Gemini 1.5 Flash
- **Features**:
  - Swap timing recommendations
  - Market analysis
  - Transaction explanations
  - Portfolio insights

#### Campaign Service
- **Purpose**: Fundraising campaigns
- **Features**:
  - Campaign creation
  - Donation processing
  - Progress tracking
  - Goal monitoring

#### Portfolio Service
- **Purpose**: Portfolio management
- **Features**:
  - Snapshot creation
  - AI analysis
  - Diversification scoring
  - Rebalancing suggestions

#### Analytics Service
- **Purpose**: Analytics and statistics
- **Features**:
  - Event tracking
  - Dashboard stats
  - Swap statistics
  - User activity

#### Auth Service
- **Purpose**: Authentication and user management
- **Features**:
  - JWT token generation
  - User creation
  - Referral system
  - Points/rewards

### 4. Data Layer

#### PostgreSQL Database
- **Version**: PostgreSQL 15
- **Purpose**: Persistent data storage
- **Tables**: 11 core tables
- **Features**:
  - ACID compliance
  - Foreign key constraints
  - Indexes for performance
  - Automatic timestamps

**Key Tables:**
- `users` - User accounts
- `swaps` - Swap history
- `campaigns` - Fundraising campaigns
- `donations` - Campaign donations
- `analytics_events` - Event logging
- `portfolio_snapshots` - Portfolio history

#### Redis Cache
- **Version**: Redis 7
- **Purpose**: Caching layer
- **Features**:
  - Quote caching (5 min TTL)
  - Token list caching (1 hour TTL)
  - AI response caching (15 min TTL)
  - User data caching

**Cache Keys:**
- `quote:{from}:{fromNet}:{to}:{toNet}:{amount}`
- `tokens:all`
- `ai:recommend:{from}:{to}:{amount}`
- `ai:analysis:{tokens}`
- `user:{userId}`
- `campaign:{campaignId}`

#### WebSocket Server
- **Purpose**: Real-time communication
- **Features**:
  - Connection management
  - Channel subscriptions
  - User-specific messaging
  - Broadcast capabilities

**Channels:**
- `swap:{shiftId}` - Swap updates
- `campaign:{campaignId}` - Campaign updates
- `user:{userId}` - User notifications

### 5. External Services

#### SideShift.ai API
- **Purpose**: Cross-chain swaps
- **Integration**: REST API
- **Features**:
  - Quote generation
  - Shift creation
  - Status tracking

#### Google Gemini API
- **Purpose**: AI features
- **Model**: Gemini 1.5 Flash
- **Features**:
  - Natural language processing
  - Market analysis
  - Recommendations

## Data Flow

### Swap Flow
```
User → Frontend → API Gateway → Swap Service → SideShift API
                                              ↓
User ← Frontend ← WebSocket ← Database ← Save Swap
```

### Campaign Donation Flow
```
User → Frontend → API Gateway → Campaign Service → Swap Service → SideShift API
                                                      ↓
User ← Frontend ← WebSocket ← Database ← Save Donation
```

### AI Recommendation Flow
```
User → Frontend → API Gateway → AI Service → Gemini API
                                          ↓
User ← Frontend ← Cache ← AI Service ← Process Response
```

## Security Architecture

### Authentication
- **Method**: JWT tokens
- **Expiry**: 7 days (configurable)
- **Storage**: Client-side (localStorage/cookies)
- **Validation**: Middleware on protected routes

### Authorization
- **Levels**: Public, Optional Auth, Required Auth
- **Implementation**: Express middleware
- **User Context**: Available in `req.user`

### Data Protection
- **Encryption**: At rest (database)
- **HTTPS**: Required in production
- **CORS**: Configured for frontend origin
- **Rate Limiting**: 100 requests per 15 minutes

## Scalability Considerations

### Horizontal Scaling
- **Stateless API**: Can run multiple instances
- **Database**: Connection pooling (max 20 connections)
- **Redis**: Can be clustered
- **Load Balancer**: Nginx reverse proxy

### Performance Optimization
- **Caching**: Redis for frequently accessed data
- **Database Indexes**: On frequently queried columns
- **Connection Pooling**: PostgreSQL connection pool
- **Compression**: Gzip compression enabled

### Monitoring
- **Logging**: Structured logging with Winston
- **Health Checks**: `/api/health` endpoint
- **Metrics**: Analytics events table
- **Error Tracking**: Centralized error handler

## Deployment Architecture

### Development
```
Local Machine
├── Frontend (localhost:3000)
├── Backend (localhost:3001)
├── PostgreSQL (localhost:5432)
└── Redis (localhost:6379)
```

### Production (Docker)
```
Docker Compose
├── Frontend Container
├── Backend Container
├── PostgreSQL Container
├── Redis Container
└── Nginx Reverse Proxy
```

### Production (Cloud)
```
Cloud Infrastructure
├── Frontend (Vercel/Netlify)
├── Backend (Render/Railway)
├── PostgreSQL (Managed Database)
├── Redis (Managed Cache)
└── CDN (Cloudflare)
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.3
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **WebSocket**: ws 8.14
- **Auth**: jsonwebtoken 9.0

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript 5.3
- **Styling**: TailwindCSS 3.3
- **UI Components**: ShadCN UI
- **Web3**: Wagmi 1.4 + Viem 1.19
- **State**: TanStack Query 5.14

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions (to be configured)

## Future Enhancements

### Phase 1 (Current)
- ✅ Database integration
- ✅ Redis caching
- ✅ WebSocket support
- ✅ JWT authentication
- ✅ Campaign module
- ✅ Portfolio assistant

### Phase 2 (Next)
- [ ] Notification service
- [ ] TTS engine
- [ ] Social feed
- [ ] Advanced AI features
- [ ] Mobile app

### Phase 3 (Future)
- [ ] AI Strategy Builder
- [ ] SmartVaults
- [ ] Chainlink integration
- [ ] EAS reputation
- [ ] Multi-chain automation

---

**Version**: 2.0.0  
**Last Updated**: 2024


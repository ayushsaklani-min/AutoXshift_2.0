# AutoXShift v2.0 - Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (optional, for full stack)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)
- SideShift API key
- Google Gemini API key

## Quick Start (Docker)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd AutoShifX
```

### 2. Configure Environment

```bash
# Copy environment example
cp backend/env.example backend/.env

# Edit backend/.env with your API keys
nano backend/.env
```

Required environment variables:
```env
SIDESHIFT_API_KEY=your_sideshift_secret
GOOGLE_API_KEY=your_google_api_key
JWT_SECRET=your-secret-key
```

### 3. Start Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Backend API (port 3001)
- Frontend (port 3000)

### 4. Initialize Database

The database schema will be automatically initialized on first run. To manually initialize:

```bash
docker-compose exec database psql -U autoxshift -d autoxshift -f /docker-entrypoint-initdb.d/01-schema.sql
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws
- API Docs: http://localhost:3001/

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup Database

```bash
# Install PostgreSQL and create database
createdb autoxshift

# Run schema
psql -d autoxshift -f backend/src/database/schema.sql
```

### 3. Setup Redis

```bash
# Install and start Redis
redis-server
```

### 4. Configure Environment

```bash
# Backend
cp backend/env.example backend/.env
# Edit backend/.env with your settings

# Frontend
cp frontend/env.local.example frontend/.env.local
# Edit frontend/.env.local
```

### 5. Start Development Servers

```bash
# From root directory
npm run dev

# Or separately:
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## First Steps

### 1. Authenticate

```bash
# POST /api/auth/wallet
curl -X POST http://localhost:3001/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYourWalletAddress"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "walletAddress": "0x...",
      "points": 100
    },
    "token": "jwt-token"
  }
}
```

### 2. Get Swap Quote

```bash
# POST /api/swap/quote
curl -X POST http://localhost:3001/api/swap/quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fromToken": "BTC",
    "fromNetwork": "BTC",
    "toToken": "ETH",
    "toNetwork": "ETH",
    "amount": "0.001",
    "settleAddress": "0xYourWalletAddress"
  }'
```

### 3. Create Campaign

```bash
# POST /api/campaigns
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Help Build Schools",
    "description": "Supporting education in developing countries",
    "goalAmount": "10000",
    "goalToken": "USDC",
    "goalNetwork": "ETH",
    "category": "education"
  }'
```

### 4. Connect WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'YOUR_JWT_TOKEN'
  }));

  // Subscribe to swap updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'swap:SHIFT_ID'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## Testing the Upgrade

### 1. Database Connection

```bash
# Check database connection
curl http://localhost:3001/api/health
```

### 2. Redis Cache

```bash
# Check Redis (via backend logs)
# Look for "Redis client connected" message
```

### 3. WebSocket

```bash
# Use WebSocket client or browser console
# Connect to ws://localhost:3001/ws
```

### 4. Authentication

```bash
# Test authentication
curl -X POST http://localhost:3001/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x123..."}'
```

## Common Issues

### Database Connection Failed

**Problem**: Backend can't connect to PostgreSQL

**Solution**:
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Check database exists: `psql -l | grep autoxshift`
4. Ensure schema is initialized

### Redis Connection Failed

**Problem**: Backend can't connect to Redis

**Solution**:
1. Check Redis is running: `redis-cli ping`
2. Verify `REDIS_URL` in `.env`
3. Check Redis logs

### WebSocket Not Working

**Problem**: WebSocket connections fail

**Solution**:
1. Ensure using HTTP server (not just Express app)
2. Check WebSocket path: `/ws`
3. Verify CORS allows WebSocket origin
4. Check firewall/proxy settings

### Authentication Fails

**Problem**: JWT tokens not working

**Solution**:
1. Verify `JWT_SECRET` is set in `.env`
2. Check token is included in `Authorization: Bearer` header
3. Verify token hasn't expired
4. Check user exists in database

## Next Steps

1. **Explore API**: Check `/api/health` for available endpoints
2. **Create Campaign**: Use the campaigns API to create a fundraising campaign
3. **Test Swaps**: Create a swap and watch it via WebSocket
4. **View Analytics**: Check dashboard stats at `/api/analytics/dashboard`
5. **Build Frontend**: Integrate the new APIs into your frontend

## Development Tips

### Database Migrations

```bash
# Connect to database
psql -d autoxshift

# View tables
\dt

# View schema
\d users
```

### Redis Inspection

```bash
# Connect to Redis
redis-cli

# List all keys
KEYS *

# Get cached value
GET "quote:BTC:BTC:ETH:ETH:0.001"
```

### Logs

```bash
# Backend logs
docker-compose logs -f backend

# All logs
docker-compose logs -f
```

## Production Deployment

### Environment Variables

Ensure all production secrets are set:
- `JWT_SECRET` - Strong random string
- `DB_PASSWORD` - Strong database password
- `SIDESHIFT_API_KEY` - Your SideShift secret
- `GOOGLE_API_KEY` - Your Gemini API key

### Database Backup

```bash
# Backup database
pg_dump -U autoxshift autoxshift > backup.sql

# Restore database
psql -U autoxshift autoxshift < backup.sql
```

### Monitoring

- Health check: `GET /api/health`
- Database: Monitor connection pool
- Redis: Monitor memory usage
- WebSocket: Monitor active connections

---

**Need Help?** Check the main README.md or open an issue on GitHub.


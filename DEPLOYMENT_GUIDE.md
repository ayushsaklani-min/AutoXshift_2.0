# AutoXShift v2.0 - Deployment Guide

## Pre-Deployment Checklist

### Environment Setup
- [ ] All environment variables configured
- [ ] Database credentials set
- [ ] Redis credentials set
- [ ] API keys configured (SideShift, Google Gemini)
- [ ] JWT secret set (strong random string)
- [ ] CORS origins configured
- [ ] Production database initialized

### Security
- [ ] JWT_SECRET is strong and unique
- [ ] Database password is strong
- [ ] API keys are secure
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Security headers enabled

### Infrastructure
- [ ] PostgreSQL 15+ running
- [ ] Redis 7+ running
- [ ] Node.js 18+ installed
- [ ] Docker (optional) installed
- [ ] Reverse proxy configured (Nginx)

## Deployment Options

### Option 1: Docker Compose (Recommended)

**Prerequisites:**
```bash
docker --version
docker-compose --version
```

**Steps:**
1. Configure environment:
```bash
cp backend/env.example backend/.env
# Edit backend/.env with production values
```

2. Start services:
```bash
docker-compose up -d
```

3. Initialize database:
```bash
docker-compose exec database psql -U autoxshift -d autoxshift -f /docker-entrypoint-initdb.d/01-schema.sql
```

4. Check logs:
```bash
docker-compose logs -f backend
```

### Option 2: Manual Deployment

**Backend:**
```bash
cd backend
npm install --production
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm install --production
npm run build
npm start
```

### Option 3: PM2 (Process Manager)

**Install PM2:**
```bash
npm install -g pm2
```

**Start Backend:**
```bash
cd backend
npm run build
pm2 start dist/index.js --name autoxshift-backend
pm2 save
pm2 startup
```

**Start Frontend:**
```bash
cd frontend
npm run build
pm2 start npm --name autoxshift-frontend -- start
pm2 save
```

**PM2 Commands:**
```bash
pm2 list              # View processes
pm2 logs              # View logs
pm2 restart all        # Restart all
pm2 stop all          # Stop all
pm2 delete all        # Delete all
```

## Database Setup

### Initialize Database

**Using Script:**
```bash
cd backend
chmod +x scripts/init-db.sh
./scripts/init-db.sh
```

**Or Manually:**
```bash
createdb autoxshift
psql -d autoxshift -f backend/src/database/schema.sql
```

### Database Migrations

For production, use a proper migration system:
```bash
# Example with node-pg-migrate
npm install -g node-pg-migrate
node-pg-migrate up
```

## Redis Setup

### Local Redis
```bash
redis-server
```

### Docker Redis
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### Production Redis (Managed)
- Use Redis Cloud, AWS ElastiCache, or similar
- Update REDIS_URL in environment variables

## Nginx Configuration

**Example nginx.conf:**
```nginx
server {
    listen 80;
    server_name autoxshift.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://autoxshift.com

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=autoxshift
DB_USER=autoxshift
DB_PASSWORD=strong-password-here

# Redis
REDIS_URL=redis://your-redis-host:6379

# APIs
SIDESHIFT_API_KEY=your-key
GOOGLE_API_KEY=your-key

# Security
JWT_SECRET=very-strong-random-secret-here
JWT_EXPIRY=7d
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.autoxshift.com
NEXT_PUBLIC_WS_URL=wss://api.autoxshift.com/ws
```

## Health Checks

### Manual Health Check
```bash
curl https://api.autoxshift.com/api/health
```

### Expected Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "up",
      "redis": "up",
      "websocket": "up",
      "sideshift": "up",
      "googleai": "up"
    }
  }
}
```

## Monitoring

### Application Metrics
- Health endpoint: `/api/health`
- Metrics endpoint: `/api/analytics/dashboard`
- Logs: Check application logs

### Database Monitoring
```bash
# Connection count
psql -d autoxshift -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
psql -d autoxshift -c "SELECT pg_size_pretty(pg_database_size('autoxshift'));"
```

### Redis Monitoring
```bash
redis-cli INFO
redis-cli MONITOR
```

## Backup Strategy

### Database Backup
```bash
# Daily backup
pg_dump -U autoxshift autoxshift > backup_$(date +%Y%m%d).sql

# Restore
psql -U autoxshift autoxshift < backup_20240101.sql
```

### Automated Backups
```bash
# Add to crontab
0 2 * * * pg_dump -U autoxshift autoxshift > /backups/autoxshift_$(date +\%Y\%m\%d).sql
```

## Scaling

### Horizontal Scaling
- Run multiple backend instances behind load balancer
- Use shared Redis for session/cache
- Use shared PostgreSQL database
- Configure sticky sessions for WebSocket

### Vertical Scaling
- Increase database connection pool
- Increase Redis memory
- Add more CPU/RAM to servers

## Troubleshooting

### Backend Won't Start
1. Check environment variables
2. Check database connection
3. Check Redis connection
4. Check port availability
5. Check logs: `npm run dev` or `pm2 logs`

### Database Connection Failed
1. Verify PostgreSQL is running
2. Check credentials in .env
3. Check firewall rules
4. Verify database exists

### WebSocket Not Working
1. Check WebSocket server is running
2. Verify CORS settings
3. Check reverse proxy configuration
4. Test direct connection: `wscat -c ws://localhost:3001/ws`

### High Memory Usage
1. Check for memory leaks
2. Reduce connection pool size
3. Enable Redis caching
4. Monitor with: `pm2 monit`

## Production Checklist

- [ ] All environment variables set
- [ ] Database initialized and migrated
- [ ] Redis running and connected
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Logging configured
- [ ] Error tracking (Sentry) set up
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Security audit completed

## Post-Deployment

1. **Verify Health:**
   ```bash
   curl https://api.autoxshift.com/api/health
   ```

2. **Test Key Features:**
   - Authentication
   - Swap creation
   - Campaign creation
   - WebSocket connection

3. **Monitor Logs:**
   ```bash
   pm2 logs
   # or
   docker-compose logs -f
   ```

4. **Set Up Alerts:**
   - Database connection failures
   - High error rates
   - High memory usage
   - Service downtime

---

**Need Help?** Check logs, health endpoints, and ensure all services are running.


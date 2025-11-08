#!/bin/bash

# AutoXShift Deployment Script
# This script handles deployment to production

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 AutoXShift Deployment Script${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env file from env.example"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required environment variables
REQUIRED_VARS=("SIDESHIFT_API_KEY" "JWT_SECRET" "DB_PASSWORD")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${YELLOW}📦 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Run database migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo -e "${YELLOW}📝 Running database migrations...${NC}"
    ./scripts/init-db.sh
fi

echo -e "${GREEN}✅ Deployment preparation complete${NC}"
echo ""
echo "Next steps:"
echo "1. Start the server: npm start"
echo "2. Or use PM2: pm2 start dist/index.js --name autoxshift"
echo "3. Or use Docker: docker-compose up -d"


#!/bin/bash

# AutoXShift Database Initialization Script
# This script initializes the PostgreSQL database with the schema

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AutoXShift Database Initialization${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-autoxshift}
DB_USER=${DB_USER:-autoxshift}
DB_PASSWORD=${DB_PASSWORD:-autoxshift123}

echo -e "${YELLOW}📊 Database Configuration:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql command not found. Please install PostgreSQL.${NC}"
    exit 1
fi

# Test connection
echo -e "${YELLOW}🔌 Testing database connection...${NC}"
export PGPASSWORD=$DB_PASSWORD
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please ensure PostgreSQL is running and credentials are correct."
    exit 1
fi

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}📦 Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🗑️  Dropping existing database...${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}✅ Database dropped${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping database creation. Running migrations only...${NC}"
    fi
fi

# Create database if it doesn't exist
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}📦 Creating database '$DB_NAME'...${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✅ Database created${NC}"
fi

# Run schema
SCHEMA_FILE="src/database/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 Running schema migrations...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SCHEMA_FILE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema initialized successfully${NC}"
    echo ""
    echo -e "${GREEN}🎉 Database initialization complete!${NC}"
    echo ""
    echo "You can now start the backend server:"
    echo "  npm run dev"
else
    echo -e "${RED}❌ Schema initialization failed${NC}"
    exit 1
fi


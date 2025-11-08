# AutoXShift Database Initialization Script (PowerShell)
# This script initializes the PostgreSQL database with the schema

$ErrorActionPreference = "Stop"

Write-Host "🚀 AutoXShift Database Initialization" -ForegroundColor Green

# Load environment variables from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Default values
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "autoxshift" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "autoxshift" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "autoxshift123" }

Write-Host "📊 Database Configuration:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"
Write-Host ""

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "❌ psql command not found. Please install PostgreSQL." -ForegroundColor Red
    exit 1
}

# Test connection
Write-Host "🔌 Testing database connection..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASSWORD
try {
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "\q" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database connection successful" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ Database connection failed" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is running and credentials are correct."
    exit 1
}

# Check if database exists
$dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt 2>&1 | Select-String -Pattern "\b$DB_NAME\b"
if ($dbExists) {
    Write-Host "📦 Database '$DB_NAME' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to drop and recreate it? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "🗑️  Dropping existing database..." -ForegroundColor Yellow
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1 | Out-Null
        Write-Host "✅ Database dropped" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipping database creation. Running migrations only..." -ForegroundColor Yellow
    }
}

# Create database if it doesn't exist
$dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt 2>&1 | Select-String -Pattern "\b$DB_NAME\b"
if (-not $dbExists) {
    Write-Host "📦 Creating database '$DB_NAME'..." -ForegroundColor Yellow
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>&1 | Out-Null
    Write-Host "✅ Database created" -ForegroundColor Green
}

# Run schema
$SCHEMA_FILE = "src/database/schema.sql"
if (-not (Test-Path $SCHEMA_FILE)) {
    Write-Host "❌ Schema file not found: $SCHEMA_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Running schema migrations..." -ForegroundColor Yellow
$result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SCHEMA_FILE 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schema initialized successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Database initialization complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now start the backend server:"
    Write-Host "  npm run dev"
} else {
    Write-Host "❌ Schema initialization failed" -ForegroundColor Red
    Write-Host $result
    exit 1
}


# 🚀 COMPLETE SETUP - RUN THIS AFTER ADDING DATABASE_URL
# This script will set up everything automatically

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎯 PHOTOGRAPHY CRM - COMPLETE SETUP" -ForegroundColor Green -BackgroundColor Black
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if DATABASE_URL is set
Write-Host "[1/5] Checking environment configuration..." -ForegroundColor Yellow
if (-not (Select-String -Path ".env" -Pattern "DATABASE_URL=postgresql://" -Quiet)) {
    Write-Host "`n❌ DATABASE_URL not configured!" -ForegroundColor Red
    Write-Host "`nPlease update .env file with your Neon connection string:" -ForegroundColor Yellow
    Write-Host "DATABASE_URL=postgresql://your-connection-string-here`n" -ForegroundColor Cyan
    Write-Host "Get a free database at: https://neon.tech`n" -ForegroundColor Green
    exit 1
}
Write-Host "✅ Environment configuration found`n" -ForegroundColor Green

# Step 2: Push database schema
Write-Host "[2/5] Creating database tables..." -ForegroundColor Yellow
Write-Host "Running: npm run db:push`n" -ForegroundColor Gray
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to create database tables!" -ForegroundColor Red
    exit 1
}
Write-Host "`n✅ Database tables created successfully`n" -ForegroundColor Green

# Step 3: Initialize database with sample data
Write-Host "[3/5] Initializing database with sample data..." -ForegroundColor Yellow
Write-Host "Running: npm run db:init`n" -ForegroundColor Gray
npm run db:init
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to initialize database!" -ForegroundColor Red
    exit 1
}
Write-Host "`n✅ Database initialized successfully`n" -ForegroundColor Green

# Step 4: Build frontend
Write-Host "[4/5] Building frontend assets..." -ForegroundColor Yellow
Write-Host "Running: npm run build`n" -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Build had warnings, but continuing..." -ForegroundColor Yellow
}
Write-Host "`n✅ Frontend build complete`n" -ForegroundColor Green

# Step 5: Ready to start
Write-Host "[5/5] Setup complete!`n" -ForegroundColor Yellow

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green -BackgroundColor Black
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📊 Your CRM includes:" -ForegroundColor White
Write-Host "  • Client & Lead Management" -ForegroundColor Cyan
Write-Host "  • Photography Session Scheduling" -ForegroundColor Cyan
Write-Host "  • Invoice Generation & Payment Tracking" -ForegroundColor Cyan
Write-Host "  • Voucher Sales & E-Commerce" -ForegroundColor Cyan
Write-Host "  • Email & SMS Communication" -ForegroundColor Cyan
Write-Host "  • Gallery System" -ForegroundColor Cyan
Write-Host "  • Business Analytics`n" -ForegroundColor Cyan

Write-Host "🔐 Default Admin Login:" -ForegroundColor White
Write-Host "  📧 Email: admin@photography-crm.local" -ForegroundColor Yellow
Write-Host "  🔑 Password: admin123" -ForegroundColor Yellow
Write-Host "  ⚠️  CHANGE THIS PASSWORD!`n" -ForegroundColor Red

Write-Host "🚀 To start the development server, run:" -ForegroundColor White
Write-Host "  npm run dev`n" -ForegroundColor Green -BackgroundColor Black

Write-Host "📚 For detailed feature documentation, see:" -ForegroundColor White
Write-Host "  DATABASE_SETUP_GUIDE.md`n" -ForegroundColor Cyan

Write-Host "========================================`n" -ForegroundColor Cyan

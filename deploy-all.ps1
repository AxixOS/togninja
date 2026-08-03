# Complete deployment script for voucher layout fix
Write-Host "=== Building application ===" -ForegroundColor Cyan
npm run build

Write-Host "`n=== Checking git status ===" -ForegroundColor Cyan
git status

Write-Host "`n=== Adding all changes ===" -ForegroundColor Cyan
git add .

Write-Host "`n=== Committing changes ===" -ForegroundColor Cyan
git commit -m "Fix VCWIEN coupon validation - include productSlug in cart items"

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Deploying to Heroku ===" -ForegroundColor Cyan
git push heroku main

Write-Host "`n=== Verification ===" -ForegroundColor Cyan
Write-Host "Checking final git status..." -ForegroundColor Yellow
git status

Write-Host "`nChecking latest Heroku releases..." -ForegroundColor Yellow
heroku releases --app workingnewage -n 3

Write-Host "`n=== COMPLETED ===" -ForegroundColor Green
Write-Host "Voucher layout fix has been built, committed to GitHub, and deployed to Heroku!" -ForegroundColor Green
Write-Host "`nPlease test by making a purchase at:" -ForegroundColor Yellow
Write-Host "https://workingnewage.herokuapp.com" -ForegroundColor Cyan


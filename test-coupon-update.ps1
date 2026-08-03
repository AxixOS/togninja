# Test script to update a coupon
Write-Host "Testing coupon update..." -ForegroundColor Cyan

# Start server in background if not running
$serverProcess = Get-Process node -ErrorAction SilentlyContinue
if (-not $serverProcess) {
    Write-Host "Starting server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\tog ninja latest v12'; `$env:PORT='3001'; node full-server.js" -WindowStyle Minimized
    Start-Sleep -Seconds 10
}

# Test server is responding
Write-Host "Checking server..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/status" -Method GET -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server not responding. Please start it manually:" -ForegroundColor Red
    Write-Host "  cd 'E:\tog ninja latest v12'; `$env:PORT='3001'; node full-server.js" -ForegroundColor Yellow
    exit 1
}

# Get existing coupons
Write-Host "`nFetching coupons..." -ForegroundColor Yellow
$headers = @{
    "x-admin-token" = "xW605QCfjckrilSTX3vms9EDNqoBMnZH"
    "Content-Type" = "application/json"
}

try {
    $coupons = Invoke-RestMethod -Uri "http://localhost:3001/api/vouchers/coupons" -Headers $headers -Method GET
    Write-Host "✅ Found $($coupons.Count) coupons" -ForegroundColor Green
    
    if ($coupons.Count -gt 0) {
        $firstCoupon = $coupons[0]
        Write-Host "`nFirst coupon:" -ForegroundColor Cyan
        Write-Host "  ID: $($firstCoupon.id)"
        Write-Host "  Code: $($firstCoupon.code)"
        Write-Host "  Name: $($firstCoupon.name)"
        Write-Host "  Type: $($firstCoupon.discountType)"
        Write-Host "  Value: $($firstCoupon.discountValue)"
        
        # Try to update it
        Write-Host "`nAttempting to update coupon..." -ForegroundColor Yellow
        
        $updatePayload = @{
            code = $firstCoupon.code
            name = $firstCoupon.name
            description = "Updated test description"
            discountType = $firstCoupon.discountType
            discountValue = $firstCoupon.discountValue.ToString()
            minOrderAmount = "150"
            isActive = $true
        } | ConvertTo-Json
        
        Write-Host "Payload:" -ForegroundColor Gray
        Write-Host $updatePayload -ForegroundColor Gray
        
        $result = Invoke-RestMethod -Uri "http://localhost:3001/api/vouchers/coupons/$($firstCoupon.id)" `
            -Headers $headers `
            -Method PUT `
            -Body $updatePayload
            
        Write-Host "✅ Coupon updated successfully!" -ForegroundColor Green
        Write-Host $result | ConvertTo-Json
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`nTest complete. Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

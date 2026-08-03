# Email Campaign Smoke Test Script
Write-Host "`n=== EMAIL CAMPAIGN SYSTEM SMOKE TEST ===" -ForegroundColor Cyan
Write-Host "Testing all email campaign endpoints...`n" -ForegroundColor White

$baseUrl = "http://127.0.0.1:3001"
$testResults = @()

# Wait for server to be ready
Start-Sleep -Seconds 3

# Test 1: GET /api/email/campaigns
Write-Host "1. Testing GET /api/email/campaigns..." -ForegroundColor Yellow
try {
    $response = curl.exe -s "$baseUrl/api/email/campaigns"
    $campaigns = $response | ConvertFrom-Json
    Write-Host "   ✅ Campaigns endpoint working - Found $($campaigns.Count) campaigns" -ForegroundColor Green
    $testResults += @{ Test = "GET /api/email/campaigns"; Status = "PASS"; Count = $campaigns.Count }
} catch {
    Write-Host "   ❌ Campaigns endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Test = "GET /api/email/campaigns"; Status = "FAIL"; Error = $_.Exception.Message }
}

# Test 2: GET /api/email/templates
Write-Host "`n2. Testing GET /api/email/templates..." -ForegroundColor Yellow
try {
    $response = curl.exe -s "$baseUrl/api/email/templates"
    $templates = $response | ConvertFrom-Json
    Write-Host "   ✅ Templates endpoint working - Found $($templates.Count) templates" -ForegroundColor Green
    $testResults += @{ Test = "GET /api/email/templates"; Status = "PASS"; Count = $templates.Count }
} catch {
    Write-Host "   ❌ Templates endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Test = "GET /api/email/templates"; Status = "FAIL"; Error = $_.Exception.Message }
}

# Test 3: GET /api/email/segments
Write-Host "`n3. Testing GET /api/email/segments..." -ForegroundColor Yellow
try {
    $response = curl.exe -s "$baseUrl/api/email/segments"
    $segments = $response | ConvertFrom-Json
    Write-Host "   ✅ Segments endpoint working - Found $($segments.Count) segments" -ForegroundColor Green
    $testResults += @{ Test = "GET /api/email/segments"; Status = "PASS"; Count = $segments.Count }
} catch {
    Write-Host "   ❌ Segments endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Test = "GET /api/email/segments"; Status = "FAIL"; Error = $_.Exception.Message }
}

# Test 4: POST /api/email/campaigns (Create campaign)
Write-Host "`n4. Testing POST /api/email/campaigns (Create Campaign)..." -ForegroundColor Yellow
try {
    $newCampaign = @{
        name = "Smoke Test Campaign $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        subject = "Test Email Subject"
        from_name = "Test Sender"
        from_email = "test@newagefotografie.com"
        status = "draft"
    } | ConvertTo-Json

    $response = curl.exe -s -X POST "$baseUrl/api/email/campaigns" `
        -H "Content-Type: application/json" `
        -d $newCampaign
    
    $createdCampaign = $response | ConvertFrom-Json
    Write-Host "   ✅ Campaign created successfully - ID: $($createdCampaign.id)" -ForegroundColor Green
    $testResults += @{ Test = "POST /api/email/campaigns"; Status = "PASS"; CampaignId = $createdCampaign.id }
    $testCampaignId = $createdCampaign.id
} catch {
    Write-Host "   ❌ Campaign creation failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Test = "POST /api/email/campaigns"; Status = "FAIL"; Error = $_.Exception.Message }
    $testCampaignId = 1  # Use existing campaign for analytics test
}

# Test 5: GET /api/email/analytics/campaign/:id (Analytics)
Write-Host "`n5. Testing GET /api/email/analytics/campaign/$testCampaignId..." -ForegroundColor Yellow
try {
    $response = curl.exe -s "$baseUrl/api/email/analytics/campaign/$testCampaignId"
    $analytics = $response | ConvertFrom-Json
    Write-Host "   ✅ Analytics endpoint working" -ForegroundColor Green
    Write-Host "      Sent: $($analytics.metrics.sent)" -ForegroundColor White
    Write-Host "      Opens: $($analytics.metrics.unique_opens) ($($analytics.metrics.open_rate)%)" -ForegroundColor White
    Write-Host "      Clicks: $($analytics.metrics.unique_clicks) ($($analytics.metrics.click_rate)%)" -ForegroundColor White
    $testResults += @{ Test = "GET /api/email/analytics/campaign/:id"; Status = "PASS"; Sent = $analytics.metrics.sent }
} catch {
    Write-Host "   ❌ Analytics endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Test = "GET /api/email/analytics/campaign/:id"; Status = "FAIL"; Error = $_.Exception.Message }
}

# Test 6: GET /api/email/analytics/campaign/:id/subscribers (Segmentation)
Write-Host "`n6. Testing GET /api/email/analytics/campaign/$testCampaignId/subscribers..." -ForegroundColor Yellow
try {
    $response = curl.exe -s "$baseUrl/api/email/analytics/campaign/$testCampaignId/subscribers?event_type=opened"
    $subscribers = $response | ConvertFrom-Json
    Write-Host "   ✅ Subscribers endpoint working - Found $($subscribers.subscribers.Count) who opened" -ForegroundColor Green
    $testResults += @{ Test = "GET /api/email/analytics/campaign/:id/subscribers"; Status = "PASS"; Count = $subscribers.subscribers.Count }
} catch {
    Write-Host "   ❌ Subscribers endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Test = "GET /api/email/analytics/campaign/:id/subscribers"; Status = "FAIL"; Error = $_.Exception.Message }
}

# Summary
Write-Host "`n`n=== TEST SUMMARY ===" -ForegroundColor Cyan
$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Total Tests: $($testResults.Count)" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host "`n✅ All tests passed! Email campaign system is working correctly." -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Some tests failed. Check the details above." -ForegroundColor Yellow
}

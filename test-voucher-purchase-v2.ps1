Write-Host "`n🎫 Creating Demo Voucher Purchase...`n" -ForegroundColor Cyan

$uri = 'http://localhost:3001/api/test/create-demo-voucher-purchase'

$body = @{
    purchaserEmail = "buyer@test.com"
    purchaserName = "John Smith"
    recipientEmail = "anna@test.com"
    recipientName = "Anna Mueller"
    giftMessage = "Happy Birthday Anna! Enjoy your professional photoshoot!"
    amount = 199.00
    productId = "89fdea5d-1027-4713-b3e6-565ee9d0c4e7"
} | ConvertTo-Json

Write-Host "Sending request to: $uri" -ForegroundColor Gray
Write-Host "Request body:" -ForegroundColor Gray
Write-Host $body -ForegroundColor DarkGray

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
    
    Write-Host "`n✅ SUCCESS! Demo voucher created!`n" -ForegroundColor Green
    Write-Host "   📋 Voucher Code: " -NoNewline -ForegroundColor White
    Write-Host $response.voucherCode -ForegroundColor Yellow
    Write-Host "   🆔 Sale ID: " -NoNewline -ForegroundColor White
    Write-Host $response.saleId -ForegroundColor Gray
    Write-Host "   👤 Recipient: " -NoNewline -ForegroundColor White
    Write-Host $response.recipientName -ForegroundColor Cyan
    Write-Host "   💰 Amount: €" -NoNewline -ForegroundColor White
    Write-Host $response.amount -ForegroundColor Green
    
    Write-Host "`n📥 Download PDF:" -ForegroundColor Magenta
    Write-Host "   http://localhost:3001$($response.downloadUrl)" -ForegroundColor Blue
    
    Write-Host "`n📍 Admin Panel:" -ForegroundColor Magenta
    Write-Host "   http://localhost:3001$($response.adminUrl)" -ForegroundColor Blue
    
    Write-Host "`n🔄 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Refresh your browser (Press F5)" -ForegroundColor White
    Write-Host "   2. Click on the 'Sales (1)' tab" -ForegroundColor White
    Write-Host "   3. You should see the voucher purchase!" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "`n❌ ERROR creating voucher:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nServer response:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor DarkYellow
    }
    
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "   - Make sure the server is running on port 3001" -ForegroundColor Gray
    Write-Host "   - Check the server terminal for errors" -ForegroundColor Gray
    Write-Host ""
}

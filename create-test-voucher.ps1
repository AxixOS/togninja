$jsonBody = @"
{
  "purchaserEmail": "buyer@test.com",
  "purchaserName": "Test Buyer",
  "recipientEmail": "recipient@test.com",
  "recipientName": "Anna Mueller",
  "giftMessage": "Happy Birthday Anna! Enjoy your photoshoot!",
  "amount": 199.00,
  "productId": "89fdea5d-1027-4713-b3e6-565ee9d0c4e7"
}
"@

Write-Host "`n🎫 Creating demo voucher purchase...`n" -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod -Uri 'http://localhost:3001/api/test/create-demo-voucher-purchase' -Method POST -Body $jsonBody -ContentType 'application/json'
  
  Write-Host "✅ SUCCESS! Voucher created:" -ForegroundColor Green
  Write-Host "   Voucher Code: $($response.voucherCode)" -ForegroundColor Yellow
  Write-Host "   Sale ID: $($response.saleId)" -ForegroundColor Gray
  Write-Host "   Download URL: $($response.downloadUrl)" -ForegroundColor Blue
  Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
  Write-Host "   1. Refresh the browser page (F5)" -ForegroundColor White
  Write-Host "   2. Click on the 'Sales (1)' tab" -ForegroundColor White
  Write-Host "   3. You should see the voucher purchase!" -ForegroundColor White
  Write-Host ""
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

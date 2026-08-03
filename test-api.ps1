$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    icsUrl = "https://calendar.google.com/calendar/ical/parrottsimon02%40gmail.com/private-8922925f06a9e21d5b5a8670da97ceab/basic.ics"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://workingnewage-2eecd723a444.herokuapp.com/api/calendar/import/ics-url?includePast=true" -Method Post -Headers $headers -Body $body

Write-Host "`n=== API Response ===" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 5
Write-Host ""

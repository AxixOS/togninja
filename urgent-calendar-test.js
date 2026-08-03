#!/usr/bin/env node
import fetch from 'node-fetch';

async function testCalendarImportNow() {
  console.log('🚨 URGENT: Testing Calendar Import');
  
  const apiUrl = 'http://127.0.0.1:3000/api/calendar/import/ics-url';
  const googleCalendarUrl = 'https://calendar.google.com/calendar/ical/newagefotografen%40gmail.com/public/basic.ics';
  
  console.log('📅 Testing Google Calendar URL:', googleCalendarUrl);
  
  try {
    // Test 1: Check if Google Calendar URL is accessible
    console.log('\n1️⃣ Testing Google Calendar URL directly...');
    const directResponse = await fetch(googleCalendarUrl);
    console.log(`Status: ${directResponse.status}`);
    console.log(`Content-Type: ${directResponse.headers.get('content-type')}`);
    
    if (directResponse.ok) {
      const content = await directResponse.text();
      console.log(`✅ Google Calendar accessible - Content length: ${content.length} chars`);
      console.log(`First 100 chars: ${content.substring(0, 100)}`);
    } else {
      console.log(`❌ Google Calendar not accessible - Status: ${directResponse.status}`);
      return;
    }
    
    // Test 2: Test our API with dry run
    console.log('\n2️⃣ Testing our API with DRY RUN...');
    const dryRunResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        icsUrl: googleCalendarUrl,
        dryRun: true
      })
    });
    
    console.log(`API Status: ${dryRunResponse.status}`);
    const dryRunResult = await dryRunResponse.json();
    console.log('Dry Run Result:', JSON.stringify(dryRunResult, null, 2));
    
    if (dryRunResponse.ok && dryRunResult.parsed > 0) {
      console.log(`✅ ${dryRunResult.parsed} events found! Proceeding with real import...`);
      
      // Test 3: Real import
      console.log('\n3️⃣ PERFORMING REAL IMPORT...');
      const realImportResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icsUrl: googleCalendarUrl,
          dryRun: false
        })
      });
      
      console.log(`Real Import Status: ${realImportResponse.status}`);
      const realImportResult = await realImportResponse.json();
      console.log('Real Import Result:', JSON.stringify(realImportResult, null, 2));
      
      if (realImportResponse.ok) {
        console.log(`🎉 SUCCESS! Imported ${realImportResult.imported} events to database!`);
        console.log('✅ Calendar data should now be visible in frontend!');
      } else {
        console.log('❌ Real import failed');
      }
    } else {
      console.log('❌ Dry run failed or no events found');
    }
    
  } catch (error) {
    console.log('💥 Error during test:', error.message);
  }
}

testCalendarImportNow();

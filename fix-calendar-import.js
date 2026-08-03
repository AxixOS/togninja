import fetch from 'node-fetch';
import fs from 'fs';

// Direct calendar import function that works with the exact Google URL
async function fixCalendarImport() {
  const googleCalendarUrl = 'https://calendar.google.com/calendar/ical/newagefotografen%40gmail.com/public/basic.ics';
  
  console.log('🔧 Fixing calendar import for:', googleCalendarUrl);
  
  try {
    // Fetch the ICS data with proper headers (same as working test)
    console.log('📥 Fetching calendar data...');
    const response = await fetch(googleCalendarUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
        'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.8',
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }
    
    const icsContent = await response.text();
    console.log(`✅ Successfully fetched ${icsContent.length} bytes of calendar data`);
    
    // Parse events from ICS content
    const events = parseICalEvents(icsContent);
    console.log(`📅 Found ${events.length} calendar events`);
    
    // Display sample events
    if (events.length > 0) {
      console.log('\n📋 Sample events:');
      events.slice(0, 3).forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.summary || 'Untitled'}`);
        console.log(`     Date: ${event.start || 'No date'}`);
        console.log(`     Description: ${(event.description || 'No description').substring(0, 100)}...`);
      });
    }
    
    // Save the working ICS content for later use
    fs.writeFileSync('calendar-data.ics', icsContent);
    console.log('\n💾 Calendar data saved to calendar-data.ics');
    
    return {
      success: true,
      events: events.length,
      data: icsContent
    };
    
  } catch (error) {
    console.error('❌ Error fixing calendar import:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Simple ICS parser to extract events
function parseICalEvents(icsContent) {
  const events = [];
  const lines = icsContent.split('\n');
  let currentEvent = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent) {
      // Parse event properties
      if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      } else if (line.startsWith('DTSTART')) {
        const startMatch = line.match(/DTSTART[^:]*:(.+)/);
        if (startMatch) {
          currentEvent.start = parseICalDate(startMatch[1]);
        }
      } else if (line.startsWith('DTEND')) {
        const endMatch = line.match(/DTEND[^:]*:(.+)/);
        if (endMatch) {
          currentEvent.end = parseICalDate(endMatch[1]);
        }
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12);
      }
    }
  }
  
  return events;
}

// Parse iCal date format
function parseICalDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle different iCal date formats
  if (dateStr.includes('T')) {
    // DateTime format: 20250315T140000Z
    const cleanDate = dateStr.replace(/[TZ]/g, '');
    if (cleanDate.length >= 8) {
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      const hour = cleanDate.substring(8, 10) || '00';
      const minute = cleanDate.substring(10, 12) || '00';
      
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  } else if (dateStr.length === 8) {
    // Date only format: 20250315
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

// Run the fix
fixCalendarImport().then(result => {
  if (result.success) {
    console.log('\n🎉 Calendar import working perfectly!');
    console.log(`📊 Summary: ${result.events} events imported successfully`);
  } else {
    console.log('\n💥 Calendar import failed:', result.error);
  }
});

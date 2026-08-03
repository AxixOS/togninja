/**
 * Direct ICS Content Fetcher
 * Fetches and displays the raw ICS content from Google Calendar
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/ical/parrottsimon02%40gmail.com/private-8922925f06a9e21d5b5a8670da97ceab/basic.ics';

async function fetchICSContent() {
  console.log('📥 Fetching ICS content from Google Calendar...\n');
  console.log('URL:', GOOGLE_CALENDAR_URL, '\n');

  try {
    const response = await fetch(GOOGLE_CALENDAR_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/calendar, */*',
      }
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch:', response.status, response.statusText);
      return;
    }

    const content = await response.text();
    console.log('✅ Successfully fetched ICS content!');
    console.log('📊 Content length:', content.length, 'bytes');
    console.log('\n📄 Raw ICS Content Preview (first 2000 characters):');
    console.log('─'.repeat(80));
    console.log(content.substring(0, 2000));
    console.log('─'.repeat(80));
    
    // Count events
    const eventMatches = content.match(/BEGIN:VEVENT/g);
    const eventCount = eventMatches ? eventMatches.length : 0;
    console.log('\n📅 Total VEVENT entries found:', eventCount);
    
    // Extract and display first few events
    if (eventCount > 0) {
      console.log('\n📋 Sample Events:');
      const events = content.split('BEGIN:VEVENT').slice(1, 6); // Get first 5 events
      events.forEach((eventBlock, index) => {
        const summaryMatch = eventBlock.match(/SUMMARY:([^\r\n]+)/);
        const dtstartMatch = eventBlock.match(/DTSTART(?:;[^:]+)?:([^\r\n]+)/);
        const dtendMatch = eventBlock.match(/DTEND(?:;[^:]+)?:([^\r\n]+)/);
        
        if (summaryMatch) {
          console.log(`\nEvent ${index + 1}:`);
          console.log('  Title:', summaryMatch[1]);
          if (dtstartMatch) console.log('  Start:', dtstartMatch[1]);
          if (dtendMatch) console.log('  End:', dtendMatch[1]);
        }
      });
    }

    // Check for December events specifically
    console.log('\n🔍 Searching for December 2025 events...');
    const decemberEvents = [];
    const eventBlocks = content.split('BEGIN:VEVENT').slice(1);
    eventBlocks.forEach(block => {
      const dtstartMatch = block.match(/DTSTART(?:;[^:]+)?:([^\r\n]+)/);
      const summaryMatch = block.match(/SUMMARY:([^\r\n]+)/);
      
      if (dtstartMatch && dtstartMatch[1].startsWith('202512')) {
        const dateStr = dtstartMatch[1];
        const day = dateStr.substring(6, 8);
        decemberEvents.push({
          date: `2025-12-${day}`,
          title: summaryMatch ? summaryMatch[1] : 'No title',
          rawStart: dateStr
        });
      }
    });

    if (decemberEvents.length > 0) {
      console.log(`\n✅ Found ${decemberEvents.length} December 2025 events:`);
      decemberEvents.forEach(evt => {
        console.log(`  - ${evt.date}: ${evt.title}`);
      });

      // Specifically check for Dec 6 and 7
      const dec6 = decemberEvents.filter(e => e.date === '2025-12-06');
      const dec7 = decemberEvents.filter(e => e.date === '2025-12-07');
      console.log(`\n📌 December 6: ${dec6.length} event(s)`);
      console.log(`📌 December 7: ${dec7.length} event(s)`);
    } else {
      console.log('\n⚠️  No December 2025 events found');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error);
  }
}

fetchICSContent();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://mqmnfonwhyuoeijvqmxn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhYmFzZSIsInJlZiI6Im1xbW5mb253aHl1b2VpanZxbXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTk1MzUsImV4cCI6MjA5NDA3NTUzNX0.7zixhcDPql4ogkpN6ti5b7r-5otfRMAt8QI8BgQa9u8');

async function check() {
  const { data, error } = await supabase.from('observations').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
    console.log('Sample Data:', data[0]);
  }
}

check();

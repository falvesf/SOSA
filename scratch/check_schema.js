const supabaseUrl = 'https://mqmnfonwhyuoeijvqmxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbW5mb253aHl1b2VpanZxbXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTk1MzUsImV4cCI6MjA5NDA3NTUzNX0.7zixhcDPql4ogkpN6ti5b7r-5otfRMAt8QI8BgQa9u8';

async function main() {
  console.log('Fetching OpenAPI schema from Supabase with full headers...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const schema = await response.json();
    const observationsSchema = schema.definitions?.observations;
    if (observationsSchema) {
      console.log('====================================');
      console.log('ACTUAL COLUMNS IN ONLINE DB TABLE (observations):');
      console.log('====================================');
      const cols = Object.keys(observationsSchema.properties);
      cols.sort().forEach(col => {
        console.log(`- ${col} (${observationsSchema.properties[col].type || 'unknown'})`);
      });
      console.log('====================================');
    } else {
      console.log('Could not find observations table in OpenAPI schema. Tables found:', Object.keys(schema.definitions || {}));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

main();

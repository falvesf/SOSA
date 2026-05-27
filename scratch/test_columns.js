const supabaseUrl = 'https://mqmnfonwhyuoeijvqmxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbW5mb253aHl1b2VpanZxbXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTk1MzUsImV4cCI6MjA5NDA3NTUzNX0.7zixhcDPql4ogkpN6ti5b7r-5otfRMAt8QI8BgQa9u8';

async function testColumn(columnName, value) {
  try {
    const payload = {
      visit_date: '2026-05-26',
      visit_type: 'Formativa'
    };
    payload[columnName] = value;

    const response = await fetch(`${supabaseUrl}/rest/v1/observations`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const text = await testText(response);
    return { status: response.status, body: text };
  } catch (err) {
    return { error: err.message };
  }
}

async function testText(response) {
  try {
    return await response.text();
  } catch (e) {
    return '';
  }
}

async function main() {
  const columnsToTest = {
    subject_ids: ['d02c4de6-4e5a-43d9-9bb5-9a8ad1a57856'],
    bimestre: '1º Bimestre',
    revisit_date_1: '2026-05-27',
    revisit_date_2: '2026-05-28',
    scores_v2: {},
    scores_v3: {},
    evaluations_v2: {},
    evaluations_v3: {},
    comments_v2: {},
    comments_v3: {}
  };

  console.log('Testing column existence via insertion attempts...');
  for (const [col, val] of Object.entries(columnsToTest)) {
    const result = await testColumn(col, val);
    console.log(`Column "${col}": Status = ${result.status}`);
    if (result.body && result.body.includes('does not exist')) {
      console.log(`   -> MISSING! ${result.body}`);
    } else {
      console.log(`   -> Response: ${result.body}`);
    }
  }
}

main();

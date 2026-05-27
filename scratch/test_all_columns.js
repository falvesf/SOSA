const supabaseUrl = 'https://mqmnfonwhyuoeijvqmxn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbW5mb253aHl1b2VpanZxbXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTk1MzUsImV4cCI6MjA5NDA3NTUzNX0.7zixhcDPql4ogkpN6ti5b7r-5otfRMAt8QI8BgQa9u8';

// The ACTUAL full payload the app sends
// (based on ObservationForm.jsx initialFormState + handleSubmit payload)
const simulatedPayload = {
  visit_date: '2026-05-26',
  visit_type: 'Formativa',
  visit_type_other: '',
  visit_objectives: [],
  visit_objectives_other: '',
  teacher_id: null,
  subject_id: null,
  subject_ids: [],
  series_id: null,
  planning_evaluation: '', plan_alignment_score: null, plan_content_score: null, plan_objectives_score: null, plan_references_score: null, planning_observations: '',
  methodology_evaluation: '', meth_adequate_score: null, meth_strategies_score: null, meth_resources_score: null, meth_clarity_score: null, methodology_observations: '',
  learning_evaluation: '', learn_instruments_score: null, learn_formative_score: null, learn_feedback_score: null, learn_criteria_score: null, learning_observations: '',
  management_evaluation: '', man_space_score: null, man_respect_score: null, man_conflict_score: null, man_environment_score: null, man_material_score: null, man_content_score: null, man_activities_score: null, man_monitoring_score: null, management_observations: '',
  identity_evaluation: '', ident_values_score: null, ident_posture_score: null, ident_language_score: null, identity_observations: '',
  strong_points: '', improvement_opportunities: '', observation_synthesis: '', pedagogical_guidelines: '', forwarding: '', teacher_aware: false,
  revisit_date_1: null,
  revisit_date_2: null,
  scores_v2: {},
  scores_v3: {},
  evaluations_v2: {},
  evaluations_v3: {},
  comments_v2: {},
  comments_v3: {},
  school_id: null,
  segment_id: null,
  user_id: null,
  bimestre: '2º Bimestre',
  is_new_offline: true
};

async function testFullPayload() {
  console.log('Testing full payload insert (as the app would send it)...');
  console.log('Columns being sent:', Object.keys(simulatedPayload).sort().join(', '));
  console.log('');

  const response = await fetch(`${supabaseUrl}/rest/v1/observations`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(simulatedPayload)
  });

  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(`Response: ${text}`);

  if (text.includes('does not exist') || text.includes('PGRST204')) {
    // Extract column name from error message
    const match = text.match(/'([^']+)' column/);
    if (match) {
      console.log(`\n!!! MISSING COLUMN DETECTED: "${match[1]}"`);
    }
  }
}

async function testPayloadBinarySearch() {
  // Test half the non-standard columns at a time to find the problematic one(s)
  const standardCols = ['visit_date', 'visit_type', 'teacher_id', 'series_id'];
  const extendedCols = [
    'subject_ids', 'bimestre', 'revisit_date_1', 'revisit_date_2',
    'scores_v2', 'scores_v3', 'evaluations_v2', 'evaluations_v3',
    'comments_v2', 'comments_v3', 'is_new_offline'
  ];

  console.log('\n=== Testing each extended column individually ===');
  for (const col of extendedCols) {
    const payload = {
      visit_date: '2026-05-26',
      visit_type: 'Formativa',
      [col]: col.includes('score') || col === 'teacher_aware' ? null 
             : col.includes('ids') ? [] 
             : col.includes('date') ? null
             : col.includes('v2') || col.includes('v3') ? {}
             : 'test'
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/observations`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    if (text.includes('PGRST204') || text.includes('does not exist') || text.includes('column')) {
      console.log(`[MISSING] "${col}": ${text}`);
    } else {
      console.log(`[OK] "${col}": Status=${response.status} (${text.substring(0, 60)})`);
    }
  }
}

async function main() {
  await testFullPayload();
  await testPayloadBinarySearch();
}

main().catch(console.error);

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mqmnfonwhyuoeijvqmxn.supabase.co',
  'sb_publishable_E7Z7d1jnfe-cuWF_DlO28Q_d5sIo50h'
);

async function test() {
  const { data, error } = await supabase.from('observations').select('*').limit(5);
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Observations found:', data.length);
    data.forEach((obs, index) => {
      console.log(`\nObservation #${index + 1}:`);
      console.log('ID:', obs.id);
      console.log('Visit Date:', obs.visit_date);
      console.log('Evaluations:', {
        planning: obs.planning_evaluation,
        methodology: obs.methodology_evaluation,
        learning: obs.learning_evaluation,
        management: obs.management_evaluation,
        identity: obs.identity_evaluation
      });
    });
  }
}

test();

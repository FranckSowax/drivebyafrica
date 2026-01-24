const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './supabase-mcp-server/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMigration() {
  console.log('Checking if all_countries migration is applied...\n');

  // Check if constraint exists
  const { data, error } = await supabase.rpc('get_sources_for_country', { country: 'all' });

  if (error) {
    console.log('❌ Migration NOT applied yet. Function get_sources_for_country not found.');
    console.log('Error:', error.message);
    return false;
  }

  console.log('✅ Migration IS applied!');
  console.log('get_sources_for_country(\'all\') returns:', data);
  return true;
}

checkMigration().then(() => process.exit(0));

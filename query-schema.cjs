require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const tables = ['usuarios', 'empresa', 'empresas_incorporaciones', 'members', 'company_members'];
  for (const table of tables) {
    console.log(`\n=== ${table} ===`);
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, character_maximum_length, udt_name')
      .eq('table_schema', 'public')
      .eq('table_name', table)
      .order('ordinal_position');
    if (error) {
      console.error('Error:', error.message);
    } else if (data && data.length > 0) {
      data.forEach(c => {
        const parts = [`${c.column_name} | ${c.data_type}`];
        if (c.udt_name && c.udt_name !== c.data_type) parts.push(`(${c.udt_name})`);
        parts.push(`nullable=${c.is_nullable}`);
        if (c.character_maximum_length) parts.push(`max_len=${c.character_maximum_length}`);
        console.log(parts.join(' | '));
      });
    } else {
      console.log('No columns returned');
    }
  }
}

main().catch(console.error);

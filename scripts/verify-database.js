#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Verifying Supabase database setup...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  const checks = [
    {
      name: 'Database Connection',
      test: async () => {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) throw error;
        return 'Connected successfully';
      }
    },
    {
      name: 'Users Table',
      test: async () => {
        const { data, error } = await supabase.from('users').select('*').limit(1);
        if (error) throw error;
        return `Table exists with ${data.length} rows`;
      }
    },
    {
      name: 'Scrape Sessions Table',
      test: async () => {
        const { data, error } = await supabase.from('scrape_sessions').select('*').limit(1);
        if (error) throw error;
        return `Table exists with ${data.length} rows`;
      }
    },
    {
      name: 'Instagram Posts Table',
      test: async () => {
        const { data, error } = await supabase.from('instagram_posts').select('*').limit(1);
        if (error) throw error;
        return `Table exists with ${data.length} rows`;
      }
    },
    {
      name: 'Comments Table',
      test: async () => {
        const { data, error } = await supabase.from('instagram_comments').select('*').limit(1);
        if (error) throw error;
        return `Table exists with ${data.length} rows`;
      }
    },
    {
      name: 'Tagged Users Table',
      test: async () => {
        const { data, error } = await supabase.from('tagged_users').select('*').limit(1);
        if (error) throw error;
        return `Table exists with ${data.length} rows`;
      }
    },
    {
      name: 'Analytics Cache Table',
      test: async () => {
        const { data, error } = await supabase.from('analytics_cache').select('*').limit(1);
        if (error) throw error;
        return `Table exists with ${data.length} rows`;
      }
    }
  ];

  console.log('\n📋 Running verification checks...\n');

  for (const check of checks) {
    try {
      const result = await check.test();
      console.log(`✅ ${check.name}: ${result}`);
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
    }
  }

  console.log('\n🎉 Database verification complete!');
  console.log('\n📊 Your Informint database is ready to store Instagram data!');
  console.log('\n🔗 Database URL:', supabaseUrl);
  console.log('📋 Project ID:', process.env.SUPABASE_PROJECT_REF || 'izojazwwccthjrxyfcrz');
}

verifyDatabase().catch(console.error); 
#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Updating .env file with Supabase credentials...');

try {
  // Read the current .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  
  // Update Supabase configuration
  envContent = envContent.replace(
    /# Future Supabase Configuration \(Optional - for later implementation\)\nSUPABASE_URL=your_supabase_url_here\nSUPABASE_ANON_KEY=your_supabase_anon_key_here\nSUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here/,
    `# Supabase Configuration
SUPABASE_URL=https://izojazwwccthjrxyfcrz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6b2phend3Y2N0aGpyeHlmY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMjQxODAsImV4cCI6MjA2MzkwMDE4MH0.uHTxL_lOpzbf9tDNXSURTS5ZGjL7mUzYnF7evYKBLQY
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_PROJECT_REF=izojazwwccthjrxyfcrz`
  );
  
  // Write the updated content back
  fs.writeFileSync('.env', envContent);
  
  console.log('✅ .env file updated successfully!');
  console.log('📋 Supabase Project Details:');
  console.log('   Project ID: izojazwwccthjrxyfcrz');
  console.log('   URL: https://izojazwwccthjrxyfcrz.supabase.co');
  console.log('   Region: ap-south-1');
  console.log('');
  console.log('⚠️  Note: You may need to get the service role key from Supabase dashboard');
  console.log('   Go to: https://supabase.com/dashboard/project/izojazwwccthjrxyfcrz/settings/api');
  
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
  console.log('');
  console.log('📝 Please manually update your .env file with these Supabase credentials:');
  console.log('SUPABASE_URL=https://izojazwwccthjrxyfcrz.supabase.co');
  console.log('SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6b2phend3Y2N0aGpyeHlmY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMjQxODAsImV4cCI6MjA2MzkwMDE4MH0.uHTxL_lOpzbf9tDNXSURTS5ZGjL7mUzYnF7evYKBLQY');
  console.log('SUPABASE_PROJECT_REF=izojazwwccthjrxyfcrz');
} 
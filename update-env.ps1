# PowerShell script to update .env file with Supabase credentials

Write-Host "🔧 Updating .env file with Supabase credentials..." -ForegroundColor Green

# Read the current .env file
$envContent = Get-Content -Path ".env" -Raw

# Replace the Supabase configuration
$envContent = $envContent -replace "# Supabase Configuration \(Required for database functionality\)\r?\nSUPABASE_URL=your_supabase_project_url_here\r?\nSUPABASE_ANON_KEY=your_supabase_anon_key_here\r?\nSUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here\r?\nSUPABASE_PROJECT_REF=your_supabase_project_ref_here", @"
# Supabase Configuration (Required for database functionality)
SUPABASE_URL=https://izojazwwccthjrxyfcrz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6b2phend3Y2N0aGpyeHlmY3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMjQxODAsImV4cCI6MjA2MzkwMDE4MH0.uHTxL_lOpzbf9tDNXSURTS5ZGjL7mUzYnF7evYKBLQY
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_PROJECT_REF=izojazwwccthjrxyfcrz
"@

# Write the updated content back to .env
$envContent | Set-Content -Path ".env" -NoNewline

Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
Write-Host "📋 Supabase Project Details:" -ForegroundColor Cyan
Write-Host "   Project ID: izojazwwccthjrxyfcrz" -ForegroundColor White
Write-Host "   URL: https://izojazwwccthjrxyfcrz.supabase.co" -ForegroundColor White
Write-Host "   Region: ap-south-1" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: You may need to get the service role key from Supabase dashboard" -ForegroundColor Yellow
Write-Host "   Go to: https://supabase.com/dashboard/project/izojazwwccthjrxyfcrz/settings/api" -ForegroundColor Yellow 
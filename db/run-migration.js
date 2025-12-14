#!/usr/bin/env node
// Simple migration runner for Supabase using the database REST API
// Usage: node db/run-migration.js <migration-file.sql>

const fs = require('fs');
const path = require('path');

// Parse .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key.trim()] = value;
    }
  }
  return env;
}

async function runMigration() {
  const env = loadEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: node db/run-migration.js <migration-file.sql>');
    process.exit(1);
  }

  const migrationPath = path.resolve(migrationFile);
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`Running migration: ${migrationFile}`);
  console.log('\n--- Attempting to execute via Supabase pg_query... ---\n');

  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '').trim();

  // Try using Supabase's internal pg endpoint (available with service role)
  // POST to /pg with query parameter
  const pgUrl = `${supabaseUrl}/pg`;

  try {
    // Try direct postgres query endpoint
    const response = await fetch(pgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    const text = await response.text();

    if (response.ok) {
      console.log('Migration executed successfully!');
      if (text) console.log('Response:', text);
      return;
    }

    // If pg endpoint doesn't work, try the REST query endpoint
    console.log(`pg endpoint returned ${response.status}: ${text}`);
  } catch (err) {
    console.log('pg endpoint error:', err.message);
  }

  // Fallback: provide manual instructions
  console.log('\n=== MANUAL MIGRATION REQUIRED ===');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log(`URL: https://supabase.com/dashboard/project/${projectRef}/sql/editor`);
  console.log('\n--- SQL ---');
  console.log(sql);
  console.log('--- END SQL ---\n');
}

runMigration().catch(console.error);

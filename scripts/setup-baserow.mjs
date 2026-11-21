import fs from 'fs';
import path from 'path';

// Manual env parsing helper
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error("❌ No .env file found in root directory.");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[match[1]] = val.trim();
    }
  });
  return env;
}

function updateEnv(newVars) {
  const envPath = path.resolve(process.cwd(), '.env');
  let content = fs.readFileSync(envPath, 'utf-8');
  
  Object.entries(newVars).forEach(([key, val]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
  });
  
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log("📝 Updated .env file with table IDs.");
}

async function main() {
  const env = loadEnv();
  
  const apiToken = env.BASEROW_API_TOKEN;
  const databaseId = env.BASEROW_DATABASE_ID;
  const apiUrl = env.BASEROW_API_URL || 'https://api.baserow.io';
  
  if (!apiToken || !databaseId) {
    console.error("❌ Please make sure BASEROW_API_TOKEN and BASEROW_DATABASE_ID are filled in your .env file before running setup.");
    process.exit(1);
  }
  
  console.log("🚀 Starting Baserow Table Setup...");
  
  const headers = {
    'Authorization': `Token ${apiToken}`,
    'Content-Type': 'application/json'
  };
  
  // Helper to create table
  async function createTable(name) {
    console.log(`\nCreating table: ${name}...`);
    const res = await fetch(`${apiUrl}/api/database/tables/database/${databaseId}/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create table ${name}: ${errText}`);
    }
    const data = await res.json();
    console.log(`✅ Table "${name}" created with ID: ${data.id}`);
    return data.id;
  }

  // Helper to create field
  async function createField(tableId, name, type, options = {}) {
    const res = await fetch(`${apiUrl}/api/database/fields/table/${tableId}/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, type, ...options })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create field "${name}" (${type}) on table ${tableId}: ${errText}`);
    }
    console.log(`  + Created field: ${name} (${type})`);
  }

  try {
    // 1. Create Users Table
    const usersTableId = await createTable('users');
    // Baserow creates a default "Name" field (first column). We will use/keep it as a dummy or ignore it.
    // Create actual fields:
    await createField(usersTableId, 'username', 'text');
    await createField(usersTableId, 'password_hash', 'text');
    await createField(usersTableId, 'role', 'select', {
      select_options: [
        { value: 'user', color: 'blue' },
        { value: 'admin', color: 'red' }
      ]
    });
    await createField(usersTableId, 'blocked', 'boolean');
    await createField(usersTableId, 'created_at', 'date', { date_format: 'ISO', date_include_time: true });
    await createField(usersTableId, 'last_login', 'date', { date_format: 'ISO', date_include_time: true });

    // 2. Create Movies Table
    const moviesTableId = await createTable('movies');
    await createField(moviesTableId, 'username', 'text');
    await createField(moviesTableId, 'movie_name', 'text');
    await createField(moviesTableId, 'type', 'text');
    await createField(moviesTableId, 'status', 'text');
    await createField(moviesTableId, 'rating', 'number', { number_decimal_places: 1 });
    await createField(moviesTableId, 'watch_order_rank', 'number', { number_decimal_places: 0 });
    await createField(moviesTableId, 'watch_link', 'url');
    await createField(moviesTableId, 'tmdb_id', 'number', { number_decimal_places: 0 });
    await createField(moviesTableId, 'genres', 'long_text');
    await createField(moviesTableId, 'release_year', 'number', { number_decimal_places: 0 });
    await createField(moviesTableId, 'runtime', 'number', { number_decimal_places: 0 });
    await createField(moviesTableId, 'language', 'text');
    await createField(moviesTableId, 'poster_url', 'url');
    await createField(moviesTableId, 'overview', 'long_text');

    // 3. Create Pirate Sites Table
    const piratesTableId = await createTable('pirate_sites');
    await createField(piratesTableId, 'name', 'text');
    await createField(piratesTableId, 'search_url', 'url');
    await createField(piratesTableId, 'enabled', 'boolean');

    // 4. Create Recommendation Profile Table
    const profileTableId = await createTable('recommendation_profile');
    await createField(profileTableId, 'username', 'text');
    await createField(profileTableId, 'favorite_genres', 'long_text');
    await createField(profileTableId, 'disliked_genres', 'long_text');
    await createField(profileTableId, 'favorite_actors', 'long_text');
    await createField(profileTableId, 'favorite_directors', 'long_text');
    await createField(profileTableId, 'favorite_production_companies', 'long_text');
    await createField(profileTableId, 'favorite_industries', 'long_text');
    await createField(profileTableId, 'favorite_eras', 'long_text');
    await createField(profileTableId, 'language_preferences', 'long_text');
    await createField(profileTableId, 'library_hash', 'text');
    await createField(profileTableId, 'generated_at', 'text');
    await createField(profileTableId, 'engine_version', 'text');

    // 5. Create Recommendation Sets Table
    const recSetsTableId = await createTable('recommendation_sets');
    await createField(recSetsTableId, 'username', 'text');
    await createField(recSetsTableId, 'recommendations', 'long_text');
    await createField(recSetsTableId, 'status', 'text');
    await createField(recSetsTableId, 'taste_hash', 'text');
    await createField(recSetsTableId, 'created_at', 'text');
    await createField(recSetsTableId, 'expires_at', 'text');
    await createField(recSetsTableId, 'generation_model', 'text');
    await createField(recSetsTableId, 'item_count', 'number', { number_decimal_places: 0 });

    // 6. Create Games Table (Dedicated game library - separate from movies)
    const gamesTableId = await createTable('games');
    await createField(gamesTableId, 'username', 'text');
    await createField(gamesTableId, 'game_name', 'text');
    await createField(gamesTableId, 'status', 'text'); // playing, completed, pending, on_hold, dropped
    await createField(gamesTableId, 'rating', 'number', { number_decimal_places: 1 });
    await createField(gamesTableId, 'personal_review', 'long_text');
    await createField(gamesTableId, 'watch_order_rank', 'number', { number_decimal_places: 0 });
    await createField(gamesTableId, 'rawg_id', 'number', { number_decimal_places: 0 }); // Canonical RAWG ID (not tmdb_id)
    await createField(gamesTableId, 'genres', 'long_text'); // JSON array string
    await createField(gamesTableId, 'platforms', 'long_text'); // JSON array string
    await createField(gamesTableId, 'release_year', 'number', { number_decimal_places: 0 });
    await createField(gamesTableId, 'playtime_hours', 'number', { number_decimal_places: 1 });
    await createField(gamesTableId, 'cover_url', 'url');
    await createField(gamesTableId, 'backdrop_url', 'url');
    await createField(gamesTableId, 'summary', 'long_text');
    await createField(gamesTableId, 'created_at', 'text');
    await createField(gamesTableId, 'updated_at', 'text');

    // 7. Create Game Pirate Sites Table (Separate from movie pirate_sites)
    const gamePiratesTableId = await createTable('game_pirate_sites');
    await createField(gamePiratesTableId, 'name', 'text');
    await createField(gamePiratesTableId, 'search_url', 'url');
    await createField(gamePiratesTableId, 'enabled', 'boolean');

    // Update .env
    updateEnv({
      BASEROW_USERS_TABLE_ID: usersTableId,
      BASEROW_MOVIES_TABLE_ID: moviesTableId,
      BASEROW_PIRATES_TABLE_ID: piratesTableId,
      BASEROW_RECOMMENDATION_PROFILE_TABLE_ID: profileTableId,
      BASEROW_RECOMMENDATION_SETS_TABLE_ID: recSetsTableId,
      BASEROW_GAMES_TABLE_ID: gamesTableId,
      BASEROW_GAME_PIRATES_TABLE_ID: gamePiratesTableId,
    });

    console.log("\n🎉 Database schema set up successfully! You can now start the app.");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

main();

# Supabase Integration Plan for Informint
## Instagram Analytics & Data Intelligence Platform

### 📋 Project Overview
Transform Informint from local file-based storage to a scalable cloud database solution using Supabase for real-time data management, user authentication, and cloud storage.

---

## 🎯 Phase 1: Environment Setup & CLI Installation

### 1.1 Supabase CLI Installation
```bash
# Install Supabase CLI globally via NPX
npx supabase --version

# Alternative: Install globally
npm install -g supabase

# Verify installation
supabase --version
```

### 1.2 Project Initialization
```bash
# Initialize Supabase in project
supabase init

# Login to Supabase (will open browser)
supabase login

# Link to existing project or create new
supabase link --project-ref YOUR_PROJECT_REF
```

### 1.3 Environment Configuration
```env
# Add to .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_REF=your-project-ref
```

---

## 🗄️ Phase 2: Database Schema Design

### 2.1 Core Tables Structure

#### Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  daily_scrapes_used INTEGER DEFAULT 0,
  daily_scrapes_limit INTEGER DEFAULT 3
);
```

#### Scrape Sessions Table
```sql
CREATE TABLE scrape_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  urls TEXT[],
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_posts INTEGER DEFAULT 0,
  error_message TEXT
);
```

#### Instagram Posts Table
```sql
CREATE TABLE instagram_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES scrape_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Post Metadata
  post_id VARCHAR(255) UNIQUE,
  post_url TEXT NOT NULL,
  post_type VARCHAR(20), -- 'post', 'reel', 'story'
  
  -- Content Data
  caption TEXT,
  hashtags TEXT[],
  mentions TEXT[],
  media_urls TEXT[],
  thumbnail_url TEXT,
  
  -- Engagement Metrics
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  video_duration INTEGER,
  
  -- Creator Profile Data
  owner_username VARCHAR(255),
  owner_full_name VARCHAR(255),
  owner_followers_count INTEGER,
  owner_following_count INTEGER,
  owner_posts_count INTEGER,
  owner_is_verified BOOLEAN DEFAULT FALSE,
  owner_is_business BOOLEAN DEFAULT FALSE,
  owner_profile_pic_url TEXT,
  owner_biography TEXT,
  owner_external_url TEXT,
  
  -- Analytics Calculated Fields
  engagement_rate DECIMAL(5,2),
  reach_multiplier DECIMAL(5,2),
  performance_score INTEGER,
  viral_coefficient DECIMAL(5,2),
  
  -- Timestamps
  post_created_at TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Comments Table
```sql
CREATE TABLE instagram_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES instagram_posts(id) ON DELETE CASCADE,
  comment_id VARCHAR(255),
  username VARCHAR(255),
  text TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Analytics Cache Table
```sql
CREATE TABLE analytics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cache_key VARCHAR(255) NOT NULL,
  cache_data JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX idx_posts_user_id ON instagram_posts(user_id);
CREATE INDEX idx_posts_session_id ON instagram_posts(session_id);
CREATE INDEX idx_posts_owner_username ON instagram_posts(owner_username);
CREATE INDEX idx_posts_scraped_at ON instagram_posts(scraped_at);
CREATE INDEX idx_posts_engagement_rate ON instagram_posts(engagement_rate);
CREATE INDEX idx_sessions_user_id ON scrape_sessions(user_id);
CREATE INDEX idx_sessions_status ON scrape_sessions(status);
CREATE INDEX idx_comments_post_id ON instagram_comments(post_id);
CREATE INDEX idx_analytics_cache_user_id ON analytics_cache(user_id);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
```

---

## 🔐 Phase 3: Row Level Security (RLS) Policies

### 3.1 Enable RLS on All Tables
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
```

### 3.2 User Policies
```sql
-- Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 3.3 Scrape Sessions Policies
```sql
-- Users can only access their own scrape sessions
CREATE POLICY "Users can view own sessions" ON scrape_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON scrape_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON scrape_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON scrape_sessions
  FOR DELETE USING (auth.uid() = user_id);
```

### 3.4 Instagram Posts Policies
```sql
-- Users can only access posts from their scrape sessions
CREATE POLICY "Users can view own posts" ON instagram_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create posts" ON instagram_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON instagram_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON instagram_posts
  FOR DELETE USING (auth.uid() = user_id);
```

### 3.5 Comments Policies
```sql
-- Users can view comments for posts they own
CREATE POLICY "Users can view comments on own posts" ON instagram_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instagram_posts 
      WHERE instagram_posts.id = instagram_comments.post_id 
      AND instagram_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments" ON instagram_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM instagram_posts 
      WHERE instagram_posts.id = instagram_comments.post_id 
      AND instagram_posts.user_id = auth.uid()
    )
  );
```

### 3.6 Analytics Cache Policies
```sql
-- Users can only access their own analytics cache
CREATE POLICY "Users can view own analytics cache" ON analytics_cache
  FOR ALL USING (auth.uid() = user_id);
```

---

## 🔄 Phase 4: Real-time Database Setup

### 4.1 Enable Realtime
```sql
-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE scrape_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_cache;
```

### 4.2 Frontend Real-time Integration
```javascript
// supabase-client.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Real-time subscription for scrape sessions
export const subscribeToScrapeUpdates = (userId, callback) => {
  return supabase
    .channel('scrape_sessions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scrape_sessions',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// Real-time subscription for new posts
export const subscribeToPostUpdates = (sessionId, callback) => {
  return supabase
    .channel('instagram_posts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'instagram_posts',
        filter: `session_id=eq.${sessionId}`
      },
      callback
    )
    .subscribe()
}
```

### 4.3 Dashboard Real-time Updates
```javascript
// dashboard-realtime.js
class DashboardRealtime {
  constructor() {
    this.subscriptions = []
  }

  async initializeRealtime(userId) {
    // Subscribe to scrape session updates
    const sessionSub = subscribeToScrapeUpdates(userId, (payload) => {
      this.handleScrapeUpdate(payload)
    })
    
    this.subscriptions.push(sessionSub)
  }

  handleScrapeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    switch (eventType) {
      case 'INSERT':
        this.addNewScrapeSession(newRecord)
        break
      case 'UPDATE':
        this.updateScrapeSession(newRecord)
        break
      case 'DELETE':
        this.removeScrapeSession(oldRecord)
        break
    }
  }

  updateProgressBar(sessionId, progress) {
    const progressBar = document.querySelector(`[data-session="${sessionId}"] .progress-bar`)
    if (progressBar) {
      progressBar.style.width = `${progress}%`
      progressBar.textContent = `${progress}%`
    }
  }

  cleanup() {
    this.subscriptions.forEach(sub => sub.unsubscribe())
    this.subscriptions = []
  }
}
```

---

## 📁 Phase 5: Cloud Storage Integration

### 5.1 Storage Buckets Setup
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('user-exports', 'user-exports', false),
  ('media-cache', 'media-cache', true),
  ('analytics-reports', 'analytics-reports', false);
```

### 5.2 Storage Policies
```sql
-- User exports bucket policies
CREATE POLICY "Users can upload own exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Media cache bucket policies (public read)
CREATE POLICY "Anyone can view media cache" ON storage.objects
  FOR SELECT USING (bucket_id = 'media-cache');

CREATE POLICY "Service role can manage media cache" ON storage.objects
  FOR ALL USING (bucket_id = 'media-cache');
```

### 5.3 File Upload Functions
```javascript
// storage-manager.js
export class StorageManager {
  constructor(supabase) {
    this.supabase = supabase
  }

  async uploadCSVExport(userId, csvData, filename) {
    const filePath = `${userId}/${filename}`
    
    const { data, error } = await this.supabase.storage
      .from('user-exports')
      .upload(filePath, csvData, {
        contentType: 'text/csv',
        upsert: true
      })

    if (error) throw error
    return data
  }

  async getDownloadUrl(bucket, filePath) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  }

  async cacheMediaFile(url, filename) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      
      const { data, error } = await this.supabase.storage
        .from('media-cache')
        .upload(`instagram/${filename}`, blob, {
          contentType: blob.type,
          upsert: true
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Media caching failed:', error)
      return null
    }
  }
}
```

---

## 🔧 Phase 6: Migration Management with MCP

### 6.1 Migration Files Structure
```
supabase/
├── migrations/
│   ├── 20240101000000_initial_schema.sql
│   ├── 20240101000001_create_users_table.sql
│   ├── 20240101000002_create_scrape_sessions_table.sql
│   ├── 20240101000003_create_instagram_posts_table.sql
│   ├── 20240101000004_create_comments_table.sql
│   ├── 20240101000005_create_analytics_cache_table.sql
│   ├── 20240101000006_setup_rls_policies.sql
│   ├── 20240101000007_create_indexes.sql
│   ├── 20240101000008_setup_storage_buckets.sql
│   └── 20240101000009_enable_realtime.sql
├── functions/
│   ├── calculate-analytics/
│   ├── process-scrape-data/
│   └── cleanup-old-data/
└── seed.sql
```

### 6.2 MCP Integration Commands
```bash
# Generate new migration
supabase migration new add_new_feature

# Apply migrations locally
supabase db reset

# Push migrations to remote
supabase db push

# Pull remote changes
supabase db pull

# Generate types for TypeScript
supabase gen types typescript --local > types/supabase.ts
```

### 6.3 Migration Verification Script
```javascript
// verify-migrations.js
import { createClient } from '@supabase/supabase-js'

export async function verifyMigrations() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const checks = [
    { name: 'Users table exists', query: "SELECT to_regclass('public.users')" },
    { name: 'RLS enabled on users', query: "SELECT relrowsecurity FROM pg_class WHERE relname = 'users'" },
    { name: 'Storage buckets created', query: "SELECT name FROM storage.buckets" },
    { name: 'Realtime enabled', query: "SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'" }
  ]
  
  for (const check of checks) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: check.query })
      console.log(`✅ ${check.name}:`, data ? 'PASS' : 'FAIL')
    } catch (error) {
      console.log(`❌ ${check.name}: FAIL -`, error.message)
    }
  }
}
```

---

## 🚀 Phase 7: Application Integration

### 7.1 Update Package.json Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/auth-ui-react": "^0.4.6"
  },
  "devDependencies": {
    "supabase": "^1.142.2"
  },
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase migration up",
    "db:generate-types": "supabase gen types typescript --local > types/supabase.ts",
    "db:verify": "node verify-migrations.js"
  }
}
```

### 7.2 Environment Setup Script
```javascript
// setup-supabase.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

export async function setupSupabase() {
  console.log('🚀 Setting up Supabase integration...')
  
  // Check environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = requiredEnvVars.filter(env => !process.env[env])
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '))
    process.exit(1)
  }
  
  // Test connection
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) throw error
    console.log('✅ Supabase connection successful')
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    process.exit(1)
  }
  
  console.log('🎉 Supabase setup complete!')
}
```

### 7.3 Data Migration Script
```javascript
// migrate-existing-data.js
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export async function migrateExistingData() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const scrapesDir = './scrapes'
  
  if (!fs.existsSync(scrapesDir)) {
    console.log('No existing scrapes to migrate')
    return
  }
  
  const files = fs.readdirSync(scrapesDir).filter(f => f.endsWith('.json'))
  
  for (const file of files) {
    console.log(`Migrating ${file}...`)
    
    const filePath = path.join(scrapesDir, file)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    // Create scrape session
    const { data: session, error: sessionError } = await supabase
      .from('scrape_sessions')
      .insert({
        session_name: file.replace('.json', ''),
        urls: data.urls || [],
        status: 'completed',
        total_posts: data.posts?.length || 0,
        completed_at: new Date(file.match(/\d{4}-\d{2}-\d{2}T[\d:-]+/)?.[0] || Date.now())
      })
      .select()
      .single()
    
    if (sessionError) {
      console.error(`Error creating session for ${file}:`, sessionError)
      continue
    }
    
    // Insert posts
    if (data.posts && data.posts.length > 0) {
      const posts = data.posts.map(post => ({
        session_id: session.id,
        post_id: post.id,
        post_url: post.url,
        caption: post.caption,
        likes_count: post.likesCount,
        comments_count: post.commentsCount,
        video_views: post.videoViews,
        owner_username: post.ownerUsername,
        owner_followers_count: post.ownerFollowersCount,
        owner_is_verified: post.ownerIsVerified,
        post_created_at: post.timestamp,
        scraped_at: session.completed_at
      }))
      
      const { error: postsError } = await supabase
        .from('instagram_posts')
        .insert(posts)
      
      if (postsError) {
        console.error(`Error inserting posts for ${file}:`, postsError)
      } else {
        console.log(`✅ Migrated ${posts.length} posts from ${file}`)
      }
    }
  }
  
  console.log('🎉 Data migration complete!')
}
```

---

## 📊 Phase 8: Real-time Analytics Integration

### 8.1 Analytics Functions
```sql
-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(post_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  likes INTEGER;
  comments INTEGER;
  followers INTEGER;
  engagement_rate DECIMAL;
BEGIN
  SELECT likes_count, comments_count, owner_followers_count
  INTO likes, comments, followers
  FROM instagram_posts
  WHERE id = post_id;
  
  IF followers > 0 THEN
    engagement_rate := ((likes + comments)::DECIMAL / followers) * 100;
  ELSE
    engagement_rate := 0;
  END IF;
  
  UPDATE instagram_posts 
  SET engagement_rate = engagement_rate
  WHERE id = post_id;
  
  RETURN engagement_rate;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate analytics
CREATE OR REPLACE FUNCTION update_post_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate engagement rate
  NEW.engagement_rate := calculate_engagement_rate(NEW.id);
  
  -- Calculate reach multiplier
  IF NEW.owner_followers_count > 0 AND NEW.video_views > 0 THEN
    NEW.reach_multiplier := (NEW.video_views::DECIMAL / NEW.owner_followers_count);
  END IF;
  
  -- Calculate performance score (0-100)
  NEW.performance_score := LEAST(100, 
    (NEW.engagement_rate * 10) + 
    (CASE WHEN NEW.reach_multiplier > 1 THEN 20 ELSE NEW.reach_multiplier * 20 END) +
    (CASE WHEN NEW.owner_is_verified THEN 10 ELSE 0 END)
  );
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_analytics
  BEFORE INSERT OR UPDATE ON instagram_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_analytics();
```

### 8.2 Real-time Dashboard Updates
```javascript
// real-time-analytics.js
export class RealTimeAnalytics {
  constructor(supabase) {
    this.supabase = supabase
    this.subscriptions = []
  }

  async subscribeToAnalytics(userId) {
    // Subscribe to post updates for real-time analytics
    const postSub = this.supabase
      .channel('analytics_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_posts',
          filter: `user_id=eq.${userId}`
        },
        (payload) => this.handleAnalyticsUpdate(payload)
      )
      .subscribe()

    this.subscriptions.push(postSub)
  }

  handleAnalyticsUpdate(payload) {
    const { eventType, new: newRecord } = payload
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      // Update KPI cards
      this.updateKPICards()
      
      // Update charts
      this.updateCharts(newRecord)
      
      // Update creator matrix
      this.updateCreatorMatrix(newRecord)
      
      // Show notification
      this.showUpdateNotification(newRecord)
    }
  }

  async updateKPICards() {
    const { data: analytics } = await this.supabase
      .rpc('get_user_analytics', { user_id: this.userId })
    
    document.getElementById('total-posts').textContent = analytics.total_posts
    document.getElementById('avg-engagement').textContent = `${analytics.avg_engagement}%`
    document.getElementById('total-creators').textContent = analytics.unique_creators
    document.getElementById('avg-performance').textContent = analytics.avg_performance
  }

  showUpdateNotification(record) {
    const notification = document.createElement('div')
    notification.className = 'notification success'
    notification.innerHTML = `
      <span>📊 New data analyzed for @${record.owner_username}</span>
      <span>Engagement: ${record.engagement_rate}%</span>
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 5000)
  }
}
```

---

## 🔍 Phase 9: Testing & Validation

### 9.1 Test Suite Setup
```javascript
// tests/supabase-integration.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Supabase Integration Tests', () => {
  let supabase
  let testUserId

  beforeAll(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: 'test@informint.com',
      password: 'testpassword123'
    })
    testUserId = user.user.id
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase.auth.admin.deleteUser(testUserId)
  })

  it('should create scrape session', async () => {
    const { data, error } = await supabase
      .from('scrape_sessions')
      .insert({
        user_id: testUserId,
        session_name: 'Test Session',
        urls: ['https://instagram.com/p/test123']
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.session_name).toBe('Test Session')
  })

  it('should enforce RLS policies', async () => {
    // Test that users can't access other users' data
    const anonSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    const { data, error } = await anonSupabase
      .from('scrape_sessions')
      .select()

    expect(data).toEqual([])
  })

  it('should calculate analytics correctly', async () => {
    // Insert test post
    const { data: post } = await supabase
      .from('instagram_posts')
      .insert({
        user_id: testUserId,
        post_id: 'test123',
        post_url: 'https://instagram.com/p/test123',
        likes_count: 100,
        comments_count: 10,
        owner_followers_count: 1000
      })
      .select()
      .single()

    expect(post.engagement_rate).toBe(11.0) // (100+10)/1000 * 100
  })
})
```

### 9.2 Performance Testing
```javascript
// tests/performance.test.js
import { performance } from 'perf_hooks'

describe('Performance Tests', () => {
  it('should handle bulk data insertion efficiently', async () => {
    const start = performance.now()
    
    const posts = Array.from({ length: 1000 }, (_, i) => ({
      user_id: testUserId,
      post_id: `test${i}`,
      post_url: `https://instagram.com/p/test${i}`,
      likes_count: Math.floor(Math.random() * 1000),
      comments_count: Math.floor(Math.random() * 100),
      owner_followers_count: Math.floor(Math.random() * 10000)
    }))
    
    await supabase.from('instagram_posts').insert(posts)
    
    const end = performance.now()
    const duration = end - start
    
    expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
  })
})
```

---

## 📋 Phase 10: Deployment Checklist

### 10.1 Pre-deployment Verification
- [ ] All migrations applied successfully
- [ ] RLS policies tested and working
- [ ] Real-time subscriptions functioning
- [ ] Storage buckets configured
- [ ] Environment variables set
- [ ] SSL certificates valid
- [ ] Performance benchmarks met
- [ ] Security audit completed

### 10.2 Go-Live Steps
1. **Backup existing data**
   ```bash
   npm run backup:local-data
   ```

2. **Run migration script**
   ```bash
   npm run db:migrate-production
   ```

3. **Verify data integrity**
   ```bash
   npm run db:verify
   ```

4. **Update application config**
   ```bash
   npm run deploy:update-config
   ```

5. **Monitor real-time performance**
   ```bash
   npm run monitor:realtime
   ```

### 10.3 Rollback Plan
```javascript
// rollback-plan.js
export async function rollbackToLocal() {
  console.log('🔄 Rolling back to local storage...')
  
  // Export all data from Supabase
  const data = await exportAllUserData()
  
  // Save to local files
  await saveToLocalFiles(data)
  
  // Update application config
  await updateConfigToLocal()
  
  console.log('✅ Rollback complete')
}
```

---

## 🎯 Success Metrics

### Key Performance Indicators
- **Database Response Time**: < 100ms for queries
- **Real-time Update Latency**: < 500ms
- **Data Consistency**: 99.9% accuracy
- **Uptime**: 99.9% availability
- **Scalability**: Handle 10x current load
- **Security**: Zero data breaches

### Monitoring Setup
```javascript
// monitoring.js
export class SupabaseMonitoring {
  constructor() {
    this.metrics = {
      queryTimes: [],
      realtimeLatency: [],
      errorRates: []
    }
  }

  async trackQueryPerformance(query) {
    const start = performance.now()
    const result = await query()
    const duration = performance.now() - start
    
    this.metrics.queryTimes.push(duration)
    
    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms`)
    }
    
    return result
  }

  generateReport() {
    return {
      avgQueryTime: this.metrics.queryTimes.reduce((a, b) => a + b, 0) / this.metrics.queryTimes.length,
      slowQueries: this.metrics.queryTimes.filter(t => t > 1000).length,
      totalQueries: this.metrics.queryTimes.length
    }
  }
}
```

---

## 📚 Documentation & Training

### 10.1 API Documentation
- Supabase schema documentation
- Real-time event handling guide
- Storage management procedures
- Security best practices

### 10.2 Team Training Materials
- Database query optimization
- Real-time subscription management
- Troubleshooting common issues
- Performance monitoring procedures

---

## 🚀 Next Steps for Tomorrow

1. **Install Supabase CLI** using NPX
2. **Initialize project** and link to cloud instance
3. **Create initial migration files** for core schema
4. **Set up RLS policies** for data security
5. **Test real-time functionality** with simple examples
6. **Configure storage buckets** for file management
7. **Implement basic authentication** flow
8. **Migrate existing data** from local files
9. **Set up monitoring** and performance tracking
10. **Deploy to production** with rollback plan ready

---

*This plan provides a comprehensive roadmap for transforming Informint into a scalable, real-time Instagram analytics platform powered by Supabase. Each phase builds upon the previous one, ensuring a smooth transition from local file storage to a robust cloud database solution.* 
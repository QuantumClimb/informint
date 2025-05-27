# Informint - Supabase Integration

## Overview

Informint has been successfully migrated from local file storage to **Supabase** cloud database. This provides scalable, real-time data storage with advanced analytics capabilities.

## 🚀 Quick Start

### 1. Environment Setup
Your `.env` file should contain:
```env
SUPABASE_URL=https://izojazwwccthjrxyfcrz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APIFY_TOKEN=your_apify_token_here
```

### 2. Start the Supabase Server
```bash
npm run start:supabase
# or for development
npm run dev:supabase
```

### 3. Test the Integration
```bash
npm test
```

## 📊 Database Schema

### Core Tables

1. **`users`** - User management and subscription tiers
2. **`scrape_sessions`** - Track scraping operations
3. **`instagram_posts`** - Complete Instagram post data (55 fields)
4. **`instagram_comments`** - Comments with threading support
5. **`tagged_users`** - Tagged users and co-authors
6. **`analytics_cache`** - Performance optimization cache

### Key Features

- **All 159 Instagram variables** from your documentation are supported
- **Automatic analytics calculation** via PostgreSQL triggers
- **Real-time engagement rate** and performance scoring
- **Row Level Security (RLS)** for data isolation
- **Foreign key constraints** for data integrity

## 🔄 Migration from Local Files

### What Changed

| Before (Local Files) | After (Supabase) |
|---------------------|------------------|
| `scrapes/` directory | `scrape_sessions` table |
| JSON files | Structured database tables |
| File-based analytics | Real-time database analytics |
| No user management | Multi-user support ready |
| Limited scalability | Cloud-scale infrastructure |

### API Endpoints

All existing endpoints work the same way:

- `GET /data.json` - All posts from database
- `GET /api/scrapes` - All scrape sessions
- `GET /api/scrapes/:sessionId` - Posts from specific session
- `GET /api/analytics` - Real-time analytics
- `GET /api/scrape?url=...` - Scrape and save to database

## 📈 Analytics Features

### Automatic Calculations

The database automatically calculates:
- **Engagement Rate**: `(likes + comments) / followers * 100`
- **Performance Score**: 0-100 based on engagement, reach, verification
- **Reach Multiplier**: `video_views / followers`
- **Viral Coefficient**: Advanced virality metrics

### Real-time Analytics

```javascript
// Get creator performance from database
const creators = await supabaseManager.getCreatorPerformance();

// Get comprehensive analytics
const analytics = await supabaseManager.getAnalyticsSummary();
```

## 🛠️ Development

### Available Scripts

```bash
npm run start:supabase    # Start Supabase server
npm run dev:supabase      # Development mode
npm test                  # Run integration tests
npm run db:verify         # Verify database connection
```

### Database Operations

```javascript
const supabaseManager = require('./supabase-client');

// Create scrape session
const session = await supabaseManager.createScrapeSession({
  sessionName: 'My Scrape',
  inputUrls: ['https://instagram.com/p/...']
});

// Save Instagram posts
await supabaseManager.saveInstagramPosts(posts, session.id);

// Get all posts with comments and tagged users
const posts = await supabaseManager.getAllPostsWithRelatedData();
```

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **User-based data isolation** (ready for multi-user)
- **Secure API keys** via environment variables
- **Foreign key constraints** prevent data corruption

## 📊 Dashboard Integration

The dashboard automatically reads from Supabase:

1. **Posts View**: Shows all posts from database with comments and tagged users
2. **Analytics View**: Real-time analytics from database calculations
3. **Scrapes Manager**: Manages database sessions instead of files
4. **Performance Metrics**: Live engagement rates and performance scores

## 🚀 Production Deployment

### Supabase Project Details
- **Project ID**: `izojazwwccthjrxyfcrz`
- **Region**: `ap-south-1` (Asia Pacific - Mumbai)
- **Plan**: Free tier (upgradeable)
- **Database**: PostgreSQL with real-time capabilities

### Scaling Considerations

1. **Free Tier Limits**:
   - 500MB database storage
   - 2GB bandwidth per month
   - 50,000 monthly active users

2. **Upgrade Path**:
   - Pro plan: $25/month for production workloads
   - Team plan: $599/month for larger teams

## 🔧 Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   ```bash
   # Temporarily disable for testing
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   ```

2. **Connection Issues**
   ```bash
   # Verify environment variables
   node scripts/verify-database.js
   ```

3. **Missing Data**
   ```bash
   # Check database stats
   curl http://localhost:3000/api/status
   ```

### Debug Mode

Set `NODE_ENV=development` for detailed logging:
```bash
NODE_ENV=development npm run start:supabase
```

## 📝 Migration Notes

### Data Preservation
- All existing scrape data can be imported via the API
- Dashboard maintains full compatibility
- Analytics calculations are enhanced with database triggers

### Performance Improvements
- **Faster queries** with database indexing
- **Real-time updates** with Supabase subscriptions
- **Cached analytics** for improved response times
- **Concurrent access** support for multiple users

## 🎯 Next Steps

1. **Authentication**: Implement user login/signup
2. **Real-time Updates**: Add live dashboard updates
3. **Advanced Analytics**: Custom SQL queries and reports
4. **API Rate Limiting**: Implement usage quotas
5. **Data Export**: CSV/Excel export functionality

## 📞 Support

For issues with the Supabase integration:

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Run the test suite: `npm test`
3. Verify database connection: `npm run db:verify`
4. Check server logs for detailed error messages

---

**Informint** - Fresh Data. Real Influence. Now powered by Supabase! 🚀 
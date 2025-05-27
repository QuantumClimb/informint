require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ApifyClient } = require('apify-client');
const config = require('./config');
const InformintAnalytics = require('./analytics');
const supabaseManager = require('./supabase-client');

// Initialize Apify client with config
const client = new ApifyClient({ token: config.apify.token });
const analytics = new InformintAnalytics();
const app = express();
const port = config.server.port;

app.use(cors());
app.use(express.static('.'));

// ===== DATA ENDPOINTS (Updated for Supabase) =====

// Serve combined data from all posts in database
app.get('/data.json', async (req, res) => {
  try {
    const posts = await supabaseManager.getAllPostsWithRelatedData();
    
    // Transform database format back to original format for compatibility
    const transformedPosts = posts.map(post => ({
      id: post.post_id,
      inputUrl: post.input_url,
      type: post.post_type,
      shortCode: post.short_code,
      url: post.post_url,
      alt: post.alt_text,
      
      // Owner information
      ownerUsername: post.owner_username,
      ownerFullName: post.owner_full_name,
      ownerId: post.owner_id,
      ownerFollowersCount: post.owner_followers_count,
      ownerFollowingCount: post.owner_following_count,
      ownerIsVerified: post.owner_is_verified,
      ownerProfilePicUrl: post.owner_profile_pic_url,
      ownerProfilePicUrlHD: post.owner_profile_pic_url_hd,
      ownerBiography: post.owner_biography,
      ownerExternalUrl: post.owner_external_url,
      ownerIsBusinessAccount: post.owner_is_business_account,
      ownerPostsCount: post.owner_posts_count,
      ownerAccountType: post.owner_account_type,
      ownerCategory: post.owner_category,
      
      // Content
      caption: post.caption,
      hashtags: post.hashtags,
      mentions: post.mentions,
      firstComment: post.first_comment,
      
      // Engagement
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      videoViewCount: post.video_view_count,
      videoPlayCount: post.video_play_count,
      isCommentsDisabled: post.is_comments_disabled,
      
      // Media
      videoUrl: post.video_url,
      displayUrl: post.display_url,
      images: post.images,
      videoDuration: post.video_duration,
      dimensionsHeight: post.dimensions_height,
      dimensionsWidth: post.dimensions_width,
      
      // Timing
      timestamp: post.post_timestamp || post.scraped_at,
      
      // Location
      locationName: post.location_name,
      locationId: post.location_id,
      
      // Business
      isSponsored: post.is_sponsored,
      productType: post.product_type,
      
      // Music
      musicInfo: {
        artist_name: post.music_artist_name,
        song_name: post.music_song_name,
        uses_original_audio: post.uses_original_audio,
        should_mute_audio: post.should_mute_audio,
        should_mute_audio_reason: post.should_mute_audio_reason,
        audio_id: post.audio_id
      },
      
      // Analytics
      engagementRate: post.engagement_rate,
      performanceScore: post.performance_score,
      reachMultiplier: post.reach_multiplier,
      
             // Comments and tagged users from database
       latestComments: (post.comments || []).map(comment => ({
         id: comment.comment_id,
         text: comment.text,
         ownerUsername: comment.username,
         timestamp: comment.timestamp,
         likesCount: comment.likes_count,
         repliesCount: comment.replies_count,
         ownerProfilePicUrl: comment.owner_profile_pic_url,
         owner: {
           id: comment.owner_id,
           is_verified: comment.owner_is_verified,
           profile_pic_url: comment.owner_profile_pic_url,
           username: comment.username
         }
       })),
       taggedUsers: (post.tagged_users || []).filter(user => user.tag_type === 'tagged').map(user => ({
         id: user.user_id,
         username: user.username,
         full_name: user.full_name,
         is_verified: user.is_verified,
         profile_pic_url: user.profile_pic_url
       })),
       coauthorProducers: (post.tagged_users || []).filter(user => user.tag_type === 'coauthor').map(user => ({
         id: user.user_id,
         username: user.username,
         full_name: user.full_name,
         is_verified: user.is_verified,
         profile_pic_url: user.profile_pic_url
       }))
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error('❌ Error fetching posts from database:', error);
    res.status(500).json({ error: 'Failed to fetch posts from database' });
  }
});

// Get list of all scrape sessions (replaces scrapes list)
app.get('/api/scrapes', async (req, res) => {
  try {
    const sessions = await supabaseManager.getAllScrapeSessions();
    
    // Transform to match original format
    const transformedSessions = sessions.map(session => ({
      filename: `session-${session.id}`,
      sessionId: session.id,
      sessionName: session.session_name,
      timestamp: session.created_at,
      itemCount: session.total_posts,
      firstUrl: session.input_urls?.[0] || 'Unknown',
      status: session.status,
      completedAt: session.completed_at,
      errorMessage: session.error_message
    }));

    res.json(transformedSessions);
  } catch (error) {
    console.error('❌ Error fetching scrape sessions:', error);
    res.status(500).json({ error: 'Failed to fetch scrape sessions' });
  }
});

// Get individual scrape session data
app.get('/api/scrapes/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId.replace('session-', ''); // Remove prefix if present
    const posts = await supabaseManager.getPostsBySession(sessionId);
    
    // Transform to original format
    const transformedPosts = posts.map(post => ({
      id: post.post_id,
      inputUrl: post.input_url,
      type: post.post_type,
      shortCode: post.short_code,
      url: post.post_url,
      ownerUsername: post.owner_username,
      ownerFullName: post.owner_full_name,
      ownerFollowersCount: post.owner_followers_count,
      ownerIsVerified: post.owner_is_verified,
      caption: post.caption,
      hashtags: post.hashtags,
      mentions: post.mentions,
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      videoViewCount: post.video_view_count,
      videoPlayCount: post.video_play_count,
      videoUrl: post.video_url,
      displayUrl: post.display_url,
      videoDuration: post.video_duration,
      timestamp: post.post_timestamp || post.scraped_at,
      locationName: post.location_name,
      isSponsored: post.is_sponsored,
      productType: post.product_type,
      musicInfo: {
        artist_name: post.music_artist_name,
        song_name: post.music_song_name,
        uses_original_audio: post.uses_original_audio,
        audio_id: post.audio_id
      }
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error('❌ Error fetching session posts:', error);
    res.status(500).json({ error: 'Failed to fetch session posts' });
  }
});

// Delete a specific scrape session
app.delete('/api/scrapes/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId.replace('session-', '');
    await supabaseManager.deleteScrapeSession(sessionId);
    res.json({ message: 'Scrape session deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting scrape session:', error);
    res.status(500).json({ error: 'Failed to delete scrape session' });
  }
});

// Delete all scrapes (purge database)
app.delete('/api/scrapes', async (req, res) => {
  try {
    await supabaseManager.deleteAllData();
    res.json({ message: 'All data purged successfully' });
  } catch (error) {
    console.error('❌ Error purging database:', error);
    res.status(500).json({ error: 'Failed to purge database' });
  }
});

// ===== ANALYTICS ENDPOINTS (Updated for Supabase) =====

// Get comprehensive analytics for all scraped data
app.get('/api/analytics', async (req, res) => {
  try {
    const posts = await supabaseManager.getAllPosts();

    if (posts.length === 0) {
      return res.json({ 
        error: 'No data available for analytics',
        message: 'Please scrape some Instagram posts first'
      });
    }

    // Transform to original format for analytics
    const transformedPosts = posts.map(post => ({
      id: post.post_id,
      ownerUsername: post.owner_username,
      ownerFollowersCount: post.owner_followers_count,
      ownerIsVerified: post.owner_is_verified,
      ownerIsBusinessAccount: post.owner_is_business_account,
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      videoViewCount: post.video_view_count,
      timestamp: post.post_timestamp || post.scraped_at,
      engagementRate: post.engagement_rate,
      performanceScore: post.performance_score
    }));

    // Generate comprehensive analytics
    const analysisResult = analytics.analyzeBatch(transformedPosts);
    
    // Add insights
    if (!analysisResult.error) {
      analysisResult.insights = analytics.generateInsights(analysisResult);
    }

    console.log(`📊 Generated analytics for ${posts.length} posts from database`);
    res.json(analysisResult);
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Get engagement rate calculations only
app.get('/api/analytics/engagement', async (req, res) => {
  try {
    const posts = await supabaseManager.getAllPosts();

    if (posts.length === 0) {
      return res.json({ error: 'No data available for engagement analysis' });
    }

    // Calculate engagement metrics
    const engagementData = posts.map(post => {
      const engagementRate = post.engagement_rate || analytics.calculateEngagementRate(
        post.likes_count, 
        post.comments_count, 
        post.owner_followers_count
      );
      const reachMultiplier = post.reach_multiplier || analytics.calculateReachMultiplier(
        post.video_view_count, 
        post.owner_followers_count
      );

      return {
        postId: post.post_id,
        username: post.owner_username,
        followers: post.owner_followers_count,
        likes: post.likes_count,
        comments: post.comments_count,
        views: post.video_view_count,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        reachMultiplier: parseFloat(reachMultiplier.toFixed(2)),
        tier: analytics.getFollowerTier(post.owner_followers_count),
        performanceTier: analytics.getPerformanceTier(engagementRate)
      };
    });

    res.json({
      totalPosts: engagementData.length,
      avgEngagementRate: parseFloat((engagementData.reduce((sum, p) => sum + p.engagementRate, 0) / engagementData.length).toFixed(2)),
      engagementData: engagementData,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Engagement analytics error:', error);
    res.status(500).json({ error: 'Failed to calculate engagement metrics' });
  }
});

// Get creator performance matrix
app.get('/api/analytics/creators', async (req, res) => {
  try {
    const creatorPerformance = await supabaseManager.getCreatorPerformance();

    if (creatorPerformance.length === 0) {
      return res.json({ error: 'No data available for creator analysis' });
    }

    // Add tier information
    const enhancedCreators = creatorPerformance.map(creator => ({
      ...creator,
      tier: analytics.getFollowerTier(creator.followers),
      performanceTier: analytics.getPerformanceTier(creator.avgEngagementRate)
    }));

    res.json({
      totalCreators: enhancedCreators.length,
      creatorPerformance: enhancedCreators,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Creator analytics error:', error);
    res.status(500).json({ error: 'Failed to analyze creator performance' });
  }
});

// Get industry benchmarks
app.get('/api/analytics/benchmarks', (req, res) => {
  try {
    res.json({
      engagementRates: analytics.benchmarks.engagementRates,
      performanceTiers: analytics.benchmarks.performanceTiers,
      description: 'Industry standard engagement rate benchmarks by follower count',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Benchmarks error:', error);
    res.status(500).json({ error: 'Failed to get benchmarks' });
  }
});

// Analytics for specific scrape session
app.get('/api/analytics/scrape/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId.replace('session-', '');
    const posts = await supabaseManager.getPostsBySession(sessionId);
    
    if (posts.length === 0) {
      return res.json({ error: 'No data in scrape session for analysis' });
    }

    // Transform to original format for analytics
    const transformedPosts = posts.map(post => ({
      id: post.post_id,
      ownerUsername: post.owner_username,
      ownerFollowersCount: post.owner_followers_count,
      ownerIsVerified: post.owner_is_verified,
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      videoViewCount: post.video_view_count,
      timestamp: post.post_timestamp || post.scraped_at
    }));

    const analysisResult = analytics.analyzeBatch(transformedPosts);
    
    if (!analysisResult.error) {
      analysisResult.insights = analytics.generateInsights(analysisResult);
      analysisResult.sessionId = sessionId;
    }

    console.log(`📊 Generated analytics for session: ${sessionId}`);
    res.json(analysisResult);
  } catch (error) {
    console.error('❌ Session analytics error:', error);
    res.status(500).json({ error: 'Failed to analyze session' });
  }
});

// ===== SCRAPING ENDPOINT (Updated for Supabase) =====

app.get('/api/scrape', async (req, res) => {
  let urls = req.query.url;
  if (!urls) {
    return res.status(400).json({ error: 'Missing ?url=' });
  }
  if (!Array.isArray(urls)) urls = [urls];

  let session = null;

  try {
    // Create scrape session
    session = await supabaseManager.createScrapeSession({
      sessionName: `Scrape ${new Date().toISOString()}`,
      inputUrls: urls
    });

    console.log(`📱 Created scrape session ${session.id} for ${urls.length} URLs...`);

    // First, scrape post data
    const postInput = {
      directUrls: urls,
      ...config.apify.defaultInput
    };

    console.log(`📱 Starting post scraping for ${urls.length} URLs...`);
    const postRun = config.apify.taskId
      ? await client.task(config.apify.taskId).call(postInput)
      : await client.actor(config.apify.actorId).call(postInput);

    const postDatasetId = postRun.defaultDatasetId;

    // Fetch post items
    const postItems = [];
    let offset = 0;
    const limit = config.apify.pagination.limit;
    while (true) {
      const page = await client.dataset(postDatasetId).listItems({ offset, limit });
      postItems.push(...page.items);
      if (page.items.length < limit) break;
      offset += limit;
    }

    console.log(`✅ Post scraping completed: ${postItems.length} items`);

    // Extract unique usernames from scraped post data
    const usernames = [...new Set(postItems.map(item => item.ownerUsername).filter(Boolean))];
    
    console.log(`🔍 Extracted usernames from post data: ${usernames.join(', ')}`);

    // Second, scrape profile data for follower counts and missing info
    let profileData = {};
    if (usernames.length > 0) {
      try {
        console.log(`👤 Starting profile scraping for ${usernames.length} users...`);
        
        const profileInput = {
          usernames: usernames
        };

        const profileRun = await client.actor('apify/instagram-profile-scraper').call(profileInput);
        const profileDatasetId = profileRun.defaultDatasetId;
        
        const profileItems = await client.dataset(profileDatasetId).listItems();
        
        console.log(`✅ Profile scraping completed: ${profileItems.items.length} profiles`);
        
        // Create a map of username to profile data
        profileItems.items.forEach(profile => {
          profileData[profile.username] = profile;
        });
      } catch (profileErr) {
        console.warn('⚠️ Profile scraping failed:', profileErr.message);
        // Continue without profile data rather than failing completely
      }
    }

    // Enhance post items with profile data
    const enhancedItems = postItems.map(item => {
      const username = item.ownerUsername;
      const profile = profileData[username];
      
      if (profile) {
        console.log(`🔗 Enhancing data for @${username} with profile info`);
        return {
          ...item,
          // Add missing profile data
          ownerFollowersCount: profile.followersCount || 0,
          ownerFollowingCount: profile.followsCount || 0,
          ownerIsVerified: profile.verified || false,
          ownerProfilePicUrl: profile.profilePicUrl || item.ownerProfilePicUrl || '',
          ownerProfilePicUrlHD: profile.profilePicUrlHD || '',
          ownerBiography: profile.biography || '',
          ownerExternalUrl: profile.externalUrl || '',
          ownerIsBusinessAccount: profile.isBusinessAccount || false,
          ownerPostsCount: profile.postsCount || 0,
          ownerAccountType: profile.accountType || 1,
          ownerCategory: profile.businessCategoryName || ''
        };
      } else {
        console.log(`⚠️ No profile data found for @${username}`);
        return {
          ...item,
          // Add default values for missing profile data
          ownerFollowersCount: 0,
          ownerFollowingCount: 0,
          ownerIsVerified: false,
          ownerProfilePicUrlHD: '',
          ownerBiography: '',
          ownerExternalUrl: '',
          ownerIsBusinessAccount: false,
          ownerPostsCount: 0,
          ownerAccountType: 1,
          ownerCategory: ''
        };
      }
    });

    // Save enhanced data to Supabase
    console.log(`💾 Saving ${enhancedItems.length} posts to database...`);
    const savedPosts = await supabaseManager.saveInstagramPosts(enhancedItems, session.id);
    
    // Save comments and tagged users for each post
    for (let i = 0; i < enhancedItems.length; i++) {
      const item = enhancedItems[i];
      const savedPost = savedPosts[i];
      
      // Save comments if they exist
      if (item.latestComments && item.latestComments.length > 0) {
        await supabaseManager.saveComments(item.latestComments, savedPost.id);
      }
      
      // Save tagged users if they exist
      if (item.taggedUsers && item.taggedUsers.length > 0) {
        await supabaseManager.saveTaggedUsers(item.taggedUsers, savedPost.id);
      }
      
      // Save co-authors if they exist
      if (item.coauthorProducers && item.coauthorProducers.length > 0) {
        await supabaseManager.saveCoauthors(item.coauthorProducers, savedPost.id);
      }
    }

    // Complete the session
    await supabaseManager.completeScrapeSession(session.id, enhancedItems.length);
    
    console.log(`✅ Scrape session ${session.id} completed successfully with ${enhancedItems.length} posts`);

    res.json({
      sessionId: session.id,
      totalPosts: enhancedItems.length,
      posts: enhancedItems,
      message: 'Scrape completed and saved to database'
    });
  } catch (error) {
    console.error('❌ Scrape error:', error);
    
    // Mark session as failed if it was created
    if (session) {
      try {
        await supabaseManager.failScrapeSession(session.id, error.message);
      } catch (sessionError) {
        console.error('❌ Failed to update session status:', sessionError);
      }
    }
    
    res.status(500).json({ error: error.message || 'Scrape failed' });
  }
});

// ===== DATABASE STATUS ENDPOINT =====

app.get('/api/status', async (req, res) => {
  try {
    const stats = await supabaseManager.getStats();
    res.json({
      database: 'connected',
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== SECURE PURGE ENDPOINTS =====

// Export user data to CSV
app.get('/api/export', async (req, res) => {
  try {
    const userId = req.query.userId; // Optional user ID parameter
    const exportResult = await supabaseManager.exportUserDataToCSV(userId);
    
    if (!exportResult) {
      return res.json({
        success: false,
        message: 'No data to export',
        postCount: 0
      });
    }
    
    res.json({
      success: true,
      filename: exportResult.filename,
      postCount: exportResult.postCount,
      message: `Exported ${exportResult.postCount} posts to CSV`
    });
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Safe purge with CSV export (recommended)
app.post('/api/purge-safe', async (req, res) => {
  try {
    const userId = req.body.userId; // Optional user ID parameter
    console.log('🔄 Starting safe purge with CSV export...');
    
    const result = await supabaseManager.safePurgeWithExport(userId);
    
    res.json({
      success: true,
      exported: result ? true : false,
      filename: result ? result.filename : null,
      postCount: result ? result.postCount : 0,
      message: result 
        ? `Successfully exported ${result.postCount} posts to CSV and purged user data`
        : 'No data to export, purge completed'
    });
  } catch (error) {
    console.error('❌ Safe purge error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// User-specific purge (without export)
app.post('/api/purge-user', async (req, res) => {
  try {
    const userId = req.body.userId; // Optional user ID parameter
    console.log(`🗑️ Starting user-specific purge for user: ${userId || 'default'}`);
    
    await supabaseManager.purgeUserData(userId);
    
    res.json({
      success: true,
      message: `Successfully purged data for user: ${userId || 'default'}`
    });
  } catch (error) {
    console.error('❌ User purge error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ===== DEPRECATED ENDPOINTS =====

// Legacy purge endpoint (now secured)
app.post('/api/purge', async (req, res) => {
  res.status(410).json({
    success: false,
    error: '🚨 SECURITY: This endpoint is deprecated for security reasons. Use /api/purge-safe or /api/purge-user instead.',
    alternatives: {
      safePurge: '/api/purge-safe (exports CSV then purges)',
      userPurge: '/api/purge-user (purges specific user data)',
      export: '/api/export (export only, no purge)'
    }
  });
});

// Initialize server
function startServer() {
  app.listen(port, () => {
    console.log(`🚀 Server ready at ${config.server.baseUrl}`);
    console.log(`🗄️ Database: Supabase (${process.env.SUPABASE_URL})`);
    console.log(`📊 Analytics: Real-time database analytics enabled`);
    console.log(`🔒 Security: Row Level Security enabled`);
  });
}

// Start the server
startServer(); 
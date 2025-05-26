require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ApifyClient } = require('apify-client');
const config = require('./config');
const InformintAnalytics = require('./analytics');

// Initialize Apify client with config
const client = new ApifyClient({ token: config.apify.token });
const analytics = new InformintAnalytics();
const app = express();
const port = config.server.port;

app.use(cors());
app.use(express.static('.'));

// Startup functions
function createBackup() {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  const backupDir = path.join(__dirname, config.storage.backupDir);
  
  if (!fs.existsSync(scrapesDir)) return;
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
  if (files.length === 0) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  // Combine all scrapes into backup
  const allData = [];
  for (const file of files) {
    try {
      const filePath = path.join(scrapesDir, file);
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      allData.push({
        filename: file,
        timestamp: fs.statSync(filePath).mtime,
        data: fileData
      });
    } catch (err) {
      console.error(`❌ Error backing up ${file}:`, err);
    }
  }
  
  fs.writeFileSync(backupFile, JSON.stringify(allData, null, 2));
  console.log(`💾 Created backup with ${files.length} scrapes: ${backupFile}`);
}

function purgeScrapesOnStartup() {
  if (!config.app.purgeScrapesOnStartup) return;
  
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  
  if (!fs.existsSync(scrapesDir)) {
    console.log('📁 No scrapes directory found, nothing to purge');
    return;
  }
  
  const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('🧹 No scrapes to purge');
    return;
  }
  
  // Create backup before purging if enabled
  if (config.app.createBackupBeforePurge) {
    createBackup();
  }
  
  // Delete all scrape files
  let deletedCount = 0;
  for (const file of files) {
    try {
      const filePath = path.join(scrapesDir, file);
      fs.unlinkSync(filePath);
      deletedCount++;
    } catch (err) {
      console.error(`❌ Error deleting ${file}:`, err);
    }
  }
  
  console.log(`🧹 Purged ${deletedCount} scrapes on startup`);
}

// Serve combined data from all scrapes
app.get('/data.json', (req, res) => {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  const combinedData = [];

  if (fs.existsSync(scrapesDir)) {
    const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(scrapesDir, file);
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        combinedData.push(...fileData);
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
  }

  // Sort by timestamp (newest first)
  combinedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(combinedData);
});

// Get list of all scrapes
app.get('/api/scrapes', (req, res) => {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  
  if (!fs.existsSync(scrapesDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(scrapesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(scrapesDir, file);
      const stats = fs.statSync(filePath);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          filename: file,
          timestamp: stats.mtime,
          itemCount: data.length,
          firstUrl: data[0]?.inputUrl || 'Unknown'
        };
      } catch (err) {
        return {
          filename: file,
          timestamp: stats.mtime,
          itemCount: 0,
          firstUrl: 'Error reading file'
        };
      }
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(files);
});

// Get individual scrape data
app.get('/api/scrapes/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, config.storage.scrapesDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Scrape file not found' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Error reading scrape file:', err);
    res.status(500).json({ error: 'Failed to read scrape file' });
  }
});

// Delete a specific scrape
app.delete('/api/scrapes/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, config.storage.scrapesDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Scrape file not found' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ message: 'Scrape deleted successfully' });
  } catch (err) {
    console.error('Error deleting scrape:', err);
    res.status(500).json({ error: 'Failed to delete scrape' });
  }
});

// Delete all scrapes (purge)
app.delete('/api/scrapes', (req, res) => {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  
  if (!fs.existsSync(scrapesDir)) {
    return res.json({ message: 'No scrapes to delete' });
  }

  try {
    const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(scrapesDir, file);
      fs.unlinkSync(filePath);
      deletedCount++;
    }

    res.json({ message: `Successfully deleted ${deletedCount} scrapes` });
  } catch (err) {
    console.error('Error purging scrapes:', err);
    res.status(500).json({ error: 'Failed to purge scrapes' });
  }
});

// ===== ANALYTICS ENDPOINTS =====

// Get comprehensive analytics for all scraped data
app.get('/api/analytics', (req, res) => {
  try {
    const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
    const combinedData = [];

    if (fs.existsSync(scrapesDir)) {
      const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(scrapesDir, file);
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          combinedData.push(...fileData);
        } catch (err) {
          console.error(`Error reading ${file} for analytics:`, err);
        }
      }
    }

    if (combinedData.length === 0) {
      return res.json({ 
        error: 'No data available for analytics',
        message: 'Please scrape some Instagram posts first'
      });
    }

    // Generate comprehensive analytics
    const analysisResult = analytics.analyzeBatch(combinedData);
    
    // Add insights
    if (!analysisResult.error) {
      analysisResult.insights = analytics.generateInsights(analysisResult);
    }

    console.log(`📊 Generated analytics for ${combinedData.length} posts`);
    res.json(analysisResult);
  } catch (err) {
    console.error('❌ Analytics error:', err);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Get engagement rate calculations only
app.get('/api/analytics/engagement', (req, res) => {
  try {
    const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
    const combinedData = [];

    if (fs.existsSync(scrapesDir)) {
      const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(scrapesDir, file);
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          combinedData.push(...fileData);
        } catch (err) {
          console.error(`Error reading ${file} for engagement analytics:`, err);
        }
      }
    }

    if (combinedData.length === 0) {
      return res.json({ error: 'No data available for engagement analysis' });
    }

    // Calculate engagement metrics only
    const engagementData = combinedData.map(post => {
      const engagementRate = analytics.calculateEngagementRate(
        post.likesCount, 
        post.commentsCount, 
        post.ownerFollowersCount
      );
      const reachMultiplier = analytics.calculateReachMultiplier(
        post.videoViewCount, 
        post.ownerFollowersCount
      );

      return {
        postId: post.id,
        username: post.ownerUsername,
        followers: post.ownerFollowersCount,
        likes: post.likesCount,
        comments: post.commentsCount,
        views: post.videoViewCount,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        reachMultiplier: parseFloat(reachMultiplier.toFixed(2)),
        tier: analytics.getFollowerTier(post.ownerFollowersCount),
        performanceTier: analytics.getPerformanceTier(engagementRate)
      };
    });

    res.json({
      totalPosts: engagementData.length,
      avgEngagementRate: parseFloat((engagementData.reduce((sum, p) => sum + p.engagementRate, 0) / engagementData.length).toFixed(2)),
      engagementData: engagementData,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Engagement analytics error:', err);
    res.status(500).json({ error: 'Failed to calculate engagement metrics' });
  }
});

// Get creator performance matrix
app.get('/api/analytics/creators', (req, res) => {
  try {
    const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
    const combinedData = [];

    if (fs.existsSync(scrapesDir)) {
      const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(scrapesDir, file);
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          combinedData.push(...fileData);
        } catch (err) {
          console.error(`Error reading ${file} for creator analytics:`, err);
        }
      }
    }

    if (combinedData.length === 0) {
      return res.json({ error: 'No data available for creator analysis' });
    }

    // Group by creator and calculate performance
    const creatorMap = {};
    combinedData.forEach(post => {
      const username = post.ownerUsername;
      if (!creatorMap[username]) {
        creatorMap[username] = [];
      }
      creatorMap[username].push(post);
    });

    const creatorPerformance = Object.entries(creatorMap).map(([username, posts]) => {
      const analysisResult = analytics.analyzeBatch(posts);
      const creatorData = posts[0]; // Get creator info from first post
      
      return {
        username,
        postCount: posts.length,
        followers: creatorData.ownerFollowersCount,
        isVerified: creatorData.ownerIsVerified,
        isBusinessAccount: creatorData.ownerIsBusinessAccount,
        tier: analytics.getFollowerTier(creatorData.ownerFollowersCount),
        avgEngagementRate: analysisResult.summary?.avgEngagementRate || 0,
        avgPerformanceScore: analysisResult.summary?.avgPerformanceScore || 0,
        avgROIPotential: analysisResult.summary?.avgROIPotential || 0,
        totalLikes: posts.reduce((sum, p) => sum + (parseInt(p.likesCount) || 0), 0),
        totalComments: posts.reduce((sum, p) => sum + (parseInt(p.commentsCount) || 0), 0),
        totalViews: posts.reduce((sum, p) => sum + (parseInt(p.videoViewCount) || 0), 0)
      };
    }).sort((a, b) => b.avgPerformanceScore - a.avgPerformanceScore);

    res.json({
      totalCreators: creatorPerformance.length,
      creatorPerformance,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Creator analytics error:', err);
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
  } catch (err) {
    console.error('❌ Benchmarks error:', err);
    res.status(500).json({ error: 'Failed to get benchmarks' });
  }
});

// Analytics for specific scrape file
app.get('/api/analytics/scrape/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, config.storage.scrapesDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Scrape file not found' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.length === 0) {
      return res.json({ error: 'No data in scrape file for analysis' });
    }

    const analysisResult = analytics.analyzeBatch(data);
    
    if (!analysisResult.error) {
      analysisResult.insights = analytics.generateInsights(analysisResult);
      analysisResult.scrapeFile = filename;
    }

    console.log(`📊 Generated analytics for scrape file: ${filename}`);
    res.json(analysisResult);
  } catch (err) {
    console.error('❌ Scrape analytics error:', err);
    res.status(500).json({ error: 'Failed to analyze scrape file' });
  }
});

app.get('/api/scrape', async (req, res) => {
  let urls = req.query.url;
  if (!urls) {
    return res.status(400).json({ error: 'Missing ?url=' });
  }
  if (!Array.isArray(urls)) urls = [urls];

  try {
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

    // Save enhanced data to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const individualPath = path.join(__dirname, config.storage.scrapesDir, `scrape-${timestamp}.json`);
    
    // Ensure scrapes directory exists
    const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
    if (!fs.existsSync(scrapesDir)) {
      fs.mkdirSync(scrapesDir);
    }
    
    fs.writeFileSync(individualPath, JSON.stringify(enhancedItems, null, 2));
    console.log(`✅ Wrote enhanced scrape (${enhancedItems.length} items) to ${individualPath}`);

    res.json(enhancedItems);
  } catch (err) {
    console.error('❌ Scrape error:', err);
    res.status(500).json({ error: err.message || 'Scrape failed' });
  }
});

// Initialize server
function startServer() {
  // Run startup tasks
  purgeScrapesOnStartup();
  
  app.listen(port, () => {
    console.log(`🚀 Server ready at ${config.server.baseUrl}`);
    console.log(`📁 Scrapes directory: ${config.storage.scrapesDir}`);
    console.log(`💾 Backup directory: ${config.storage.backupDir}`);
    console.log(`🧹 Purge on startup: ${config.app.purgeScrapesOnStartup ? 'enabled' : 'disabled'}`);
  });
}

// Start the server
startServer();

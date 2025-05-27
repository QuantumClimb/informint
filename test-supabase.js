#!/usr/bin/env node

require('dotenv').config();
const supabaseManager = require('./supabase-client');

async function testSupabaseIntegration() {
  console.log('🧪 Testing Supabase integration...\n');

  try {
    // Test 1: Check database connection and stats
    console.log('1️⃣ Testing database connection...');
    const stats = await supabaseManager.getStats();
    console.log('✅ Database connected successfully');
    console.log(`📊 Current stats:`, stats);
    console.log('');

    // Test 2: Create a test scrape session
    console.log('2️⃣ Creating test scrape session...');
    const session = await supabaseManager.createScrapeSession({
      sessionName: 'Test Session',
      inputUrls: ['https://instagram.com/p/test123']
    });
    console.log('✅ Scrape session created:', session.id);
    console.log('');

    // Test 3: Create test Instagram post data
    console.log('3️⃣ Creating test Instagram post...');
    const testPost = {
      inputUrl: 'https://instagram.com/p/test123',
      id: 'test123',
      type: 'Video',
      shortCode: 'test123',
      url: 'https://instagram.com/p/test123',
      ownerUsername: 'testuser',
      ownerFullName: 'Test User',
      ownerId: '123456789',
      ownerFollowersCount: 10000,
      ownerIsVerified: true,
      caption: 'This is a test post for Supabase integration',
      hashtags: ['#test', '#supabase', '#informint'],
      mentions: ['@testmention'],
      likesCount: 500,
      commentsCount: 25,
      videoViewCount: 2000,
      timestamp: new Date().toISOString(),
      musicInfo: {
        artist_name: 'Test Artist',
        song_name: 'Test Song'
      },
      latestComments: [
        {
          id: 'comment1',
          text: 'Great post!',
          ownerUsername: 'commenter1',
          timestamp: new Date().toISOString(),
          likesCount: 5,
          owner: {
            id: 'commenter1_id',
            is_verified: false,
            profile_pic_url: 'https://example.com/pic1.jpg',
            username: 'commenter1'
          }
        }
      ],
      taggedUsers: [
        {
          id: 'tagged1',
          username: 'taggeduser',
          full_name: 'Tagged User',
          is_verified: false,
          profile_pic_url: 'https://example.com/tagged.jpg'
        }
      ]
    };

    const savedPosts = await supabaseManager.saveInstagramPosts([testPost], session.id);
    console.log('✅ Instagram post saved:', savedPosts[0].id);
    console.log('');

    // Test 4: Save comments and tagged users
    console.log('4️⃣ Saving comments and tagged users...');
    await supabaseManager.saveComments(testPost.latestComments, savedPosts[0].id);
    await supabaseManager.saveTaggedUsers(testPost.taggedUsers, savedPosts[0].id);
    console.log('✅ Comments and tagged users saved');
    console.log('');

    // Test 5: Complete the session
    console.log('5️⃣ Completing scrape session...');
    await supabaseManager.completeScrapeSession(session.id, 1);
    console.log('✅ Scrape session completed');
    console.log('');

    // Test 6: Fetch all data
    console.log('6️⃣ Fetching all posts with related data...');
    const allPosts = await supabaseManager.getAllPostsWithRelatedData();
    console.log(`✅ Retrieved ${allPosts.length} posts with comments and tagged users`);
    
    if (allPosts.length > 0) {
      const post = allPosts[0];
      console.log(`📝 Sample post: @${post.owner_username} - ${post.caption?.substring(0, 50)}...`);
      console.log(`💬 Comments: ${post.comments?.length || 0}`);
      console.log(`🏷️ Tagged users: ${post.tagged_users?.length || 0}`);
    }
    console.log('');

    // Test 7: Get analytics
    console.log('7️⃣ Testing analytics...');
    const creatorPerformance = await supabaseManager.getCreatorPerformance();
    console.log(`✅ Analytics generated for ${creatorPerformance.length} creators`);
    console.log('');

    // Test 8: Get all sessions
    console.log('8️⃣ Fetching all scrape sessions...');
    const sessions = await supabaseManager.getAllScrapeSessions();
    console.log(`✅ Retrieved ${sessions.length} scrape sessions`);
    console.log('');

    // Test 9: Clean up test data
    console.log('9️⃣ Cleaning up test data...');
    await supabaseManager.deleteScrapeSession(session.id);
    console.log('✅ Test data cleaned up');
    console.log('');

    console.log('🎉 All tests passed! Supabase integration is working correctly.');
    console.log('');
    console.log('🚀 You can now:');
    console.log('   • Run the Supabase-enabled server: node index-supabase.js');
    console.log('   • Use the dashboard to view data from the database');
    console.log('   • Scrape new Instagram posts directly to Supabase');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   • Check your .env file has correct Supabase credentials');
    console.log('   • Verify your database tables are created');
    console.log('   • Run: node scripts/verify-database.js');
  }
}

// Run the test
testSupabaseIntegration(); 
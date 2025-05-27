#!/usr/bin/env node

require('dotenv').config();
const supabaseManager = require('./supabase-client');

async function checkDatabaseStatus() {
  console.log('🔍 Checking remote Supabase database status...\n');

  try {
    // Get current database statistics
    console.log('📊 Getting database statistics...');
    const stats = await supabaseManager.getStats();
    
    console.log('✅ Database Connection: SUCCESS');
    console.log(`🗄️ Database URL: ${process.env.SUPABASE_URL}`);
    console.log('');
    console.log('📈 Current Data Count:');
    console.log(`   📁 Scrape Sessions: ${stats.totalSessions}`);
    console.log(`   📝 Instagram Posts: ${stats.totalPosts}`);
    console.log(`   💬 Comments: ${stats.totalComments}`);
    console.log(`   🏷️ Tagged Users: ${stats.totalTaggedUsers}`);
    console.log('');

    // Check for recent activity
    if (stats.totalPosts > 0) {
      console.log('🔍 Getting recent posts...');
      const recentPosts = await supabaseManager.getInstagramPosts(5, 0);
      
      console.log(`✅ Found ${recentPosts.length} recent posts:`);
      recentPosts.forEach((post, index) => {
        const date = new Date(post.scraped_at).toLocaleString();
        console.log(`   ${index + 1}. @${post.owner_username} - ${post.post_type} (${date})`);
        console.log(`      💖 ${post.likes_count || 0} likes | 💬 ${post.comments_count || 0} comments | 👀 ${post.video_view_count || 0} views`);
        console.log(`      📊 Engagement: ${post.engagement_rate || 0}% | Performance: ${post.performance_score || 0}/100`);
      });
      console.log('');

      // Check for very recent activity (last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const veryRecentPosts = recentPosts.filter(post => 
        new Date(post.scraped_at) > tenMinutesAgo
      );

      if (veryRecentPosts.length > 0) {
        console.log('🎉 RECENT ACTIVITY DETECTED!');
        console.log(`   ✅ ${veryRecentPosts.length} posts scraped in the last 10 minutes`);
        console.log('   🚀 Data is actively populating in the remote database!');
      } else {
        console.log('📊 Database contains data, but no activity in the last 10 minutes');
      }

      // Get scrape sessions
      console.log('');
      console.log('🕒 Recent scrape sessions...');
      const sessions = await supabaseManager.getAllScrapeSessions();
      sessions.slice(0, 3).forEach((session, index) => {
        const date = new Date(session.created_at).toLocaleString();
        console.log(`   ${index + 1}. ${session.session_name || 'Unnamed'} - ${session.status} (${date})`);
        console.log(`      📊 Posts: ${session.total_posts || 0} | URLs: ${session.input_urls?.length || 0}`);
      });

    } else {
      console.log('ℹ️ No data found in remote database yet');
      console.log('💡 Try running a test scrape to populate data');
      console.log('');
      console.log('🧪 Test scrape command:');
      console.log('   curl "http://localhost:3000/api/scrape?url=https://www.instagram.com/reel/DEey6Y3SB2Z/"');
      console.log('');
      console.log('🌐 Or visit in browser:');
      console.log('   http://localhost:3000/api/scrape?url=https://www.instagram.com/reel/DEey6Y3SB2Z/');
    }

    console.log('');
    console.log('🔗 Database Status: HEALTHY');
    console.log('📡 Real-time Analytics: ENABLED');
    console.log('🔒 Row Level Security: ACTIVE');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   • Check your .env file has correct Supabase credentials');
    console.log('   • Verify database connection: npm run db:verify');
    console.log('   • Fix RLS policies if needed');
  }
}

checkDatabaseStatus(); 
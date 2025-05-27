#!/usr/bin/env node

require('dotenv').config();
const supabaseManager = require('./supabase-client');

async function checkSpecificPost() {
  console.log('🔍 Checking for Instagram reel DE9TplpvAQg...\n');

  try {
    // Get all posts to check for the specific reel
    const posts = await supabaseManager.getAllPosts();
    
    console.log(`📊 Total posts in database: ${posts.length}`);
    
    if (posts.length === 0) {
      console.log('❌ No posts found in database');
      return;
    }

    // Look for the specific reel DE9TplpvAQg
    const targetShortCode = 'DE9TplpvAQg';
    const targetPost = posts.find(post => 
      post.short_code === targetShortCode || 
      post.input_url?.includes(targetShortCode) ||
      post.post_url?.includes(targetShortCode)
    );

    console.log('\n📋 All posts in database:');
    posts.forEach((post, index) => {
      const date = new Date(post.scraped_at).toLocaleString();
      console.log(`   ${index + 1}. ${post.short_code || 'No short code'} - @${post.owner_username} (${date})`);
      console.log(`      📱 Input URL: ${post.input_url || 'N/A'}`);
      console.log(`      🔗 Post URL: ${post.post_url || 'N/A'}`);
      console.log(`      💖 ${post.likes_count || 0} likes | 💬 ${post.comments_count || 0} comments | 👀 ${post.video_view_count || 0} views`);
      console.log('');
    });

    if (targetPost) {
      console.log('🎉 FOUND THE TARGET REEL!');
      console.log(`✅ Reel ${targetShortCode} was successfully scraped`);
      console.log(`👤 Creator: @${targetPost.owner_username}`);
      console.log(`📅 Scraped at: ${new Date(targetPost.scraped_at).toLocaleString()}`);
      console.log(`💖 Likes: ${targetPost.likes_count || 0}`);
      console.log(`💬 Comments: ${targetPost.comments_count || 0}`);
      console.log(`👀 Views: ${targetPost.video_view_count || 0}`);
      console.log(`📊 Engagement Rate: ${targetPost.engagement_rate || 0}%`);
      console.log(`🎯 Performance Score: ${targetPost.performance_score || 0}/100`);
    } else {
      console.log('❌ TARGET REEL NOT FOUND');
      console.log(`❌ Reel ${targetShortCode} was NOT scraped yet`);
      console.log('');
      console.log('💡 To scrape this reel, run:');
      console.log('   curl "http://localhost:3000/api/scrape?url=https://www.instagram.com/reel/DE9TplpvAQg/"');
    }

    // Check recent scrape sessions
    console.log('\n🕒 Recent scrape sessions:');
    const sessions = await supabaseManager.getAllScrapeSessions();
    sessions.slice(0, 5).forEach((session, index) => {
      const date = new Date(session.created_at).toLocaleString();
      console.log(`   ${index + 1}. ${session.session_name || 'Unnamed'} - ${session.status} (${date})`);
      console.log(`      📊 Posts: ${session.total_posts || 0} | URLs: ${session.input_urls?.length || 0}`);
      if (session.input_urls && session.input_urls.length > 0) {
        session.input_urls.forEach(url => {
          const hasTarget = url.includes(targetShortCode);
          console.log(`      🔗 ${url} ${hasTarget ? '← TARGET REEL!' : ''}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking posts:', error.message);
  }
}

checkSpecificPost(); 
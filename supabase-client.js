require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseManager {
  constructor() {
    this.supabase = supabase;
    // Default user ID for operations (in production, this would come from auth)
    this.defaultUserId = '00000000-0000-0000-0000-000000000001';
  }

  // ===== SCRAPE SESSIONS =====
  
  async createScrapeSession(sessionData) {
    const { data, error } = await this.supabase
      .from('scrape_sessions')
      .insert({
        user_id: this.defaultUserId,
        session_name: sessionData.sessionName,
        input_urls: sessionData.inputUrls,
        status: 'running',
        total_posts: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateScrapeSession(sessionId, updates) {
    const { data, error } = await this.supabase
      .from('scrape_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async completeScrapeSession(sessionId, totalPosts) {
    return this.updateScrapeSession(sessionId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_posts: totalPosts
    });
  }

  async failScrapeSession(sessionId, errorMessage) {
    return this.updateScrapeSession(sessionId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage
    });
  }

  async getScrapeSession(sessionId) {
    const { data, error } = await this.supabase
      .from('scrape_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  }

  async getAllScrapeSessions() {
    const { data, error } = await this.supabase
      .from('scrape_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async deleteScrapeSession(sessionId) {
    const { error } = await this.supabase
      .from('scrape_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  }

  // ===== INSTAGRAM POSTS =====

  async saveInstagramPosts(posts, sessionId) {
    const postsToInsert = posts.map(post => ({
      session_id: sessionId,
      user_id: this.defaultUserId,
      
      // Basic Post Information
      input_url: post.inputUrl,
      post_id: post.id,
      post_type: post.type,
      short_code: post.shortCode,
      post_url: post.url,
      alt_text: post.alt,
      
      // Owner/Creator Information
      owner_username: post.ownerUsername,
      owner_full_name: post.ownerFullName,
      owner_id: post.ownerId,
      owner_followers_count: post.ownerFollowersCount || 0,
      owner_following_count: post.ownerFollowingCount || 0,
      owner_is_verified: post.ownerIsVerified || false,
      owner_profile_pic_url: post.ownerProfilePicUrl,
      owner_profile_pic_url_hd: post.ownerProfilePicUrlHD,
      owner_biography: post.ownerBiography,
      owner_external_url: post.ownerExternalUrl,
      owner_is_business_account: post.ownerIsBusinessAccount || false,
      owner_posts_count: post.ownerPostsCount || 0,
      owner_account_type: post.ownerAccountType || 1,
      owner_category: post.ownerCategory,
      
      // Content Information
      caption: post.caption,
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
      first_comment: post.firstComment,
      
      // Engagement Metrics
      likes_count: post.likesCount || 0,
      comments_count: post.commentsCount || 0,
      video_view_count: post.videoViewCount || 0,
      video_play_count: post.videoPlayCount || 0,
      is_comments_disabled: post.isCommentsDisabled || false,
      
      // Media Information
      video_url: post.videoUrl,
      display_url: post.displayUrl,
      images: post.images || [],
      video_duration: post.videoDuration,
      dimensions_height: post.dimensionsHeight,
      dimensions_width: post.dimensionsWidth,
      
      // Timing
      post_timestamp: post.timestamp ? new Date(post.timestamp).toISOString() : null,
      
      // Location
      location_name: post.locationName,
      location_id: post.locationId,
      
      // Business/Sponsored
      is_sponsored: post.isSponsored || false,
      product_type: post.productType,
      
      // Music/Audio Information
      music_artist_name: post.musicInfo?.artist_name,
      music_song_name: post.musicInfo?.song_name,
      uses_original_audio: post.musicInfo?.uses_original_audio || false,
      should_mute_audio: post.musicInfo?.should_mute_audio || false,
      should_mute_audio_reason: post.musicInfo?.should_mute_audio_reason,
      audio_id: post.musicInfo?.audio_id
    }));

    const { data, error } = await this.supabase
      .from('instagram_posts')
      .insert(postsToInsert)
      .select();

    if (error) throw error;
    return data;
  }

  async getInstagramPosts(limit = 100, offset = 0) {
    const { data, error } = await this.supabase
      .from('instagram_posts')
      .select('*')
      .order('scraped_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  async getPostsBySession(sessionId) {
    const { data, error } = await this.supabase
      .from('instagram_posts')
      .select('*')
      .eq('session_id', sessionId)
      .order('scraped_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAllPosts() {
    const { data, error } = await this.supabase
      .from('instagram_posts')
      .select('*')
      .order('scraped_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAllPostsWithRelatedData() {
    // Get all posts
    const posts = await this.getAllPosts();
    
    // Get comments and tagged users for all posts
    const postIds = posts.map(p => p.id);
    
    const [comments, taggedUsers] = await Promise.all([
      this.getCommentsByPosts(postIds),
      this.getTaggedUsersByPosts(postIds)
    ]);
    
    // Group comments and tagged users by post_id
    const commentsByPost = {};
    const taggedUsersByPost = {};
    
    comments.forEach(comment => {
      if (!commentsByPost[comment.post_id]) {
        commentsByPost[comment.post_id] = [];
      }
      commentsByPost[comment.post_id].push(comment);
    });
    
    taggedUsers.forEach(user => {
      if (!taggedUsersByPost[user.post_id]) {
        taggedUsersByPost[user.post_id] = [];
      }
      taggedUsersByPost[user.post_id].push(user);
    });
    
    // Attach related data to posts
    return posts.map(post => ({
      ...post,
      comments: commentsByPost[post.id] || [],
      tagged_users: taggedUsersByPost[post.id] || []
    }));
  }

  // ===== COMMENTS =====

  async saveComments(comments, postId) {
    const commentsToInsert = comments.map(comment => ({
      post_id: postId,
      comment_id: comment.id,
      username: comment.ownerUsername,
      text: comment.text,
      likes_count: comment.likesCount || 0,
      replies_count: comment.repliesCount || 0,
      timestamp: comment.timestamp ? new Date(comment.timestamp).toISOString() : null,
      owner_id: comment.owner?.id,
      owner_is_verified: comment.owner?.is_verified || false,
      owner_profile_pic_url: comment.owner?.profile_pic_url
    }));

    const { data, error } = await this.supabase
      .from('instagram_comments')
      .insert(commentsToInsert)
      .select();

    if (error) throw error;
    return data;
  }

  async getCommentsByPost(postId) {
    const { data, error } = await this.supabase
      .from('instagram_comments')
      .select('*')
      .eq('post_id', postId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getCommentsByPosts(postIds) {
    if (postIds.length === 0) return [];
    
    const { data, error } = await this.supabase
      .from('instagram_comments')
      .select('*')
      .in('post_id', postIds)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  }

  // ===== TAGGED USERS =====

  async saveTaggedUsers(taggedUsers, postId) {
    const usersToInsert = taggedUsers.map(user => ({
      post_id: postId,
      user_id: user.id,
      username: user.username,
      full_name: user.full_name,
      is_verified: user.is_verified || false,
      profile_pic_url: user.profile_pic_url,
      tag_type: 'tagged'
    }));

    const { data, error } = await this.supabase
      .from('tagged_users')
      .insert(usersToInsert)
      .select();

    if (error) throw error;
    return data;
  }

  async saveCoauthors(coauthors, postId) {
    const usersToInsert = coauthors.map(user => ({
      post_id: postId,
      user_id: user.id,
      username: user.username,
      full_name: user.full_name || '',
      is_verified: user.is_verified || false,
      profile_pic_url: user.profile_pic_url,
      tag_type: 'coauthor'
    }));

    const { data, error } = await this.supabase
      .from('tagged_users')
      .insert(usersToInsert)
      .select();

    if (error) throw error;
    return data;
  }

  async getTaggedUsersByPosts(postIds) {
    if (postIds.length === 0) return [];
    
    const { data, error } = await this.supabase
      .from('tagged_users')
      .select('*')
      .in('post_id', postIds);

    if (error) throw error;
    return data;
  }

  // ===== ANALYTICS =====

  async getAnalyticsSummary() {
    const { data, error } = await this.supabase
      .rpc('get_analytics_summary');

    if (error) throw error;
    return data;
  }

  async getCreatorPerformance() {
    const { data, error } = await this.supabase
      .from('instagram_posts')
      .select(`
        owner_username,
        owner_followers_count,
        owner_is_verified,
        owner_is_business_account,
        engagement_rate,
        performance_score,
        likes_count,
        comments_count,
        video_view_count
      `)
      .not('owner_username', 'is', null);

    if (error) throw error;

    // Group by creator
    const creatorMap = {};
    data.forEach(post => {
      const username = post.owner_username;
      if (!creatorMap[username]) {
        creatorMap[username] = {
          username,
          posts: [],
          followers: post.owner_followers_count,
          isVerified: post.owner_is_verified,
          isBusinessAccount: post.owner_is_business_account
        };
      }
      creatorMap[username].posts.push(post);
    });

    // Calculate aggregated metrics
    return Object.values(creatorMap).map(creator => {
      const posts = creator.posts;
      const totalPosts = posts.length;
      const avgEngagement = posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / totalPosts;
      const avgPerformance = posts.reduce((sum, p) => sum + (p.performance_score || 0), 0) / totalPosts;
      const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
      const totalViews = posts.reduce((sum, p) => sum + (p.video_view_count || 0), 0);

      return {
        username: creator.username,
        postCount: totalPosts,
        followers: creator.followers,
        isVerified: creator.isVerified,
        isBusinessAccount: creator.isBusinessAccount,
        avgEngagementRate: parseFloat(avgEngagement.toFixed(2)),
        avgPerformanceScore: parseFloat(avgPerformance.toFixed(2)),
        totalLikes,
        totalComments,
        totalViews
      };
    }).sort((a, b) => b.avgPerformanceScore - a.avgPerformanceScore);
  }

  // ===== UTILITY FUNCTIONS =====

  async deleteAllData() {
    // Delete in order due to foreign key constraints
    await this.supabase.from('instagram_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.supabase.from('tagged_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.supabase.from('instagram_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.supabase.from('scrape_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await this.supabase.from('analytics_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    return true;
  }

  async getStats() {
    const [sessions, posts, comments, taggedUsers] = await Promise.all([
      this.supabase.from('scrape_sessions').select('id', { count: 'exact' }),
      this.supabase.from('instagram_posts').select('id', { count: 'exact' }),
      this.supabase.from('instagram_comments').select('id', { count: 'exact' }),
      this.supabase.from('tagged_users').select('id', { count: 'exact' })
    ]);

    return {
      totalSessions: sessions.count,
      totalPosts: posts.count,
      totalComments: comments.count,
      totalTaggedUsers: taggedUsers.count
    };
  }
}

module.exports = new SupabaseManager(); 
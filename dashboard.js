// Global variables
let performanceChart = null;
let engagementChart = null;
let currentView = 'analytics';

// Get the base URL for API calls
function getBaseUrl() {
  // If we're on localhost, use localhost, otherwise use the current domain
  return window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin;
}

async function loadDashboardData() {
  const container = document.getElementById('resultsGrid');
  container.innerHTML = 'Loading...';

  try {
    const res = await fetch(`${getBaseUrl()}/data.json`);
    const data = await res.json();

    container.innerHTML = ''; // clear loading

    data.forEach(post => {
      const {
        displayUrl,
        videoUrl,
        caption,
        ownerUsername,
        likesCount,
        videoViewCount,
        commentsCount,
        musicInfo,
        timestamp,
        latestComments = [],
        taggedUsers = []
      } = post;

      const timeAgo = new Date(timestamp).toLocaleDateString();
      
      // Determine post type badge
      let badge = '';
      if (post.isSponsored) {
        badge = '<div class="badge">Sponsored</div>';
      } else if (post.productType === 'clips') {
        badge = '<div class="badge">Reel</div>';
      } else if (post.childPosts && post.childPosts.length > 0) {
        badge = '<div class="badge">Carousel</div>';
      }

      const postCard = document.createElement('div');
      postCard.className = 'post-card';

      postCard.innerHTML = `
        ${badge}
        <div class="post-media">
          ${videoUrl
            ? `<video controls class="post-thumbnail"><source src="${videoUrl}" type="video/mp4"></video>`
            : `<img src="${displayUrl}" class="post-thumbnail" alt="Post image"/>`}
        </div>
        <div class="post-meta">
          <h3>@${ownerUsername} ${post.ownerIsVerified ? '✓' : ''}</h3>
          ${post.ownerFollowersCount ? `<p class="followers"><strong>👥 ${post.ownerFollowersCount.toLocaleString()} followers</strong></p>` : ''}
          <p class="caption">${caption || '(No caption)'}</p>
          <ul class="stats">
            <li><strong>Views:</strong> <span>${videoViewCount?.toLocaleString() || 'N/A'}</span></li>
            <li><strong>Plays:</strong> <span>${post.videoPlayCount?.toLocaleString() || 'N/A'}</span></li>
            <li><strong>Likes:</strong> <span>${likesCount?.toLocaleString() || 'N/A'}</span></li>
            <li><strong>Comments:</strong> <span>${commentsCount || 0}</span></li>
            <li><strong>Duration:</strong> <span>${post.videoDuration ? Math.round(post.videoDuration) + 's' : 'N/A'}</span></li>
            <li><strong>Audio:</strong> <span>${musicInfo?.song_name || 'Unknown'} – ${musicInfo?.artist_name || ''}</span></li>
            <li><strong>Location:</strong> <span>${post.locationName || 'Not specified'}</span></li>
            <li><strong>Date:</strong> <span>${timeAgo}</span></li>
          </ul>

          <details>
            <summary><strong>💬 View Comments (${latestComments.length} of ${commentsCount} total)</strong></summary>
            ${latestComments.length < commentsCount ? 
              `<div class="comment-notice">
                <small>⚠️ Showing latest ${latestComments.length} comments. To get all ${commentsCount} comments, use resultsType: "comments" in the scraper configuration.</small>
              </div>` : ''}
            <ul class="comments">
              ${latestComments
                .map(c => {
                  const commentDate = new Date(c.timestamp).toLocaleDateString();
                  const repliesText = c.repliesCount > 0 ? ` (${c.repliesCount} replies)` : '';
                  const likesText = c.likesCount > 0 ? ` • ${c.likesCount} likes` : '';
                  
                  return `<li>
                    <img src="${c.ownerProfilePicUrl}" alt="${c.ownerUsername}" class="avatar">
                    <div class="comment-content">
                      <div class="comment-header">
                        <strong>${c.ownerUsername}</strong>
                        <span class="comment-meta">${commentDate}${likesText}${repliesText}</span>
                      </div>
                      <div class="comment-text">${c.text}</div>
                      ${c.replies && c.replies.length > 0 ? 
                        `<div class="replies">
                          ${c.replies.map(reply => 
                            `<div class="reply">
                              <img src="${reply.ownerProfilePicUrl}" alt="${reply.ownerUsername}" class="avatar-small">
                              <div class="reply-content">
                                <strong>${reply.ownerUsername}</strong>: ${reply.text}
                                <span class="reply-date">${new Date(reply.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>`
                          ).join('')}
                        </div>` : ''}
                    </div>
                  </li>`;
                })
                .join('')}
            </ul>
          </details>

          ${taggedUsers.length > 0
            ? `<details>
                <summary><strong>🏷️ Tagged Users (${taggedUsers.length})</strong></summary>
                <ul class="tagged">
                  ${taggedUsers
                    .map(t => `<li><img src="${t.profile_pic_url}" class="avatar"> @${t.username}</li>`)
                    .join('')}
                </ul>
              </details>`
            : ''}
        </div>
      `;

      container.appendChild(postCard);
    });
  } catch (err) {
    console.error('❌ Failed to load dashboard data:', err);
    container.innerHTML = '<p style="color: red;">Failed to load data.</p>';
  }
}

// Dashboard management functions
function refreshDashboard() {
  loadDashboardData();
  if (document.getElementById('scrapeManager').style.display !== 'none') {
    loadScrapesList();
  }
}

function toggleScrapeManager() {
  const manager = document.getElementById('scrapeManager');
  if (manager.style.display === 'none') {
    manager.style.display = 'block';
    loadScrapesList();
  } else {
    manager.style.display = 'none';
  }
}

async function loadScrapesList() {
  const container = document.getElementById('scrapesList');
  container.innerHTML = 'Loading scrapes...';

  try {
    const res = await fetch(`${getBaseUrl()}/api/scrapes`);
    const scrapes = await res.json();

    if (scrapes.length === 0) {
      container.innerHTML = '<p>No scrapes found.</p>';
      return;
    }

    container.innerHTML = scrapes.map(scrape => `
      <div class="scrape-item">
        <div class="scrape-info">
          <h4>${scrape.itemCount} posts scraped</h4>
          <div class="scrape-meta">
            <strong>Date:</strong> ${new Date(scrape.timestamp).toLocaleString()}<br>
            <strong>First URL:</strong> ${scrape.firstUrl}
          </div>
        </div>
        <div class="scrape-actions">
          <button class="btn btn-outline btn-small" onclick="downloadScrapeCSV('${scrape.filename}')">Download CSV</button>
          <button class="btn-danger" onclick="deleteScrape('${scrape.filename}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load scrapes:', err);
    container.innerHTML = '<p style="color: red;">Failed to load scrapes.</p>';
  }
}

async function deleteScrape(filename) {
  if (!confirm('Are you sure you want to delete this scrape? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`${getBaseUrl()}/api/scrapes/${filename}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      loadScrapesList();
      loadDashboardData(); // Refresh main dashboard
    } else {
      const error = await res.json();
      alert('Failed to delete scrape: ' + error.error);
    }
  } catch (err) {
    console.error('Error deleting scrape:', err);
    alert('Failed to delete scrape.');
  }
}

function downloadCSV() {
  // Download combined CSV from all scrapes
  fetch(`${getBaseUrl()}/data.json`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert('No data to download.');
        return;
      }

      downloadDataAsCSV(data, `instagram-all-scrapes-${new Date().toISOString().split('T')[0]}.csv`);
    })
    .catch(err => {
      console.error('Error downloading CSV:', err);
      alert('Failed to download CSV.');
    });
}

function downloadScrapeCSV(filename) {
  // Download CSV for individual scrape
  fetch(`${getBaseUrl()}/api/scrapes/${filename}`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert('No data to download.');
        return;
      }

      const scrapeName = filename.replace('.json', '');
      downloadDataAsCSV(data, `${scrapeName}.csv`);
    })
    .catch(err => {
      console.error('Error downloading scrape CSV:', err);
      alert('Failed to download scrape CSV.');
    });
}

function downloadDataAsCSV(data, filename) {
  // Create comprehensive CSV content with all available fields
  const headers = [
    'Post ID', 'Short Code', 'Type', 'Username', 'Owner Full Name', 'Owner ID', 'Is Verified',
    'Followers Count', 'Following Count', 'Posts Count', 'Biography', 'External URL', 'Is Business Account', 'Account Category',
    'Caption', 'Hashtags', 'Mentions', 'Likes', 'Comments Count', 'Video Views', 'Video Plays',
    'Date Posted', 'Input URL', 'Post URL', 'Video URL', 'Display Image URL', 'Profile Pic HD',
    'Video Duration', 'Dimensions (W x H)', 'Location Name', 'Location ID',
    'Is Sponsored', 'Product Type', 'Comments Disabled', 'First Comment',
    'Music Artist', 'Song Name', 'Uses Original Audio', 'Audio ID',
    'Tagged Users', 'Co-author Producers', 'All Comments', 'Top Comment Likes'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(post => {
      // Process hashtags
      const hashtags = (post.hashtags || []).join('; ');
      
      // Process mentions
      const mentions = (post.mentions || []).join('; ');
      
      // Process tagged users
      const taggedUsers = (post.taggedUsers || []).map(user => 
        `${user.username} (${user.full_name})`
      ).join('; ');
      
      // Process co-authors
      const coAuthors = (post.coauthorProducers || []).map(user => 
        user.username
      ).join('; ');
      
      // Process all comments (limit to prevent CSV bloat)
      const allComments = (post.latestComments || []).slice(0, 10).map(comment => 
        `${comment.ownerUsername || 'Unknown'}: ${(comment.text || '').replace(/"/g, '""').replace(/\n/g, ' ')}`
      ).join(' | ');
      
      // Get top comment likes
      const commentLikes = (post.latestComments || []).map(c => c.likesCount || 0);
      const topCommentLikes = commentLikes.length > 0 ? Math.max(...commentLikes) : 0;
      
      // Music info
      const musicArtist = post.musicInfo?.artist_name || '';
      const songName = post.musicInfo?.song_name || '';
      const usesOriginalAudio = post.musicInfo?.uses_original_audio || false;
      const audioId = post.musicInfo?.audio_id || '';
      
      return [
        `"${post.id || ''}"`,
        `"${post.shortCode || ''}"`,
        `"${post.type || ''}"`,
        `"${post.ownerUsername || ''}"`,
        `"${post.ownerFullName || ''}"`,
        `"${post.ownerId || ''}"`,
        `"${post.ownerIsVerified || false}"`,
        post.ownerFollowersCount || 0,
        post.ownerFollowingCount || 0,
        post.ownerPostsCount || 0,
        `"${(post.ownerBiography || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${post.ownerExternalUrl || ''}"`,
        `"${post.ownerIsBusinessAccount || false}"`,
        `"${post.ownerCategory || ''}"`,
        `"${(post.caption || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${hashtags}"`,
        `"${mentions}"`,
        post.likesCount || 0,
        post.commentsCount || 0,
        post.videoViewCount || 0,
        post.videoPlayCount || 0,
        `"${post.timestamp ? new Date(post.timestamp).toLocaleString() : ''}"`,
        `"${post.inputUrl || ''}"`,
        `"${post.url || ''}"`,
        `"${post.videoUrl || ''}"`,
        `"${post.displayUrl || ''}"`,
        `"${post.ownerProfilePicUrlHD || post.ownerProfilePicUrl || ''}"`,
        post.videoDuration || 0,
        `"${post.dimensionsWidth || 0} x ${post.dimensionsHeight || 0}"`,
        `"${post.locationName || ''}"`,
        `"${post.locationId || ''}"`,
        `"${post.isSponsored || false}"`,
        `"${post.productType || ''}"`,
        `"${post.isCommentsDisabled || false}"`,
        `"${(post.firstComment || '').replace(/"/g, '""')}"`,
        `"${musicArtist}"`,
        `"${songName}"`,
        `"${usesOriginalAudio}"`,
        `"${audioId}"`,
        `"${taggedUsers}"`,
        `"${coAuthors}"`,
        `"${allComments}"`,
        topCommentLikes
      ].join(',');
    })
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function purgeAllScrapes() {
  if (!confirm('⚠️ Are you sure you want to delete ALL scrapes? This action cannot be undone!')) {
    return;
  }

  fetch(`${getBaseUrl()}/api/scrapes`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(result => {
      alert(result.message);
      loadScrapesList();
      loadDashboardData(); // Refresh main dashboard
    })
    .catch(err => {
      console.error('Error purging scrapes:', err);
      alert('Failed to purge scrapes.');
    });
}

// Navigation function with purge warning
async function navigateToNewScrape() {
  try {
    // Check if there's existing data
    const res = await fetch(`${getBaseUrl()}/api/scrapes`);
    const scrapes = await res.json();
    
    if (scrapes.length === 0) {
      // No existing data, navigate directly
      window.location.href = 'scrape.html';
      return;
    }

    // Show purge warning with download option
    const proceed = confirm(
      '⚠️ IMPORTANT: Starting a new scrape will PURGE all existing data!\n\n' +
      '📥 Please download your current CSV data before proceeding.\n\n' +
      '🗑️ All previous scrapes will be permanently deleted.\n\n' +
      'Click OK to download CSV and continue to new scrape.\n' +
      'Click Cancel to stay on dashboard and download manually.'
    );
    
    if (proceed) {
      // Download CSV first, then purge and navigate
      await downloadCSVAndPurge();
    }
    // If cancelled, stay on dashboard (no action needed)
    
  } catch (err) {
    console.error('Error checking existing data:', err);
    // If there's an error, just navigate (fail gracefully)
    window.location.href = 'scrape.html';
  }
}

async function downloadCSVAndPurge() {
  try {
    // First download the CSV
    const res = await fetch(`${getBaseUrl()}/data.json`);
    const data = await res.json();
    
    if (data.length > 0) {
      // Download CSV with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      downloadDataAsCSV(data, `instagram-backup-${timestamp}.csv`);
      
      // Wait a moment for download to start
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Then purge all scrapes
    const purgeRes = await fetch(`${getBaseUrl()}/api/scrapes`, {
      method: 'DELETE'
    });
    
    if (purgeRes.ok) {
      // Navigate to scrape page after successful purge
      window.location.href = 'scrape.html';
    } else {
      const error = await purgeRes.json();
      alert('Failed to purge data: ' + error.error + '\nPlease try again or purge manually.');
    }
    
  } catch (err) {
    console.error('Error during download and purge:', err);
    alert('Error occurred during backup and purge. Please download CSV manually and try again.');
  }
}

// ===== ANALYTICS FUNCTIONALITY =====

// View toggle functionality
function toggleView(view) {
  const analyticsView = document.getElementById('analyticsOverview');
  const dataView = document.getElementById('dataView');
  const analyticsBtn = document.querySelector('[onclick="toggleView(\'analytics\')"]');
  const dataBtn = document.querySelector('[onclick="toggleView(\'data\')"]');

  if (view === 'analytics') {
    analyticsView.style.display = 'block';
    dataView.style.display = 'none';
    analyticsBtn?.classList.add('active');
    dataBtn?.classList.remove('active');
    currentView = 'analytics';
    loadAnalytics();
  } else {
    analyticsView.style.display = 'none';
    dataView.style.display = 'block';
    analyticsBtn?.classList.remove('active');
    dataBtn?.classList.add('active');
    currentView = 'data';
    loadDashboardData();
  }
}

// Load analytics data and render dashboard
async function loadAnalytics() {
  try {
    // Show loading state
    updateKPIs({ loading: true });
    updateCreatorsList([]);
    updateInsights([]);

    // Fetch analytics data
    const res = await fetch(`${getBaseUrl()}/api/analytics`);
    const analytics = await res.json();

    if (analytics.error) {
      showAnalyticsError(analytics.message || analytics.error);
      return;
    }

    // Update KPIs
    updateKPIs(analytics.summary);

    // Update charts
    updatePerformanceChart(analytics.performanceDistribution);
    updateEngagementChart(analytics.creatorStats);

    // Update creator performance matrix
    updateCreatorsList(analytics.creatorStats);

    // Update insights
    updateInsights(analytics.insights || []);

    console.log('📊 Analytics dashboard loaded successfully');
  } catch (err) {
    console.error('❌ Failed to load analytics:', err);
    showAnalyticsError('Failed to load analytics data. Please try again.');
  }
}

// Update KPI cards
function updateKPIs(summary) {
  if (summary.loading) {
    document.getElementById('totalPosts').textContent = '⏳';
    document.getElementById('totalCreators').textContent = '⏳';
    document.getElementById('avgEngagement').textContent = '⏳';
    document.getElementById('avgPerformance').textContent = '⏳';
    return;
  }

  document.getElementById('totalPosts').textContent = summary.totalPosts?.toLocaleString() || '0';
  document.getElementById('totalCreators').textContent = summary.totalCreators?.toLocaleString() || '0';
  document.getElementById('avgEngagement').textContent = summary.avgEngagementRate ? `${summary.avgEngagementRate}%` : '0%';
  document.getElementById('avgPerformance').textContent = summary.avgPerformanceScore || '0';
}

// Update performance distribution chart
function updatePerformanceChart(distribution) {
  const ctx = document.getElementById('performanceChart').getContext('2d');
  
  if (performanceChart) {
    performanceChart.destroy();
  }

  const data = {
    labels: ['Excellent (>6%)', 'Good (3-6%)', 'Average (1-3%)', 'Poor (<1%)'],
    datasets: [{
      data: [
        distribution.excellent || 0,
        distribution.good || 0,
        distribution.average || 0,
        distribution.poor || 0
      ],
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  performanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        }
      }
    }
  });
}

// Update engagement rate chart
function updateEngagementChart(creatorStats) {
  const ctx = document.getElementById('engagementChart').getContext('2d');
  
  if (engagementChart) {
    engagementChart.destroy();
  }

  // Take top 10 creators for chart
  const topCreators = creatorStats.slice(0, 10);
  
  const data = {
    labels: topCreators.map(creator => `@${creator.username}`),
    datasets: [{
      label: 'Engagement Rate (%)',
      data: topCreators.map(creator => creator.avgEngagementRate),
      backgroundColor: 'rgba(45, 225, 194, 0.2)',
      borderColor: '#2DE1C2',
      borderWidth: 2,
      fill: true
    }]
  };

  engagementChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Engagement Rate (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Creators'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// Update creators performance list
function updateCreatorsList(creatorStats) {
  const container = document.getElementById('creatorsList');
  
  if (creatorStats.length === 0) {
    container.innerHTML = '<p class="loading">No creator data available</p>';
    return;
  }

  // Take top 10 creators
  const topCreators = creatorStats.slice(0, 10);
  
  container.innerHTML = topCreators.map(creator => {
    const tierBadge = getTierBadge(creator.tier);
    const performanceBadge = getPerformanceBadge(creator.avgEngagementRate);
    const avatar = creator.username.charAt(0).toUpperCase();
    
    return `
      <div class="creator-item">
        <div class="creator-info">
          <div class="creator-avatar">${avatar}</div>
          <div class="creator-details">
            <h4>@${creator.username} ${creator.isVerified ? '✓' : ''}</h4>
            <p>${creator.followers?.toLocaleString() || '0'} followers • ${creator.postCount} posts</p>
          </div>
        </div>
        <div class="creator-metrics">
          <div class="metric-badge ${performanceBadge.class}">${performanceBadge.label}</div>
          <div class="metric-badge">${creator.avgEngagementRate}%</div>
          <div class="performance-score">${creator.avgPerformanceScore}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Update insights section
function updateInsights(insights) {
  const container = document.getElementById('insightsList');
  
  if (insights.length === 0) {
    container.innerHTML = '<p class="loading">Generating insights...</p>';
    return;
  }

  container.innerHTML = insights.map(insight => `
    <div class="insight-item ${insight.type}">
      <div class="insight-title">${insight.title}</div>
      <div class="insight-message">${insight.message}</div>
      <div class="insight-recommendation"><strong>Recommendation:</strong> ${insight.recommendation}</div>
    </div>
  `).join('');
}

// Helper functions
function getTierBadge(tier) {
  const tiers = {
    nano: { label: 'Nano', class: 'excellent' },
    micro: { label: 'Micro', class: 'good' },
    macro: { label: 'Macro', class: 'average' },
    mega: { label: 'Mega', class: 'poor' }
  };
  return tiers[tier] || { label: 'Unknown', class: 'average' };
}

function getPerformanceBadge(engagementRate) {
  if (engagementRate >= 6) return { label: 'Excellent', class: 'excellent' };
  if (engagementRate >= 3) return { label: 'Good', class: 'good' };
  if (engagementRate >= 1) return { label: 'Average', class: 'average' };
  return { label: 'Poor', class: 'poor' };
}

function showAnalyticsError(message) {
  const container = document.getElementById('analyticsOverview');
  container.innerHTML = `
    <div class="container">
      <div class="analytics-error" style="text-align: center; padding: 3rem; color: var(--color-text-muted);">
        <h2>📊 No Analytics Data Available</h2>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="window.location.href='scrape.html'">Start Scraping</button>
      </div>
    </div>
  `;
}

// Enhanced refresh function
function refreshDashboard() {
  if (currentView === 'analytics') {
    loadAnalytics();
  } else {
    loadDashboardData();
  }
  
  if (document.getElementById('scrapeManager').style.display !== 'none') {
    loadScrapesList();
  }
}

// Initialize dashboard
window.addEventListener('DOMContentLoaded', () => {
  // Set initial view buttons
  const analyticsBtn = document.querySelector('[onclick="toggleView(\'analytics\')"]');
  const dataBtn = document.querySelector('[onclick="toggleView(\'data\')"]');
  
  if (analyticsBtn) analyticsBtn.classList.add('active');
  if (dataBtn) dataBtn.classList.remove('active');
  
  // Load analytics by default
  loadAnalytics();
});

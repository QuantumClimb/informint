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
          <h3>@${ownerUsername}</h3>
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
    'Caption', 'Hashtags', 'Mentions', 'Likes', 'Comments Count', 'Video Views', 'Video Plays',
    'Date Posted', 'Input URL', 'Post URL', 'Video URL', 'Display Image URL',
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
        `${comment.ownerUsername}: ${comment.text.replace(/"/g, '""').replace(/\n/g, ' ')}`
      ).join(' | ');
      
      // Get top comment likes
      const topCommentLikes = Math.max(...(post.latestComments || []).map(c => c.likesCount || 0), 0);
      
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
        `"${post.owner?.is_verified || false}"`,
        `"${(post.caption || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${hashtags}"`,
        `"${mentions}"`,
        post.likesCount || 0,
        post.commentsCount || 0,
        post.videoViewCount || 0,
        post.videoPlayCount || 0,
        `"${new Date(post.timestamp).toLocaleString()}"`,
        `"${post.inputUrl || ''}"`,
        `"${post.url || ''}"`,
        `"${post.videoUrl || ''}"`,
        `"${post.displayUrl || ''}"`,
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

window.addEventListener('DOMContentLoaded', loadDashboardData);

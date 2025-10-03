import { ApifyClient } from 'apify-client';

// Initialize the Apify client
const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { urls, userId } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'URLs array is required' });
        }

        if (urls.length > 3) {
            return res.status(400).json({ error: 'Maximum 3 URLs allowed per request' });
        }

        // Prepare input for Apify actor
        const input = {
            urls: urls,
            resultsType: 'posts',
            resultsLimit: 50,
            searchType: 'hashtag',
            searchLimit: 1
        };

        console.log('Starting Apify actor with input:', input);

        // Start the actor
        const run = await client.actor(process.env.APIFY_ACTOR_ID).call(input);

        console.log('Actor run completed:', run.id);

        // Get the results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        console.log(`Retrieved ${items.length} items from scrape`);

        // Process and format the results
        const processedResults = items.map(item => ({
            id: item.id,
            shortCode: item.shortCode,
            url: item.url,
            displayUrl: item.displayUrl,
            caption: item.caption,
            hashtags: item.hashtags,
            mentions: item.mentions,
            likesCount: item.likesCount,
            commentsCount: item.commentsCount,
            timestamp: item.timestamp,
            ownerUsername: item.ownerUsername,
            ownerFullName: item.ownerFullName,
            isVerified: item.isVerified,
            followersCount: item.followersCount,
            followingCount: item.followingCount,
            postsCount: item.postsCount,
            type: item.type,
            videoViewCount: item.videoViewCount,
            videoDuration: item.videoDuration
        }));

        // Calculate analytics metrics
        const analytics = calculateAnalytics(processedResults);

        return res.status(200).json({
            success: true,
            data: processedResults,
            analytics: analytics,
            runId: run.id,
            scrapedAt: new Date().toISOString(),
            count: processedResults.length
        });

    } catch (error) {
        console.error('Scraping error:', error);
        return res.status(500).json({
            error: 'Failed to scrape Instagram data',
            message: error.message
        });
    }
}

function calculateAnalytics(data) {
    if (!data || data.length === 0) {
        return null;
    }

    const totalLikes = data.reduce((sum, item) => sum + (item.likesCount || 0), 0);
    const totalComments = data.reduce((sum, item) => sum + (item.commentsCount || 0), 0);
    const totalFollowers = data.reduce((sum, item) => sum + (item.followersCount || 0), 0);
    const totalViews = data.reduce((sum, item) => sum + (item.videoViewCount || 0), 0);

    const avgLikes = totalLikes / data.length;
    const avgComments = totalComments / data.length;
    const avgFollowers = totalFollowers / data.length;
    const avgEngagementRate = avgFollowers > 0 ? ((avgLikes + avgComments) / avgFollowers) * 100 : 0;

    const creators = [...new Set(data.map(item => item.ownerUsername))];
    const verifiedCreators = data.filter(item => item.isVerified).length;

    return {
        summary: {
            totalPosts: data.length,
            totalLikes,
            totalComments,
            totalViews,
            avgLikes: Math.round(avgLikes),
            avgComments: Math.round(avgComments),
            avgFollowers: Math.round(avgFollowers),
            avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2))
        },
        creators: {
            total: creators.length,
            verified: verifiedCreators,
            verificationRate: parseFloat(((verifiedCreators / creators.length) * 100).toFixed(2))
        },
        performance: {
            topPost: data.reduce((max, item) => 
                (item.likesCount || 0) > (max.likesCount || 0) ? item : max, data[0]),
            engagementTier: getEngagementTier(avgEngagementRate)
        }
    };
}

function getEngagementTier(rate) {
    if (rate > 6) return 'Excellent';
    if (rate > 3) return 'Good';
    if (rate > 1) return 'Average';
    return 'Poor';
}
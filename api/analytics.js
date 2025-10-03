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

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get analytics data from request body or query params
        let data = [];
        
        if (req.method === 'POST' && req.body.data) {
            data = req.body.data;
        } else if (req.query.sampleData === 'true') {
            // Return sample analytics for demo purposes
            data = getSampleData();
        }

        if (!data || data.length === 0) {
            return res.status(400).json({ 
                error: 'No data provided for analytics calculation',
                message: 'Send POST request with data array or use ?sampleData=true for demo'
            });
        }

        // Calculate comprehensive analytics
        const analytics = calculateComprehensiveAnalytics(data);

        return res.status(200).json({
            success: true,
            analytics: analytics,
            dataPoints: data.length,
            calculatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Analytics calculation error:', error);
        return res.status(500).json({
            error: 'Failed to calculate analytics',
            message: error.message
        });
    }
}

function calculateComprehensiveAnalytics(data) {
    // Basic metrics
    const totalPosts = data.length;
    const totalLikes = data.reduce((sum, item) => sum + (item.likesCount || 0), 0);
    const totalComments = data.reduce((sum, item) => sum + (item.commentsCount || 0), 0);
    const totalViews = data.reduce((sum, item) => sum + (item.videoViewCount || 0), 0);
    const totalFollowers = data.reduce((sum, item) => sum + (item.followersCount || 0), 0);

    // Average metrics
    const avgLikes = totalLikes / totalPosts;
    const avgComments = totalComments / totalPosts;
    const avgFollowers = totalFollowers / totalPosts;
    const avgViews = totalViews / totalPosts;

    // Engagement calculations
    const engagementRates = data.map(item => {
        const followers = item.followersCount || 1;
        const engagement = (item.likesCount || 0) + (item.commentsCount || 0);
        return (engagement / followers) * 100;
    });
    
    const avgEngagementRate = engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length;

    // Reach multipliers (for video content)
    const reachMultipliers = data.filter(item => item.videoViewCount).map(item => {
        return (item.videoViewCount || 0) / (item.followersCount || 1);
    });
    
    const avgReachMultiplier = reachMultipliers.length > 0 
        ? reachMultipliers.reduce((sum, mult) => sum + mult, 0) / reachMultipliers.length 
        : 0;

    // Creator analysis
    const creators = [...new Set(data.map(item => item.ownerUsername))];
    const verifiedCreators = data.filter(item => item.isVerified);
    const verificationRate = (verifiedCreators.length / creators.length) * 100;

    // Performance scoring
    const performanceScores = data.map(item => calculatePerformanceScore(item));
    const avgPerformanceScore = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;

    // Content type analysis
    const contentTypes = {
        images: data.filter(item => item.type === 'GraphImage').length,
        videos: data.filter(item => item.type === 'GraphVideo').length,
        carousels: data.filter(item => item.type === 'GraphSidecar').length
    };

    // Benchmarking
    const benchmarks = getBenchmarks(avgFollowers);
    const performanceTier = getPerformanceTier(avgEngagementRate);

    return {
        overview: {
            totalPosts,
            totalLikes,
            totalComments,
            totalViews,
            avgLikes: Math.round(avgLikes),
            avgComments: Math.round(avgComments),
            avgFollowers: Math.round(avgFollowers),
            avgViews: Math.round(avgViews)
        },
        engagement: {
            avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
            engagementDistribution: getEngagementDistribution(engagementRates),
            performanceTier,
            benchmarkComparison: {
                industry: benchmarks.industry,
                category: benchmarks.category,
                performance: avgEngagementRate >= benchmarks.industry ? 'Above Average' : 'Below Average'
            }
        },
        reach: {
            avgReachMultiplier: parseFloat(avgReachMultiplier.toFixed(2)),
            totalReach: totalViews,
            reachEfficiency: totalViews > 0 ? parseFloat((totalViews / totalFollowers).toFixed(2)) : 0
        },
        creators: {
            total: creators.length,
            verified: verifiedCreators.length,
            verificationRate: parseFloat(verificationRate.toFixed(2)),
            topPerformers: getTopPerformers(data)
        },
        performance: {
            avgScore: parseFloat(avgPerformanceScore.toFixed(1)),
            distribution: getPerformanceDistribution(performanceScores),
            topPost: getTopPost(data),
            insights: generateInsights(data)
        },
        content: {
            types: contentTypes,
            typeDistribution: {
                images: parseFloat(((contentTypes.images / totalPosts) * 100).toFixed(1)),
                videos: parseFloat(((contentTypes.videos / totalPosts) * 100).toFixed(1)),
                carousels: parseFloat(((contentTypes.carousels / totalPosts) * 100).toFixed(1))
            }
        }
    };
}

function calculatePerformanceScore(item) {
    const followers = item.followersCount || 1;
    const engagement = (item.likesCount || 0) + (item.commentsCount || 0);
    const engagementRate = (engagement / followers) * 100;
    
    const reachMultiplier = item.videoViewCount ? (item.videoViewCount / followers) : 1;
    const verificationBonus = item.isVerified ? 5 : 0;
    
    // Weighted score calculation
    const score = (
        engagementRate * 0.4 +
        Math.min(reachMultiplier * 20, 40) * 0.3 +
        Math.min((followers / 1000), 20) * 0.2 +
        verificationBonus * 0.1
    );
    
    return Math.min(Math.max(score, 0), 100);
}

function getEngagementDistribution(rates) {
    const excellent = rates.filter(rate => rate > 6).length;
    const good = rates.filter(rate => rate > 3 && rate <= 6).length;
    const average = rates.filter(rate => rate > 1 && rate <= 3).length;
    const poor = rates.filter(rate => rate <= 1).length;
    
    const total = rates.length;
    
    return {
        excellent: { count: excellent, percentage: parseFloat(((excellent / total) * 100).toFixed(1)) },
        good: { count: good, percentage: parseFloat(((good / total) * 100).toFixed(1)) },
        average: { count: average, percentage: parseFloat(((average / total) * 100).toFixed(1)) },
        poor: { count: poor, percentage: parseFloat(((poor / total) * 100).toFixed(1)) }
    };
}

function getPerformanceDistribution(scores) {
    const high = scores.filter(score => score >= 70).length;
    const medium = scores.filter(score => score >= 40 && score < 70).length;
    const low = scores.filter(score => score < 40).length;
    
    const total = scores.length;
    
    return {
        high: { count: high, percentage: parseFloat(((high / total) * 100).toFixed(1)) },
        medium: { count: medium, percentage: parseFloat(((medium / total) * 100).toFixed(1)) },
        low: { count: low, percentage: parseFloat(((low / total) * 100).toFixed(1)) }
    };
}

function getBenchmarks(avgFollowers) {
    if (avgFollowers >= 1000000) {
        return { industry: 1.5, category: 'Mega Influencer' };
    } else if (avgFollowers >= 100000) {
        return { industry: 2.0, category: 'Macro Influencer' };
    } else if (avgFollowers >= 10000) {
        return { industry: 4.0, category: 'Micro Influencer' };
    } else {
        return { industry: 8.0, category: 'Nano Influencer' };
    }
}

function getPerformanceTier(rate) {
    if (rate > 6) return 'Excellent';
    if (rate > 3) return 'Good';
    if (rate > 1) return 'Average';
    return 'Poor';
}

function getTopPerformers(data) {
    return data
        .sort((a, b) => {
            const aEngagement = ((a.likesCount || 0) + (a.commentsCount || 0)) / (a.followersCount || 1);
            const bEngagement = ((b.likesCount || 0) + (b.commentsCount || 0)) / (b.followersCount || 1);
            return bEngagement - aEngagement;
        })
        .slice(0, 3)
        .map(item => ({
            username: item.ownerUsername,
            fullName: item.ownerFullName,
            followers: item.followersCount,
            engagement: parseFloat((((item.likesCount || 0) + (item.commentsCount || 0)) / (item.followersCount || 1) * 100).toFixed(2)),
            verified: item.isVerified
        }));
}

function getTopPost(data) {
    return data.reduce((max, item) => {
        const maxEngagement = (max.likesCount || 0) + (max.commentsCount || 0);
        const itemEngagement = (item.likesCount || 0) + (item.commentsCount || 0);
        return itemEngagement > maxEngagement ? item : max;
    }, data[0]);
}

function generateInsights(data) {
    const insights = [];
    
    const avgEngagement = data.reduce((sum, item) => {
        const followers = item.followersCount || 1;
        const engagement = (item.likesCount || 0) + (item.commentsCount || 0);
        return sum + (engagement / followers) * 100;
    }, 0) / data.length;
    
    if (avgEngagement > 6) {
        insights.push("Excellent engagement performance - well above industry standards");
    } else if (avgEngagement > 3) {
        insights.push("Good engagement levels with room for improvement");
    } else {
        insights.push("Engagement below average - consider content strategy optimization");
    }
    
    const verifiedCount = data.filter(item => item.isVerified).length;
    const verificationRate = (verifiedCount / data.length) * 100;
    
    if (verificationRate > 50) {
        insights.push("High verification rate indicates established creator partnerships");
    }
    
    const videoContent = data.filter(item => item.type === 'GraphVideo').length;
    const videoRate = (videoContent / data.length) * 100;
    
    if (videoRate > 60) {
        insights.push("Video-first content strategy shows strong engagement potential");
    }
    
    return insights;
}

function getSampleData() {
    return [
        {
            id: "sample1",
            ownerUsername: "creator1",
            ownerFullName: "Sample Creator 1",
            likesCount: 1500,
            commentsCount: 45,
            followersCount: 25000,
            videoViewCount: 8000,
            isVerified: true,
            type: "GraphVideo"
        },
        {
            id: "sample2",
            ownerUsername: "creator2",
            ownerFullName: "Sample Creator 2",
            likesCount: 800,
            commentsCount: 32,
            followersCount: 15000,
            videoViewCount: null,
            isVerified: false,
            type: "GraphImage"
        },
        {
            id: "sample3",
            ownerUsername: "creator3",
            ownerFullName: "Sample Creator 3",
            likesCount: 2200,
            commentsCount: 67,
            followersCount: 45000,
            videoViewCount: 12000,
            isVerified: true,
            type: "GraphVideo"
        }
    ];
}
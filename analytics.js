/**
 * Informint Analytics Engine
 * Professional-grade Instagram analytics calculations
 * Author: Onomatix (juncando@gmail.com)
 * Version: 3.0 - Phase 1 Core Metrics
 */

class InformintAnalytics {
    constructor() {
        this.benchmarks = {
            engagementRates: {
                nano: { min: 7, max: 9, label: 'Nano (1K-10K)' },
                micro: { min: 3, max: 5, label: 'Micro (10K-100K)' },
                macro: { min: 1, max: 3, label: 'Macro (100K-1M)' },
                mega: { min: 0.5, max: 2, label: 'Mega (1M+)' }
            },
            performanceTiers: {
                excellent: { min: 6, label: 'Excellent', color: '#10B981' },
                good: { min: 3, label: 'Good', color: '#3B82F6' },
                average: { min: 1, label: 'Average', color: '#F59E0B' },
                poor: { min: 0, label: 'Poor', color: '#EF4444' }
            }
        };
    }

    /**
     * Calculate engagement rate: (likes + comments) / followers * 100
     */
    calculateEngagementRate(likes, comments, followers) {
        if (!followers || followers === 0) return 0;
        const engagement = (parseInt(likes || 0) + parseInt(comments || 0));
        return (engagement / followers) * 100;
    }

    /**
     * Calculate reach multiplier: videoViews / followers
     */
    calculateReachMultiplier(videoViews, followers) {
        if (!followers || followers === 0) return 0;
        return (parseInt(videoViews || 0) / followers);
    }

    /**
     * Calculate viral coefficient based on engagement and reach
     */
    calculateViralCoefficient(engagementRate, reachMultiplier) {
        // Viral coefficient = engagement rate * reach multiplier
        return engagementRate * reachMultiplier;
    }

    /**
     * Determine follower tier for benchmarking
     */
    getFollowerTier(followers) {
        const count = parseInt(followers || 0);
        if (count >= 1000000) return 'mega';
        if (count >= 100000) return 'macro';
        if (count >= 10000) return 'micro';
        if (count >= 1000) return 'nano';
        return 'micro'; // Default to micro for small accounts
    }

    /**
     * Get performance tier based on engagement rate
     */
    getPerformanceTier(engagementRate) {
        if (engagementRate >= 6) return 'excellent';
        if (engagementRate >= 3) return 'good';
        if (engagementRate >= 1) return 'average';
        return 'poor';
    }

    /**
     * Calculate comprehensive performance score (0-100)
     */
    calculatePerformanceScore(data) {
        const {
            likesCount = 0,
            commentsCount = 0,
            videoViewCount = 0,
            ownerFollowersCount = 0,
            ownerIsVerified = false,
            ownerIsBusinessAccount = false
        } = data;

        // Core metrics
        const engagementRate = this.calculateEngagementRate(likesCount, commentsCount, ownerFollowersCount);
        const reachMultiplier = this.calculateReachMultiplier(videoViewCount, ownerFollowersCount);
        
        // Weighted scoring components
        const engagementScore = Math.min(engagementRate * 10, 40); // Max 40 points (40% weight)
        const reachScore = Math.min(reachMultiplier * 30, 30); // Max 30 points (30% weight)
        
        // Authority bonuses
        const verificationBonus = ownerIsVerified ? 10 : 0; // 10% weight
        const businessBonus = ownerIsBusinessAccount ? 5 : 0; // 5% weight
        
        // Follower quality (inverse relationship - smaller accounts often have better engagement)
        const followerTier = this.getFollowerTier(ownerFollowersCount);
        const followerQualityScore = {
            nano: 15,
            micro: 12,
            macro: 8,
            mega: 5
        }[followerTier] || 10; // 15% weight max

        const totalScore = engagementScore + reachScore + verificationBonus + businessBonus + followerQualityScore;
        return Math.min(Math.round(totalScore), 100);
    }

    /**
     * Generate comprehensive analytics for a single post
     */
    analyzePost(postData) {
        const {
            id,
            url,
            type,
            ownerUsername,
            ownerFollowersCount = 0,
            ownerFollowingCount = 0,
            ownerIsVerified = false,
            ownerIsBusinessAccount = false,
            likesCount = 0,
            commentsCount = 0,
            videoViewCount = 0,
            timestamp,
            caption = ''
        } = postData;

        // Core calculations
        const engagementRate = this.calculateEngagementRate(likesCount, commentsCount, ownerFollowersCount);
        const reachMultiplier = this.calculateReachMultiplier(videoViewCount, ownerFollowersCount);
        const viralCoefficient = this.calculateViralCoefficient(engagementRate, reachMultiplier);
        const performanceScore = this.calculatePerformanceScore(postData);

        // Benchmarking
        const followerTier = this.getFollowerTier(ownerFollowersCount);
        const performanceTier = this.getPerformanceTier(engagementRate);
        const benchmark = this.benchmarks.engagementRates[followerTier];

        // ROI Analysis
        const roiPotential = this.calculateROIPotential(engagementRate, ownerFollowersCount);

        return {
            // Basic info
            postId: id,
            postUrl: url,
            postType: type,
            creatorUsername: ownerUsername,
            timestamp: timestamp,
            
            // Creator metrics
            followers: parseInt(ownerFollowersCount),
            following: parseInt(ownerFollowingCount),
            isVerified: ownerIsVerified,
            isBusinessAccount: ownerIsBusinessAccount,
            followerTier: followerTier,
            
            // Engagement metrics
            likes: parseInt(likesCount),
            comments: parseInt(commentsCount),
            views: parseInt(videoViewCount),
            totalEngagement: parseInt(likesCount) + parseInt(commentsCount),
            
            // Calculated metrics
            engagementRate: parseFloat(engagementRate.toFixed(2)),
            reachMultiplier: parseFloat(reachMultiplier.toFixed(2)),
            viralCoefficient: parseFloat(viralCoefficient.toFixed(2)),
            performanceScore: performanceScore,
            
            // Benchmarking
            performanceTier: performanceTier,
            benchmarkMin: benchmark.min,
            benchmarkMax: benchmark.max,
            benchmarkLabel: benchmark.label,
            aboveBenchmark: engagementRate > benchmark.max,
            
            // Business intelligence
            roiPotential: roiPotential,
            contentLength: caption.length,
            hasHashtags: caption.includes('#'),
            hasMentions: caption.includes('@')
        };
    }

    /**
     * Calculate ROI potential for influencer partnerships
     */
    calculateROIPotential(engagementRate, followers) {
        // High engagement + lower followers = high ROI potential
        // Low engagement + high followers = low ROI potential
        const followerScore = Math.max(0, 10 - Math.log10(followers || 1000));
        const engagementScore = engagementRate;
        return Math.min(Math.round((followerScore + engagementScore) * 5), 100);
    }

    /**
     * Analyze multiple posts and generate summary statistics
     */
    analyzeBatch(postsData) {
        if (!Array.isArray(postsData) || postsData.length === 0) {
            return { error: 'No valid posts data provided' };
        }

        const analyses = postsData.map(post => this.analyzePost(post));
        
        // Summary statistics
        const totalPosts = analyses.length;
        const avgEngagementRate = analyses.reduce((sum, a) => sum + a.engagementRate, 0) / totalPosts;
        const avgPerformanceScore = analyses.reduce((sum, a) => sum + a.performanceScore, 0) / totalPosts;
        const avgROIPotential = analyses.reduce((sum, a) => sum + a.roiPotential, 0) / totalPosts;
        
        // Performance distribution
        const performanceDistribution = {
            excellent: analyses.filter(a => a.performanceTier === 'excellent').length,
            good: analyses.filter(a => a.performanceTier === 'good').length,
            average: analyses.filter(a => a.performanceTier === 'average').length,
            poor: analyses.filter(a => a.performanceTier === 'poor').length
        };

        // Creator insights
        const creators = [...new Set(analyses.map(a => a.creatorUsername))];
        const creatorStats = creators.map(username => {
            const creatorPosts = analyses.filter(a => a.creatorUsername === username);
            const avgEngagement = creatorPosts.reduce((sum, p) => sum + p.engagementRate, 0) / creatorPosts.length;
            const avgScore = creatorPosts.reduce((sum, p) => sum + p.performanceScore, 0) / creatorPosts.length;
            
            return {
                username,
                postCount: creatorPosts.length,
                avgEngagementRate: parseFloat(avgEngagement.toFixed(2)),
                avgPerformanceScore: Math.round(avgScore),
                followers: creatorPosts[0].followers,
                isVerified: creatorPosts[0].isVerified,
                tier: creatorPosts[0].followerTier,
                roiPotential: Math.round(creatorPosts.reduce((sum, p) => sum + p.roiPotential, 0) / creatorPosts.length)
            };
        });

        return {
            summary: {
                totalPosts,
                totalCreators: creators.length,
                avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
                avgPerformanceScore: Math.round(avgPerformanceScore),
                avgROIPotential: Math.round(avgROIPotential)
            },
            performanceDistribution,
            creatorStats: creatorStats.sort((a, b) => b.avgPerformanceScore - a.avgPerformanceScore),
            detailedAnalyses: analyses,
            benchmarks: this.benchmarks,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate insights and recommendations
     */
    generateInsights(analysisData) {
        const { summary, creatorStats, performanceDistribution } = analysisData;
        const insights = [];

        // Performance insights
        if (summary.avgEngagementRate > 5) {
            insights.push({
                type: 'success',
                title: 'Excellent Engagement',
                message: `Average engagement rate of ${summary.avgEngagementRate}% is above industry standards.`,
                recommendation: 'Continue current content strategy and consider scaling partnerships.'
            });
        } else if (summary.avgEngagementRate < 2) {
            insights.push({
                type: 'warning',
                title: 'Low Engagement',
                message: `Average engagement rate of ${summary.avgEngagementRate}% is below industry benchmarks.`,
                recommendation: 'Focus on smaller creators with higher engagement rates for better ROI.'
            });
        }

        // Creator insights
        const topCreator = creatorStats[0];
        if (topCreator && topCreator.avgEngagementRate > 5) {
            insights.push({
                type: 'info',
                title: 'Top Performer',
                message: `@${topCreator.username} shows exceptional engagement (${topCreator.avgEngagementRate}%).`,
                recommendation: 'Consider prioritizing partnerships with this creator.'
            });
        }

        // ROI insights
        const highROICreators = creatorStats.filter(c => c.roiPotential > 70);
        if (highROICreators.length > 0) {
            insights.push({
                type: 'success',
                title: 'High ROI Opportunities',
                message: `${highROICreators.length} creators show high ROI potential (>70%).`,
                recommendation: 'These creators offer cost-effective partnership opportunities.'
            });
        }

        return insights;
    }
}

module.exports = InformintAnalytics; 
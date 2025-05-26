// Configuration file for Informint
// Centralizes all variables and settings

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: 'localhost',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
  },

  // Apify Configuration
  apify: {
    token: process.env.APIFY_TOKEN,
    actorId: process.env.APIFY_ACTOR_ID,
    taskId: process.env.APIFY_TASK_ID,
    
    // Default scraping parameters
    defaultInput: {
      resultsType: 'posts', // Valid: "posts", "comments", "details", "mentions", "stories"
      resultsLimit: 1000,
      includeComments: true,
      includeTaggedUsers: true
    },
    
    // Pagination settings
    pagination: {
      limit: 100,
      maxRetries: 3
    }
  },

  // File System Configuration
  storage: {
    scrapesDir: 'scrapes',
    dataFile: 'data.json',
    backupDir: 'backups',
    
    // File naming patterns
    scrapeFilePattern: 'scrape-{timestamp}.json',
    backupFilePattern: 'backup-{timestamp}.json'
  },

  // Application Settings
  app: {
    // Startup behavior
    purgeScrapesOnStartup: true,
    createBackupBeforePurge: true,
    
    // Data management
    maxScrapeFiles: 50, // Maximum number of scrape files to keep
    autoCleanupDays: 30, // Auto-delete scrapes older than X days
    
    // UI Settings
    postsPerPage: 20,
    defaultSortOrder: 'newest', // 'newest', 'oldest', 'most_liked'
    
    // Export settings
    csvHeaders: ['Username', 'Caption', 'Likes', 'Comments', 'Views', 'Date', 'URL'],
    dateFormat: 'YYYY-MM-DD HH:mm:ss'
  },

  // Future Supabase Configuration (placeholder)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    
    // Table names
    tables: {
      scrapes: 'scrapes',
      posts: 'posts',
      comments: 'comments',
      users: 'users'
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
    enableConsole: true,
    enableFile: false,
    logFile: 'app.log'
  },

  // Rate Limiting (for future API protection)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: false
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    optionsSuccessStatus: 200
  }
}; 
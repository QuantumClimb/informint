require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ApifyClient } = require('apify-client');
const config = require('./config');

// Initialize Apify client with config
const client = new ApifyClient({ token: config.apify.token });
const app = express();
const port = config.server.port;

app.use(cors());
app.use(express.static('.'));

// Startup functions
function createBackup() {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  const backupDir = path.join(__dirname, config.storage.backupDir);
  
  if (!fs.existsSync(scrapesDir)) return;
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
  if (files.length === 0) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  // Combine all scrapes into backup
  const allData = [];
  for (const file of files) {
    try {
      const filePath = path.join(scrapesDir, file);
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      allData.push({
        filename: file,
        timestamp: fs.statSync(filePath).mtime,
        data: fileData
      });
    } catch (err) {
      console.error(`❌ Error backing up ${file}:`, err);
    }
  }
  
  fs.writeFileSync(backupFile, JSON.stringify(allData, null, 2));
  console.log(`💾 Created backup with ${files.length} scrapes: ${backupFile}`);
}

function purgeScrapesOnStartup() {
  if (!config.app.purgeScrapesOnStartup) return;
  
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  
  if (!fs.existsSync(scrapesDir)) {
    console.log('📁 No scrapes directory found, nothing to purge');
    return;
  }
  
  const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('🧹 No scrapes to purge');
    return;
  }
  
  // Create backup before purging if enabled
  if (config.app.createBackupBeforePurge) {
    createBackup();
  }
  
  // Delete all scrape files
  let deletedCount = 0;
  for (const file of files) {
    try {
      const filePath = path.join(scrapesDir, file);
      fs.unlinkSync(filePath);
      deletedCount++;
    } catch (err) {
      console.error(`❌ Error deleting ${file}:`, err);
    }
  }
  
  console.log(`🧹 Purged ${deletedCount} scrapes on startup`);
}

// Serve combined data from all scrapes
app.get('/data.json', (req, res) => {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  const combinedData = [];

  if (fs.existsSync(scrapesDir)) {
    const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(scrapesDir, file);
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        combinedData.push(...fileData);
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
  }

  // Sort by timestamp (newest first)
  combinedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(combinedData);
});

// Get list of all scrapes
app.get('/api/scrapes', (req, res) => {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  
  if (!fs.existsSync(scrapesDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(scrapesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(scrapesDir, file);
      const stats = fs.statSync(filePath);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          filename: file,
          timestamp: stats.mtime,
          itemCount: data.length,
          firstUrl: data[0]?.inputUrl || 'Unknown'
        };
      } catch (err) {
        return {
          filename: file,
          timestamp: stats.mtime,
          itemCount: 0,
          firstUrl: 'Error reading file'
        };
      }
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(files);
});

// Get individual scrape data
app.get('/api/scrapes/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, config.storage.scrapesDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Scrape file not found' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Error reading scrape file:', err);
    res.status(500).json({ error: 'Failed to read scrape file' });
  }
});

// Delete a specific scrape
app.delete('/api/scrapes/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, config.storage.scrapesDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Scrape file not found' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ message: 'Scrape deleted successfully' });
  } catch (err) {
    console.error('Error deleting scrape:', err);
    res.status(500).json({ error: 'Failed to delete scrape' });
  }
});

// Delete all scrapes (purge)
app.delete('/api/scrapes', (req, res) => {
  const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
  
  if (!fs.existsSync(scrapesDir)) {
    return res.json({ message: 'No scrapes to delete' });
  }

  try {
    const files = fs.readdirSync(scrapesDir).filter(file => file.endsWith('.json'));
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(scrapesDir, file);
      fs.unlinkSync(filePath);
      deletedCount++;
    }

    res.json({ message: `Successfully deleted ${deletedCount} scrapes` });
  } catch (err) {
    console.error('Error purging scrapes:', err);
    res.status(500).json({ error: 'Failed to purge scrapes' });
  }
});

app.get('/api/scrape', async (req, res) => {
  let urls = req.query.url;
  if (!urls) {
    return res.status(400).json({ error: 'Missing ?url=' });
  }
  if (!Array.isArray(urls)) urls = [urls];

  const input = {
    directUrls: urls,
    ...config.apify.defaultInput
  };

  try {
    const run = config.apify.taskId
      ? await client.task(config.apify.taskId).call(input)
      : await client.actor(config.apify.actorId).call(input);

    const datasetId = run.defaultDatasetId;

    // Fetch full items with as much detail as available
    const items = [];
    let offset = 0;
    const limit = config.apify.pagination.limit;
    while (true) {
      const page = await client.dataset(datasetId).listItems({ offset, limit });
      items.push(...page.items);
      if (page.items.length < limit) break;
      offset += limit;
    }

    // Save individual scrape with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const individualPath = path.join(__dirname, config.storage.scrapesDir, `scrape-${timestamp}.json`);
    
    // Ensure scrapes directory exists
    const scrapesDir = path.join(__dirname, config.storage.scrapesDir);
    if (!fs.existsSync(scrapesDir)) {
      fs.mkdirSync(scrapesDir);
    }
    
    fs.writeFileSync(individualPath, JSON.stringify(items, null, 2));
    console.log(`✅ Wrote individual scrape (${items.length} items) to ${individualPath}`);

    res.json(items);
  } catch (err) {
    console.error('❌ Scrape error:', err);
    res.status(500).json({ error: err.message || 'Scrape failed' });
  }
});

// Initialize server
function startServer() {
  // Run startup tasks
  purgeScrapesOnStartup();
  
  app.listen(port, () => {
    console.log(`🚀 Server ready at ${config.server.baseUrl}`);
    console.log(`📁 Scrapes directory: ${config.storage.scrapesDir}`);
    console.log(`💾 Backup directory: ${config.storage.backupDir}`);
    console.log(`🧹 Purge on startup: ${config.app.purgeScrapesOnStartup ? 'enabled' : 'disabled'}`);
  });
}

// Start the server
startServer();

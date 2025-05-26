# Informint

**Fresh Data. Real Influence.**

Informint is a powerful Instagram analytics and scraping tool that helps you extract valuable insights from Instagram posts for influencer campaigns, competitive analysis, and market research.

## 🚀 Features

- **Multi-URL Scraping**: Scrape multiple Instagram posts simultaneously
- **Real-time Analytics**: Get fresh data with comprehensive metrics
- **Comment Analysis**: Deep dive into comments, replies, and engagement
- **Export Capabilities**: Download data in CSV format
- **Scrape Management**: View, manage, and delete individual scrapes
- **Responsive Design**: Beautiful, modern UI that works on all devices
- **Backup System**: Automatic backups before data purging

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Scraping**: Apify Client
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Custom CSS with Poppins font
- **Data Storage**: JSON files (with future Supabase integration planned)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Onomatix/informint.git
   cd informint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Apify credentials:
   ```env
   APIFY_TOKEN=your_apify_token_here
   APIFY_ACTOR_ID=your_actor_id_here
   APIFY_TASK_ID=your_task_id_here
   ```

4. **Start the server**
   ```bash
   node index.js
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🌐 Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Set the following environment variables in Render:
   - `APIFY_TOKEN`
   - `APIFY_ACTOR_ID` 
   - `APIFY_TASK_ID`
3. Deploy with the following settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Port**: 3000

## 📁 Project Structure

```
informint/
├── index.js              # Main server file
├── config.js             # Configuration management
├── package.json          # Dependencies and scripts
├── .gitignore            # Git ignore rules
├── env.example           # Environment variables template
├── index.html            # Home page
├── scrape.html           # Scraping interface
├── dashboard.html        # Results dashboard
├── pricing.html          # Pricing page
├── dashboard.js          # Dashboard functionality
├── css/                  # Stylesheets
├── scrapes/              # Individual scrape files (gitignored)
└── backups/              # Backup files (gitignored)
```

## 🔧 Configuration

The application uses a centralized configuration system in `config.js`. Key settings include:

- **Server Configuration**: Port, host, base URL
- **Apify Settings**: API credentials and scraping parameters
- **Storage Options**: File paths and naming patterns
- **App Behavior**: Startup purging, backup creation
- **Future Integrations**: Supabase configuration placeholders

## 📊 API Endpoints

- `GET /` - Home page
- `GET /data.json` - Combined data from all scrapes
- `GET /api/scrapes` - List all scrapes with metadata
- `GET /api/scrapes/:filename` - Get individual scrape data
- `DELETE /api/scrapes/:filename` - Delete specific scrape
- `DELETE /api/scrapes` - Purge all scrapes
- `GET /api/scrape?url=...` - Scrape Instagram URL(s)

## 🎯 Usage

1. **Navigate to the Scrape page**
2. **Enter Instagram post URLs** (one or multiple)
3. **Click "Run Scrape"** to extract data
4. **View results** in the Dashboard
5. **Export data** as CSV or manage individual scrapes

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APIFY_TOKEN` | Your Apify API token | Yes |
| `APIFY_ACTOR_ID` | Apify actor ID for Instagram scraping | Yes |
| `APIFY_TASK_ID` | Apify task ID (optional) | No |
| `PORT` | Server port (default: 3000) | No |
| `BASE_URL` | Base URL for the application | No |

## 🚧 Roadmap

- [ ] Supabase integration for persistent data storage
- [ ] User authentication and accounts
- [ ] Advanced analytics and reporting
- [ ] Sentiment analysis for comments
- [ ] API rate limiting and security
- [ ] Scheduled scraping
- [ ] Email notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Onomatix**
- GitHub: [@Onomatix](https://github.com/Onomatix)
- Email: juncando@gmail.com

---

**Informint** - *Fresh Data. Real Influence.* 
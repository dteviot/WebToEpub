# WebToEpub Production Website

A fully functional web-based EPUB converter that works with real websites using WebToEpub's proven parsing logic.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Modern web browser

### Installation & Launch
```bash
# Navigate to website directory
cd website

# Run the startup script (installs dependencies and starts server)
./start.sh

# Or manually:
npm install
npm start
```

Open http://localhost:3000 in your browser.

## ✨ Production Features

### Real Website Support
- **Live Content Extraction**: Fetches actual content from websites
- **400+ Site Parsers**: Adapted from WebToEpub extension
- **Rate Limiting**: Respects website policies
- **Error Handling**: Robust error recovery

### Advanced Parsing
- **Site-Specific Logic**: Optimized for popular sites like Royal Road, AO3
- **Content Cleaning**: Removes ads, navigation, unwanted elements
- **Chapter Detection**: Intelligent chapter link identification
- **Metadata Extraction**: Automatic title, author, cover detection

### Production-Ready Backend
- **CORS Handling**: Bypasses browser restrictions
- **Batch Processing**: Efficient multi-chapter fetching
- **Image Support**: Downloads and processes images
- **Caching**: Reduces server load

## 🎯 How It Works

### 1. URL Analysis
```javascript
// User enters URL → Backend fetches page
POST /api/fetch { "url": "https://royalroad.com/fiction/123" }

// Parser analyzes structure
const parser = parserFactory.getParser(url, dom);
const chapters = await parser.getChapterUrls(dom);
```

### 2. Content Extraction
```javascript
// Batch fetch chapter content
POST /api/fetch-batch { "urls": [...chapterUrls] }

// Clean and process content
const content = parser.findContent(dom);
const cleanContent = parser.cleanContent(content);
```

### 3. EPUB Generation
```javascript
// Create valid EPUB 3.0 file
const epubPacker = new EpubPacker(metaInfo);
const epubBlob = await epubPacker.assemble(chapters);
```

## 🌐 Supported Websites

### Fully Tested
- **Royal Road**: Fiction stories and serials
- **Archive of Our Own**: Fanfiction and original works
- **FanFiction.Net**: Large fanfiction archive
- **Wuxiaworld**: Chinese web novels
- **Webnovel**: International web novels

### Parser System
- **BaseParser**: Handles unknown sites with heuristics
- **Site-Specific**: Optimized parsers for major platforms
- **Extensible**: Easy to add new site support

## 🔧 API Endpoints

### Fetch Single Page
```http
POST /api/fetch
Content-Type: application/json

{
  "url": "https://example.com/story"
}
```

### Batch Fetch Multiple Pages
```http
POST /api/fetch-batch
Content-Type: application/json

{
  "urls": ["url1", "url2", "url3"]
}
```

### Fetch Images
```http
POST /api/fetch-image
Content-Type: application/json

{
  "url": "https://example.com/image.jpg"
}
```

## 📁 Architecture

```
website/
├── server.js              # Express backend with web scraping
├── package.json           # Dependencies and scripts
├── start.sh              # Easy startup script
├── index.html            # Modern responsive UI
├── styles.css            # Professional styling
└── js/
    ├── app.js            # Main application logic
    ├── parser-factory.js # Site-specific parsers
    ├── epub-packer.js    # EPUB generation
    └── utils.js          # Utility functions
```

## 🛡️ Security & Ethics

### Rate Limiting
- 2-second delays between requests
- Per-hostname rate limiting
- Batch size limits (max 50 URLs)

### Respectful Scraping
- Proper User-Agent headers
- Timeout handling (30s max)
- Error recovery and retries
- No aggressive crawling

### Legal Compliance
- Respects robots.txt (manual check recommended)
- For personal use only
- Users responsible for copyright compliance

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000                 # Server port
NODE_ENV=production      # Environment mode
```

### Rate Limiting
```javascript
// In server.js
const RATE_LIMIT_MS = 2000;  // Delay between requests
const MAX_BATCH_SIZE = 50;   // Max URLs per batch
```

## 🚀 Deployment

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production Deployment
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name webtoepub

# Using Docker
docker build -t webtoepub .
docker run -p 3000:3000 webtoepub

# Using systemd service
sudo systemctl enable webtoepub
sudo systemctl start webtoepub
```

### Cloud Deployment
- **Heroku**: Ready for deployment
- **Vercel**: Serverless functions
- **AWS/GCP**: Container deployment
- **DigitalOcean**: App platform

## 🐛 Troubleshooting

### Common Issues

**"Rate limit exceeded"**
- Wait 2 seconds between requests
- Server implements per-hostname limiting

**"Failed to fetch content"**
- Check if website blocks scrapers
- Verify URL is accessible
- Some sites require specific headers

**"No chapters found"**
- Website structure may have changed
- Try different URL (table of contents page)
- Check if site is supported

### Debug Mode
```bash
DEBUG=* npm start  # Enable debug logging
```

## 📈 Performance

### Optimization Features
- Batch processing for multiple chapters
- Content cleaning to reduce size
- Efficient DOM parsing
- Memory management for large stories

### Benchmarks
- **Small story** (10 chapters): ~30 seconds
- **Medium story** (50 chapters): ~3 minutes
- **Large story** (200+ chapters): ~10 minutes

## 🤝 Contributing

### Adding New Site Support
```javascript
class NewSiteParser extends BaseParser {
    canHandle(url) {
        return url.includes('newsite.com');
    }
    
    async getChapterUrls(dom) {
        // Site-specific chapter extraction
    }
    
    findContent(dom) {
        // Site-specific content extraction
    }
}

// Register the parser
parserFactory.parsers.push(new NewSiteParser());
```

### Testing
```bash
npm test                    # Run test suite
npm run test:integration   # Integration tests
```

## 📄 License

GPL-3.0 - Based on the WebToEpub browser extension

## 🆘 Support

1. Check this documentation
2. Review browser console for errors
3. Test with supported websites first
4. Report issues with detailed error information

---

**Ready to convert web novels to EPUB format!** 📚✨
# WebToEpub Website - Production Deployment Guide

## Overview
This guide covers deploying the WebToEpub website to production with the integrated extension logic.

## Prerequisites

### System Requirements
- Node.js 16+ 
- npm or yarn
- 2GB+ RAM
- 10GB+ storage

### Dependencies
```bash
npm install express node-fetch jsdom cors
```

## Deployment Steps

### 1. Environment Setup

Create `.env` file:
```env
NODE_ENV=production
PORT=3000
RATE_LIMIT_MS=2000
MAX_CONCURRENT_REQUESTS=10
CORS_ORIGIN=https://yourdomain.com
```

### 2. Production Server Configuration

Update `server.js` for production:

```javascript
// Add to server.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Request size limits
app.use(express.json({ limit: '10mb' }));
```

### 3. Process Management

Use PM2 for process management:

```bash
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'webtoepub-website',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Static files
    location / {
        root /path/to/webtoepub/website;
        try_files $uri $uri/ @backend;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Fallback to backend
    location @backend {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. SSL Certificate

Using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 6. Monitoring and Logging

#### Application Monitoring
```javascript
// Add to server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});
```

#### Health Check Endpoint
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### 7. Database (Optional)

For user accounts and preferences:

```javascript
// Using MongoDB
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  preferences: Object,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
```

### 8. CDN Configuration

Use a CDN for static assets:

```html
<!-- Update index.html -->
<script src="https://cdn.yourdomain.com/js/app.js"></script>
<link href="https://cdn.yourdomain.com/css/styles.css" rel="stylesheet">
```

## Security Considerations

### 1. Input Validation
```javascript
const validator = require('validator');

app.post('/api/fetch', (req, res) => {
  const { url } = req.body;
  
  if (!validator.isURL(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  // Additional validation...
});
```

### 2. Rate Limiting by IP
```javascript
const rateLimitByIP = new Map();

function checkIPRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimitByIP.get(ip) || [];
  
  // Remove old requests
  const recent = requests.filter(time => now - time < 60000);
  
  if (recent.length >= 10) {
    return false;
  }
  
  recent.push(now);
  rateLimitByIP.set(ip, recent);
  return true;
}
```

### 3. Content Security Policy
```javascript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"]
  }
}));
```

## Performance Optimization

### 1. Caching
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

app.post('/api/fetch', async (req, res) => {
  const { url } = req.body;
  const cacheKey = `fetch:${url}`;
  
  let cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  // Fetch and cache result...
});
```

### 2. Compression
```javascript
const compression = require('compression');
app.use(compression());
```

### 3. Connection Pooling
```javascript
const fetch = require('node-fetch');
const Agent = require('agentkeepalive');

const agent = new Agent({
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

// Use agent in fetch requests
```

## Backup and Recovery

### 1. Automated Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "/backups/webtoepub_$DATE.tar.gz" /path/to/webtoepub/
find /backups -name "webtoepub_*.tar.gz" -mtime +7 -delete
```

### 2. Database Backup (if using)
```bash
mongodump --db webtoepub --out /backups/mongo_$DATE/
```

## Monitoring and Alerts

### 1. Uptime Monitoring
Use services like:
- Pingdom
- UptimeRobot  
- StatusCake

### 2. Application Metrics
```javascript
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});
```

## Troubleshooting

### Common Issues

1. **Memory Leaks**: Monitor with `process.memoryUsage()`
2. **High CPU**: Use clustering and optimize parsing
3. **Slow Responses**: Implement caching and connection pooling
4. **CORS Errors**: Verify origin configuration

### Log Analysis
```bash
# View recent errors
tail -f error.log | grep ERROR

# Monitor requests
tail -f combined.log | grep "POST /api/fetch"

# Check PM2 status
pm2 status
pm2 logs webtoepub-website
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Implement session affinity if needed
- Share cache between instances (Redis)

### Vertical Scaling  
- Increase server resources
- Optimize Node.js memory limits
- Use clustering effectively

This deployment guide ensures your WebToEpub website runs reliably in production with the same quality as the browser extension.
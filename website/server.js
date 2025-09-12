const express = require('express');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Rate limiting
const rateLimit = new Map();
const RATE_LIMIT_MS = 2000;

function checkRateLimit(hostname) {
    const now = Date.now();
    const lastRequest = rateLimit.get(hostname);
    if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
        return false;
    }
    rateLimit.set(hostname, now);
    return true;
}

// Fetch web page with proper headers
app.post('/api/fetch', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const hostname = new URL(url).hostname;
        if (!checkRateLimit(hostname)) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const finalUrl = response.url;

        res.json({ 
            html, 
            url: finalUrl,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        });

    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ 
            error: error.message,
            type: 'fetch_error'
        });
    }
});

// Batch fetch multiple URLs
app.post('/api/fetch-batch', async (req, res) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'URLs array is required' });
        }

        if (urls.length > 50) {
            return res.status(400).json({ error: 'Too many URLs (max 50)' });
        }

        const results = [];
        
        for (const url of urls) {
            try {
                const hostname = new URL(url).hostname;
                
                // Rate limiting per hostname
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    timeout: 15000
                });

                if (response.ok) {
                    const html = await response.text();
                    results.push({
                        url,
                        html,
                        finalUrl: response.url,
                        success: true
                    });
                } else {
                    results.push({
                        url,
                        error: `HTTP ${response.status}`,
                        success: false
                    });
                }
            } catch (error) {
                results.push({
                    url,
                    error: error.message,
                    success: false
                });
            }
        }

        res.json({ results });

    } catch (error) {
        console.error('Batch fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fetch image with proper handling
app.post('/api/fetch-image', async (req, res) => {
    try {
        const { url } = req.body;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const buffer = await response.buffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        res.json({
            data: buffer.toString('base64'),
            contentType,
            size: buffer.length
        });

    } catch (error) {
        console.error('Image fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`WebToEpub server running on http://localhost:${PORT}`);
    console.log('Open your browser and navigate to the URL above');
});

module.exports = app;
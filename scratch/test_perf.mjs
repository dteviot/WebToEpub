import puppeteer from 'puppeteer';
import handler from 'serve-handler';
import http from 'http';

const server = http.createServer((request, response) => {
  return handler(request, response, { public: './' });
});

server.listen(3000, async () => {
  console.log('Running locally at http://localhost:3000');
  
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  const loadedScripts = new Set();
  
  page.on('request', request => {
    if (request.resourceType() === 'script') {
      const url = request.url();
      loadedScripts.add(url.split('/').pop());
    }
  });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

  console.log('Navigating to index.html...');
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle0' });
  
  console.log('Initial scripts loaded:', Array.from(loadedScripts));
  
  const isSearchEngineInitiallyLoaded = loadedScripts.has('SearchEngineUI.js?v=20260602_v1');
  console.log('Is SearchEngineUI loaded initially?', isSearchEngineInitiallyLoaded);

  console.log('Clicking Search Profile...');
  await page.click('#profileSearch');
  
  // Wait for dynamic import
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Scripts loaded after click:', Array.from(loadedScripts));
  console.log('Is SearchEngineUI loaded now?', loadedScripts.has('SearchEngineUI.js?v=20260602_v1'));

  // Test routing
  const urlAfterClick = await page.evaluate(() => window.location.href);
  console.log('URL after click:', urlAfterClick);
  
  // Click home
  await page.click('#globalBackBtn');
  await new Promise(r => setTimeout(r, 500));
  
  const urlAfterHome = await page.evaluate(() => window.location.href);
  console.log('URL after home:', urlAfterHome);
  
  await browser.close();
  server.close();
});

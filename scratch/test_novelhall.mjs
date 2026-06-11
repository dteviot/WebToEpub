import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Create a dummy HTML to load the scripts
    const htmlPath = 'file://' + path.resolve(__dirname, '../test_novelhall.html');
    
    console.log("Loading", htmlPath);
    await page.goto(htmlPath, { waitUntil: 'networkidle0' });
    
    await browser.close();
})();

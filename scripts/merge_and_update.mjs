import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteSearchPath = path.join(__dirname, '../plugin/js/SiteSearchEngine.js');
let siteSearchContent = fs.readFileSync(siteSearchPath, 'utf8');

// Load classified_hosts.json
const classifiedHosts = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'classified_hosts.json'), 'utf8')
);

// Helper to extract hosts from SiteSearchEngine.js using regex
function extractOriginalHosts(varName) {
    const regex = new RegExp(`const\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
    const match = siteSearchContent.match(regex);
    if (!match) return [];
    
    // Parse individual strings
    const str = match[1];
    const itemRegex = /"([^"]+)"|'([^']+)'/g;
    const items = [];
    let itemMatch;
    while ((itemMatch = itemRegex.exec(str)) !== null) {
        items.push(itemMatch[1] || itemMatch[2]);
    }
    return items;
}

// Extract original lists
const origNovelFull = extractOriginalHosts('novelFullHosts');
const origMadara = extractOriginalHosts('madaraHosts');
const origReadwn = extractOriginalHosts('readwnHosts');
const origWp = extractOriginalHosts('wpHosts');
const origNoble = extractOriginalHosts('nobleHosts');
const origLnw = extractOriginalHosts('lnwHosts');
const origGeneral = extractOriginalHosts('generalHosts');

console.log('Original Count check:');
console.log('- novelFullHosts:', origNovelFull.length);
console.log('- madaraHosts:', origMadara.length);
console.log('- readwnHosts:', origReadwn.length);
console.log('- wpHosts:', origWp.length);
console.log('- nobleHosts:', origNoble.length);
console.log('- lnwHosts:', origLnw.length);
console.log('- generalHosts:', origGeneral.length);

// Merge
const merge = (orig, ext) => Array.from(new Set([...orig, ...ext])).sort();

const mergedNovelFull = merge(origNovelFull, classifiedHosts.novelfull);
const mergedMadara = merge(origMadara, classifiedHosts.madara);
const mergedReadwn = merge(origReadwn, classifiedHosts.readwn);
const mergedWp = merge(origWp, classifiedHosts.wordpress);
const mergedNoble = merge(origNoble, classifiedHosts.noblemtl);
const mergedLnw = merge(origLnw, classifiedHosts.lightnovelworld);
const mergedGeneral = merge(origGeneral, classifiedHosts.custom);

console.log('\nMerged Count:');
console.log('- novelFullHosts:', mergedNovelFull.length);
console.log('- madaraHosts:', mergedMadara.length);
console.log('- readwnHosts:', mergedReadwn.length);
console.log('- wpHosts:', mergedWp.length);
console.log('- nobleHosts:', mergedNoble.length);
console.log('- lnwHosts:', mergedLnw.length);
console.log('- generalHosts:', mergedGeneral.length);

// Helper to replace array in content
function replaceArray(content, varName, mergedList) {
    const regex = new RegExp(`(const\\s+${varName}\\s*=\\s*\\[)[\\s\\S]*?(\\];)`);
    const formatted = JSON.stringify(mergedList);
    return content.replace(regex, `$1${formatted.substring(1, formatted.length - 1)}$2`);
}

siteSearchContent = replaceArray(siteSearchContent, 'novelFullHosts', mergedNovelFull);
siteSearchContent = replaceArray(siteSearchContent, 'madaraHosts', mergedMadara);
siteSearchContent = replaceArray(siteSearchContent, 'readwnHosts', mergedReadwn);
siteSearchContent = replaceArray(siteSearchContent, 'wpHosts', mergedWp);
siteSearchContent = replaceArray(siteSearchContent, 'nobleHosts', mergedNoble);
siteSearchContent = replaceArray(siteSearchContent, 'lnwHosts', mergedLnw);
siteSearchContent = replaceArray(siteSearchContent, 'generalHosts', mergedGeneral);

fs.writeFileSync(siteSearchPath, siteSearchContent, 'utf8');
console.log('\nUpdated SiteSearchEngine.js successfully!');

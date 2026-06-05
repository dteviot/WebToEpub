import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parsersDir = path.join(__dirname, '../plugin/js/parsers');

const files = fs.readdirSync(parsersDir).filter(f => f.endsWith('.js'));

const registrations = []; // { host, parserClass, file, content }
const classDefinitions = new Map(); // className -> parentClassName

// Pass 1: Parse all files to extract registrations and class hierarchy
for (const file of files) {
    const filePath = path.join(parsersDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract class hierarchy: class Child extends Parent
    const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?/g;
    let classMatch;
    while ((classMatch = classRegex.exec(content)) !== null) {
        classDefinitions.set(classMatch[1], classMatch[2] || null);
    }

    // Extract registrations
    // Matches: parserFactory.register("host", () => new Class())
    const regRegex = /parserFactory\.(?:register|registerDeadSite|reregister)\(\s*(["'])(.*?)\1\s*,\s*\(\)\s*=>\s*new\s+([A-Za-z0-9_]+)/g;
    let regMatch;
    while ((regMatch = regRegex.exec(content)) !== null) {
        registrations.push({
            host: regMatch[2].trim(),
            parserClass: regMatch[3].trim(),
            file: file
        });
    }
}

// Map helper to trace ancestor class
function getBaseClass(className) {
    let current = className;
    let visited = new Set();
    while (current && classDefinitions.has(current)) {
        if (visited.has(current)) break; // Prevent cycle
        visited.add(current);
        let parent = classDefinitions.get(current);
        if (!parent) return current;
        current = parent;
    }
    return current;
}

const categorised = {
    madara: new Set(),
    novelfull: new Set(),
    readwn: new Set(),
    wordpress: new Set(),
    noblemtl: new Set(),
    lightnovelworld: new Set(),
    custom: new Set()
};

// Map each registration to a category
for (const reg of registrations) {
    const baseClass = getBaseClass(reg.parserClass) || reg.parserClass;
    
    let category = 'custom';
    
    if (baseClass.includes('Madara') || reg.parserClass.includes('Madara') || reg.parserClass === 'KdtnovelsParser') {
        category = 'madara';
    } else if (baseClass.includes('Novelfull') || baseClass.includes('NovelFull') || reg.parserClass.includes('Novelfull') || reg.parserClass.includes('NovelFull') || reg.parserClass.includes('Novelbin') || reg.parserClass.includes('NovelHyphenBin') || reg.parserClass.includes('Novel35')) {
        category = 'novelfull';
    } else if (baseClass.includes('Readwn') || reg.parserClass.includes('Readwn') || reg.parserClass === 'WuxiaboxParser') {
        category = 'readwn';
    } else if (baseClass.includes('Wordpress') || baseClass.includes('WordPress') || reg.parserClass.includes('Wordpress') || reg.parserClass.includes('WordPress') || reg.parserClass === 'Wanderertl130Parser') {
        category = 'wordpress';
    } else if (baseClass.includes('Noblemtl') || reg.parserClass.includes('Noblemtl')) {
        category = 'noblemtl';
    } else if (baseClass.includes('LightNovelWorld') || baseClass.includes('LightNovelCave') || reg.parserClass.includes('LightNovelWorld') || reg.parserClass.includes('LightNovelCave') || reg.parserClass.includes('LightNovelpub')) {
        category = 'lightnovelworld';
    }

    categorised[category].add(reg.host);
}

// Convert Sets to sorted Arrays
const result = {};
for (const key of Object.keys(categorised)) {
    result[key] = Array.from(categorised[key]).sort();
}

console.log('--- Hostname Extraction Stats ---');
console.log('Total files checked:', files.length);
console.log('Total registrations extracted:', registrations.length);
for (const key of Object.keys(result)) {
    console.log(`- ${key}: ${result[key].length} hosts`);
}

fs.writeFileSync(
    path.join(__dirname, 'extracted_hosts.json'),
    JSON.stringify(result, null, 2),
    'utf8'
);
console.log('\nResults written to scripts/extracted_hosts.json');

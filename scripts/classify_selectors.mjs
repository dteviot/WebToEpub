import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parsersDir = path.join(__dirname, '../plugin/js/parsers');

const files = fs.readdirSync(parsersDir).filter(f => f.endsWith('.js'));

const registrations = [];
const classDefinitions = new Map();
const fileContents = new Map();

for (const file of files) {
    const filePath = path.join(parsersDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    fileContents.set(file, content);

    const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?/g;
    let classMatch;
    while ((classMatch = classRegex.exec(content)) !== null) {
        classDefinitions.set(classMatch[1], classMatch[2] || null);
    }

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

function getBaseClass(className) {
    let current = className;
    let visited = new Set();
    while (current && classDefinitions.has(current)) {
        if (visited.has(current)) break;
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

for (const reg of registrations) {
    const baseClass = getBaseClass(reg.parserClass) || reg.parserClass;
    const content = fileContents.get(reg.file) || '';
    
    let category = 'custom';
    
    // Check inheritance & class name first
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
    } else {
        // Selector-based heuristic fallback
        const contentLower = content.toLowerCase();
        if (content.includes('wp-manga-chapter') || content.includes('wp-manga-') || content.includes('MadaraParser')) {
            category = 'madara';
        } else if (content.includes('list-truyen') || content.includes('chr-content') || content.includes('NovelfullParser')) {
            category = 'novelfull';
        } else if (content.includes('chapter-list') && content.includes('ReadwnParser')) {
            category = 'readwn';
        } else if (content.includes('entry-content') || content.includes('WordpressBaseParser')) {
            category = 'wordpress';
        } else if (content.includes('NoblemtlParser') || content.includes('listupd .bs')) {
            category = 'noblemtl';
        } else if (content.includes('LightNovelWorldParser') || content.includes('lightnovelcave') || content.includes('lightnovelpub')) {
            category = 'lightnovelworld';
        }
    }

    categorised[category].add(reg.host);
}

const result = {};
for (const key of Object.keys(categorised)) {
    result[key] = Array.from(categorised[key]).sort();
}

console.log('--- Selector-based Classification Stats ---');
for (const key of Object.keys(result)) {
    console.log(`- ${key}: ${result[key].length} hosts`);
}

fs.writeFileSync(
    path.join(__dirname, 'classified_hosts.json'),
    JSON.stringify(result, null, 2),
    'utf8'
);
console.log('\nResults written to scripts/classified_hosts.json');

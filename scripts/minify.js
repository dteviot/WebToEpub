const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getFiles(dir, ext) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath, ext));
        } else if (file.endsWith(ext)) {
            results.push(fullPath);
        }
    });
    return results;
}

const jsFiles = getFiles(path.join(__dirname, '../plugin/js'), '.js');
const cssFiles = getFiles(path.join(__dirname, '../plugin/css'), '.css');

console.log(`Found ${jsFiles.length} JS files and ${cssFiles.length} CSS files to minify.`);

jsFiles.forEach(file => {
    console.log(`Minifying JS: ${file}`);
    execSync(`npx esbuild "${file}" --minify --allow-overwrite --outfile="${file}"`);
});

cssFiles.forEach(file => {
    console.log(`Minifying CSS: ${file}`);
    execSync(`npx esbuild "${file}" --minify --allow-overwrite --outfile="${file}"`);
});

console.log('Minification complete!');

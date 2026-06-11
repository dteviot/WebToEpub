import fs from 'fs';

const htmlFile = 'plugin/live-reader.html';
let html = fs.readFileSync(htmlFile, 'utf8');

const regex = /<script\s+src="(js\/parsers\/[^"]+)"(\s+defer)?>\s*<\/script>/g;

let parsers = [];
let match;
while ((match = regex.exec(html)) !== null) {
    parsers.push(match[1]);
}

html = html.replace(regex, ''); // remove all parser scripts

// We also need to define the loader function
const loaderScript = `
        <script>
            window.loadLiveReaderParsers = async () => {
                if (window.__parsersLoaded) return;
                const parsers = ${JSON.stringify(parsers)};
                
                const loadScripts = async (scripts) => {
                    for (const src of scripts) {
                        await new Promise((resolve, reject) => {
                            const s = document.createElement("script");
                            s.src = src;
                            s.onload = resolve;
                            s.onerror = reject;
                            document.body.appendChild(s);
                        });
                    }
                };
                
                await loadScripts(parsers);
                window.__parsersLoaded = true;
            };
        </script>
`;

// Insert the loaderScript before the <!-- Live Reader --> comment
html = html.replace('<!-- Live Reader -->', loaderScript + '<!-- Live Reader -->');

fs.writeFileSync(htmlFile, html, 'utf8');
console.log(`Extracted and replaced ${parsers.length} parsers.`);

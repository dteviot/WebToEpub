const fs = require('fs');
let file = fs.readFileSync('plugin/js/EpubViewerUI.js', 'utf8');

file = file.replace(
    /if \(isWebsite \|\| noWorkerLoaded\) \{\s*return "zip-no-worker\.min\.js";\s*\}/,
    'if (noWorkerLoaded) { return "zip-no-worker.min.js"; }'
);

fs.writeFileSync('plugin/js/EpubViewerUI.js', file);

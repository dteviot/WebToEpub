const fs = require('fs');

function patchFile(filename) {
    let file = fs.readFileSync(filename, 'utf8');
    
    // Remove the bad targetIdx assignment block
    const badBlock1 = `
        if (this.ttsParagraphs && this.ttsParagraphs.length > 0) {
            let targetIdx = 0;
            const viewportHeight = window.innerHeight;
            for (let i = 0; i < this.ttsParagraphs.length; i++) {
                const rect = this.ttsParagraphs[i].element.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < viewportHeight) {
                    targetIdx = i;
                    break;
                }
            }
            this.ttsCurrentIndex = targetIdx;
        }
`;

    const badBlock2 = `
        if (this.ttsParagraphs && this.ttsParagraphs.length > 0) {
            let targetIdx = 0;
            const viewportHeight = window.innerHeight;
            for (let i = 0; i < this.ttsParagraphs.length; i++) {
                const rect = this.ttsParagraphs[i].getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < viewportHeight) {
                    targetIdx = i;
                    break;
                }
            }
            this.ttsCurrentIndex = targetIdx;
        }
`;

    if (file.includes('const rect = this.ttsParagraphs[i].element.getBoundingClientRect();')) {
        // We need to use regex or string replacement to carefully remove the duplicate targetIdx block
        // In EpubViewerUI, it's right before: if (this.ttsCurrentIndex >= this.ttsParagraphs.length)
        file = file.replace(/if\s*\(\s*this\.ttsParagraphs\s*&&\s*this\.ttsParagraphs\.length\s*>\s*0\s*\)\s*\{\s*let\s+targetIdx\s*=\s*0;\s*const\s+viewportHeight\s*=\s*window\.innerHeight;\s*for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*this\.ttsParagraphs\.length;\s*i\+\+\s*\)\s*\{\s*const\s+rect\s*=\s*this\.ttsParagraphs\[i\]\.element\.getBoundingClientRect\(\);\s*if\s*\(\s*rect\.bottom\s*>\s*0\s*&&\s*rect\.top\s*<\s*viewportHeight\s*\)\s*\{\s*targetIdx\s*=\s*i;\s*break;\s*\}\s*\}\s*this\.ttsCurrentIndex\s*=\s*targetIdx;\s*\}/g, "");
    } else {
        // In LiveReaderUI
        file = file.replace(/if\s*\(\s*this\.ttsParagraphs\s*&&\s*this\.ttsParagraphs\.length\s*>\s*0\s*\)\s*\{\s*let\s+targetIdx\s*=\s*0;\s*const\s+viewportHeight\s*=\s*window\.innerHeight;\s*for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*this\.ttsParagraphs\.length;\s*i\+\+\s*\)\s*\{\s*const\s+rect\s*=\s*this\.ttsParagraphs\[i\]\.getBoundingClientRect\(\);\s*if\s*\(\s*rect\.bottom\s*>\s*0\s*&&\s*rect\.top\s*<\s*viewportHeight\s*\)\s*\{\s*targetIdx\s*=\s*i;\s*break;\s*\}\s*\}\s*this\.ttsCurrentIndex\s*=\s*targetIdx;\s*\}/g, "");
    }
    
    fs.writeFileSync(filename, file);
}

patchFile('plugin/js/EpubViewerUI.js');
patchFile('plugin/js/LiveReaderUI.js');

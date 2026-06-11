const fs = require('fs');

function patchFile(filename) {
    let file = fs.readFileSync(filename, 'utf8');
    
    // Replace window.speechSynthesis.speak(...) with a setTimeout
    file = file.replace(
        /window\.speechSynthesis\.speak\(this\.speechUtterance\);/g,
        "setTimeout(() => window.speechSynthesis.speak(this.speechUtterance), 50);"
    );
    
    fs.writeFileSync(filename, file);
}

patchFile('plugin/js/EpubViewerUI.js');
patchFile('plugin/js/LiveReaderUI.js');

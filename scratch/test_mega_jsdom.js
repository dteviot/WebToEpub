const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('scratch/test_mega_browser.html', 'utf8');
const script = fs.readFileSync('node_modules/megajs/dist/main.browser-umd.js', 'utf8');

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="output"></div><script>${script}</script><script>
    async function test() {
      const out = document.getElementById("output");
      try {
        const folder = mega.File.fromURL('https://mega.nz/folder/Ci4ETASB#KIFVuPI99P1Ytg0dxmtYlw');
        await folder.loadAttributes();
        out.innerHTML += "Folder loaded: " + folder.name + "<br>";
        out.innerHTML += "Children count: " + folder.children.length + "<br>";
        const child = folder.children[0];
        out.innerHTML += "First child: " + child.name + " (" + child.size + " bytes)<br>";
        
        console.log("JSDOM Output:", out.innerHTML);
      } catch (err) {
        console.error(err);
      }
    }
    test();
</script></body></html>`, { runScripts: "dangerously" });

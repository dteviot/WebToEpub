const fs = require('fs');

let file = fs.readFileSync('plugin/js/main.js', 'utf8');

const injection = `
        // Check for wpd.my direct EPUB download for Wattpad
        if (urls.length > 0 && urls[0].includes("wattpad.com")) {
            try {
                let storyIdMatch = urls[0].match(/wattpad\\.com\\/story\\/(\\d+)/) || urls[0].match(/wattpad\\.com\\/(\\d+)/);
                if (storyIdMatch && storyIdMatch[1]) {
                    let storyId = storyIdMatch[1];
                    let wpdUrl = \`https://wpd.my/download/\${storyId}?om=1&mode=story&format=epub\`;
                    let proxyUrl = (typeof HttpClient !== "undefined" && HttpClient.enableCorsProxy) ? \`https://proxy.rasad.workers.dev/?url=\${encodeURIComponent(wpdUrl)}\` : wpdUrl;
                    
                    let response = await fetch(proxyUrl, { method: "HEAD" });
                    if (response.ok && response.headers.get("content-type") && response.headers.get("content-type").includes("epub")) {
                        let blobRes = await fetch(proxyUrl);
                        let blob = await blobRes.blob();
                        let fileName = typeof Download !== "undefined" && typeof Download.CustomFilename === "function" ? Download.CustomFilename() : \`Wattpad-\${storyId}.epub\`;
                        if (typeof Download !== "undefined" && typeof Download.save === "function") {
                            await Download.save(blob, fileName, userPreferences.overwriteExisting.value, userPreferences.noDownloadPopup.value);
                            ChapterUrlsUI.resetDownloadStateImages();
                            setControlsEnabled(true);
                            return;
                        }
                    }
                }
            } catch (e) {
                console.warn("wpd.my direct download failed, falling back to parser", e);
            }
        }
`;

if (!file.includes('wpd.my/download')) {
    file = file.replace(
        /(async function fetchContentAndPackEpub\(\) \{\s*try\s*\{\s*let urls = ChapterUrlsUI\.getUrlsToFetch\(\);)/,
        "$1\n" + injection
    );
    fs.writeFileSync('plugin/js/main.js', file);
}

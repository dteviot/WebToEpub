const fs = require('fs');

async function testHttpReader() {
    // We will test if we can fetch range from huggingface
    const url = "https://huggingface.co/datasets/Amono5667/webtoepub-library/resolve/main/books/1715421516053.epub.txt";
    
    // fetch head
    const headResp = await fetch(url, { method: "HEAD" });
    console.log(`HEAD status: ${headResp.status}, Accept-Ranges: ${headResp.headers.get("accept-ranges")}, Content-Length: ${headResp.headers.get("content-length")}`);

    const rangeResp = await fetch(url, {
        headers: { "Range": "bytes=0-100" }
    });
    console.log(`Range status: ${rangeResp.status}, Content-Range: ${rangeResp.headers.get("content-range")}`);
}

testHttpReader().catch(console.error);

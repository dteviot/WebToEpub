import { File } from 'megajs';

async function test() {
  try {
    const folder = File.fromURL('https://mega.nz/folder/Ci4ETASB#KIFVuPI99P1Ytg0dxmtYlw');
    await folder.loadAttributes();
    console.log("Folder loaded:", folder.name);
    console.log("Children:", folder.children.length);
    const child = folder.children[0];
    console.log("-", child.name, child.size + " bytes");
    const stream = child.download();
    let bytes = 0;
    stream.on('data', chunk => bytes += chunk.length);
    stream.on('end', () => console.log("Downloaded bytes:", bytes));
  } catch (err) {
    console.error("Error:", err);
  }
}
test();

import { File } from 'megajs';

async function test() {
  try {
    const folder = File.fromURL('https://mega.nz/folder/Ci4ETASB#KIFVuPI99P1Ytg0dxmtYlw');
    await folder.loadAttributes();
    console.log("Folder loaded:", folder.name);
    console.log("Children:", folder.children.length);
    for (const child of folder.children) {
      console.log("-", child.name, child.directory ? "(dir)" : child.size + " bytes");
      if (!child.directory) {
          console.log("  URL:", await child.link());
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
test();

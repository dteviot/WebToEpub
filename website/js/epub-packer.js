// EPUB Packer adapted from WebToEpub
class EpubPacker {
    constructor(metaInfo) {
        this.metaInfo = metaInfo;
        this.version = '3.0';
    }

    async assemble(chapters) {
        const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/epub+zip'));
        
        // Add required EPUB files
        await this.addRequiredFiles(zipWriter);
        
        // Add content files
        await this.addContentFiles(zipWriter, chapters);
        
        // Add manifest and navigation
        await this.addManifest(zipWriter, chapters);
        await this.addNavigation(zipWriter, chapters);
        
        // Add stylesheet
        await this.addStylesheet(zipWriter);
        
        return await zipWriter.close();
    }

    async addRequiredFiles(zipWriter) {
        // mimetype (must be first, uncompressed)
        await zipWriter.add('mimetype', new zip.TextReader('application/epub+zip'), {
            level: 0
        });
        
        // container.xml
        const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
        
        await zipWriter.add('META-INF/container.xml', new zip.TextReader(containerXml));
    }

    async addContentFiles(zipWriter, chapters) {
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const filename = `OEBPS/Text/Chapter${String(i + 1).padStart(3, '0')}.xhtml`;
            const content = this.createChapterXhtml(chapter, i + 1);
            await zipWriter.add(filename, new zip.TextReader(content));
        }
    }

    createChapterXhtml(chapter, chapterNum) {
        const title = chapter.title || `Chapter ${chapterNum}`;
        const content = chapter.content || '<p>Content not available</p>';
        
        return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${this.escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="../Styles/stylesheet.css"/>
</head>
<body>
    <h1>${this.escapeXml(title)}</h1>
    ${content}
</body>
</html>`;
    }

    async addManifest(zipWriter, chapters) {
        const manifestXml = this.createManifest(chapters);
        await zipWriter.add('OEBPS/content.opf', new zip.TextReader(manifestXml));
    }

    createManifest(chapters) {
        const now = new Date().toISOString();
        
        let manifest = `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="BookId">${this.escapeXml(this.metaInfo.uuid)}</dc:identifier>
        <dc:title>${this.escapeXml(this.metaInfo.title)}</dc:title>
        <dc:creator>${this.escapeXml(this.metaInfo.author)}</dc:creator>
        <dc:language>${this.metaInfo.language}</dc:language>
        <dc:date>${now}</dc:date>
        <meta property="dcterms:modified">${now}</meta>
    </metadata>
    <manifest>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="stylesheet" href="Styles/stylesheet.css" media-type="text/css"/>`;

        // Add chapter items
        for (let i = 0; i < chapters.length; i++) {
            const chapterNum = String(i + 1).padStart(3, '0');
            manifest += `
        <item id="chapter${chapterNum}" href="Text/Chapter${chapterNum}.xhtml" media-type="application/xhtml+xml"/>`;
        }

        manifest += `
    </manifest>
    <spine>`;

        // Add spine items
        for (let i = 0; i < chapters.length; i++) {
            const chapterNum = String(i + 1).padStart(3, '0');
            manifest += `
        <itemref idref="chapter${chapterNum}"/>`;
        }

        manifest += `
    </spine>
</package>`;

        return manifest;
    }

    async addNavigation(zipWriter, chapters) {
        const navXhtml = this.createNavigation(chapters);
        await zipWriter.add('OEBPS/nav.xhtml', new zip.TextReader(navXhtml));
    }

    createNavigation(chapters) {
        let nav = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Table of Contents</title>
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1>Table of Contents</h1>
        <ol>`;

        for (let i = 0; i < chapters.length; i++) {
            const chapterNum = String(i + 1).padStart(3, '0');
            const title = chapters[i].title || `Chapter ${i + 1}`;
            nav += `
            <li><a href="Text/Chapter${chapterNum}.xhtml">${this.escapeXml(title)}</a></li>`;
        }

        nav += `
        </ol>
    </nav>
</body>
</html>`;

        return nav;
    }

    async addStylesheet(zipWriter) {
        const css = `
body {
    font-family: Georgia, serif;
    line-height: 1.6;
    margin: 1em;
    color: #333;
}

h1, h2, h3, h4, h5, h6 {
    color: #2c3e50;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

h1 {
    font-size: 1.8em;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.3em;
}

p {
    margin: 1em 0;
    text-align: justify;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
}

blockquote {
    margin: 1em 2em;
    padding: 0.5em 1em;
    border-left: 4px solid #3498db;
    background-color: #f8f9fa;
    font-style: italic;
}

code {
    background-color: #f1f2f6;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
}

pre {
    background-color: #f1f2f6;
    padding: 1em;
    border-radius: 5px;
    overflow-x: auto;
}

a {
    color: #3498db;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}
`;
        
        await zipWriter.add('OEBPS/Styles/stylesheet.css', new zip.TextReader(css));
    }

    escapeXml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// Export for use in other modules
window.EpubPacker = EpubPacker;
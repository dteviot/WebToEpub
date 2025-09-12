// Enhanced EPUB Packer using WebToEpub extension logic
class EnhancedEpubPacker {
    constructor(metaInfo) {
        this.metaInfo = metaInfo;
        this.version = '3.0';
    }

    async assemble(chapters) {
        const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/epub+zip'));
        
        // Add required EPUB files
        await this.addRequiredFiles(zipWriter);
        
        // Process and add content files
        const processedChapters = await this.processChapters(chapters);
        await this.addContentFiles(zipWriter, processedChapters);
        
        // Add manifest and navigation
        await this.addManifest(zipWriter, processedChapters);
        await this.addNavigation(zipWriter, processedChapters);
        
        // Add stylesheet
        await this.addStylesheet(zipWriter);
        
        return await zipWriter.close();
    }

    async processChapters(chapters) {
        const processed = [];
        
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            
            // Create a temporary DOM for processing
            const tempDoc = document.implementation.createHTMLDocument('');
            const tempDiv = tempDoc.createElement('div');
            tempDiv.innerHTML = chapter.content || '<p>Content not available</p>';
            
            // Apply extension's content processing
            this.processChapterContent(tempDiv);
            
            processed.push({
                title: chapter.title || `Chapter ${i + 1}`,
                content: tempDiv.innerHTML,
                sourceUrl: chapter.sourceUrl
            });
        }
        
        return processed;
    }

    processChapterContent(element) {
        // Apply the same processing as the extension
        util.removeScriptableElements(element);
        util.removeComments(element);
        util.removeChildElementsMatchingSelector(element, "noscript, input");
        util.removeUnwantedWordpressElements(element);
        util.removeShareLinkElements(element);
        
        // Remove unwanted elements
        const unwanted = element.querySelectorAll(
            'nav, header, footer, aside, .navigation, .nav, .menu, ' +
            '.sidebar, .ads, .advertisement, .social-share, .comments, ' +
            '.comment-section, .related-posts'
        );
        util.removeElements(unwanted);
        
        // Apply XHTML preparation
        util.prepForConvertToXhtml(element);
        util.removeEmptyAttributes(element);
        util.removeSpansWithNoAttributes(element);
        util.removeEmptyDivElements(element);
        util.removeTrailingWhiteSpace(element);
        util.removeLeadingWhiteSpace(element);
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
        const title = this.escapeXml(chapter.title || `Chapter ${chapterNum}`);
        const content = chapter.content || '<p>Content not available</p>';
        
        return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="../Styles/stylesheet.css"/>
</head>
<body>
    <h1>${title}</h1>
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
        <dc:identifier id="BookId">${this.escapeXml(this.metaInfo.uuid || this.metaInfo.url)}</dc:identifier>
        <dc:title>${this.escapeXml(this.metaInfo.title)}</dc:title>
        <dc:creator>${this.escapeXml(this.metaInfo.author)}</dc:creator>
        <dc:language>${this.metaInfo.language}</dc:language>
        <dc:date>${now}</dc:date>
        <meta property="dcterms:modified">${now}</meta>`;

        // Add optional metadata
        if (this.metaInfo.subject) {
            manifest += `\n        <dc:subject>${this.escapeXml(this.metaInfo.subject)}</dc:subject>`;
        }
        
        if (this.metaInfo.description) {
            manifest += `\n        <dc:description>${this.escapeXml(this.metaInfo.description)}</dc:description>`;
        }

        // Add series information if available
        if (this.metaInfo.seriesName) {
            manifest += `\n        <meta name="calibre:series" content="${this.escapeXml(this.metaInfo.seriesName)}"/>`;
            if (this.metaInfo.seriesIndex) {
                manifest += `\n        <meta name="calibre:series_index" content="${this.escapeXml(this.metaInfo.seriesIndex)}"/>`;
            }
        }

        manifest += `
    </metadata>
    <manifest>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="stylesheet" href="Styles/stylesheet.css" media-type="text/css"/>`;

        // Add chapter items
        for (let i = 0; i < chapters.length; i++) {
            const chapterNum = String(i + 1).padStart(3, '0');
            manifest += `\n        <item id="chapter${chapterNum}" href="Text/Chapter${chapterNum}.xhtml" media-type="application/xhtml+xml"/>`;
        }

        manifest += `
    </manifest>
    <spine>`;

        // Add spine items
        for (let i = 0; i < chapters.length; i++) {
            const chapterNum = String(i + 1).padStart(3, '0');
            manifest += `\n        <itemref idref="chapter${chapterNum}"/>`;
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
    <link rel="stylesheet" type="text/css" href="Styles/stylesheet.css"/>
</head>
<body>
    <nav epub:type="toc" id="toc">
        <h1>Table of Contents</h1>
        <ol>`;

        for (let i = 0; i < chapters.length; i++) {
            const chapterNum = String(i + 1).padStart(3, '0');
            const title = chapters[i].title || `Chapter ${i + 1}`;
            nav += `\n            <li><a href="Text/Chapter${chapterNum}.xhtml">${this.escapeXml(title)}</a></li>`;
        }

        nav += `
        </ol>
    </nav>
</body>
</html>`;

        return nav;
    }

    async addStylesheet(zipWriter) {
        // Use custom stylesheet if provided, otherwise use default
        const css = this.metaInfo.styleSheet || this.getDefaultStylesheet();
        await zipWriter.add('OEBPS/Styles/stylesheet.css', new zip.TextReader(css));
    }

    getDefaultStylesheet() {
        return `
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

.webToEpub-author-note {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 0.75em;
    margin: 1em 0;
}

.webToEpub-author-note:before {
    content: "Author's Note: ";
    font-weight: bold;
}
`;
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
window.EnhancedEpubPacker = EnhancedEpubPacker;
// Enhanced parser system using WebToEpub extension logic
class EnhancedBaseParser {
    constructor() {
        this.minimumThrottle = 2000;
    }

    async getChapterUrls(dom) {
        // Use the same logic as the extension's default parser
        return Promise.resolve(util.hyperlinksToChapterList(dom.body));
    }

    // Add method to check if this parser can handle a URL
    canHandle(url) {
        return false; // Base parser doesn't handle any specific sites
    }

    findContent(dom) {
        // Try common content selectors
        const selectors = [
            'article', '.content', '.post-content', '.entry-content',
            '.chapter-content', '.story-content', 'main', '#content',
            '.main-content', '.text-content', '.chapter-text',
            '.chapter-body', '.post-body', '.entry-body'
        ];
        
        for (const selector of selectors) {
            const element = dom.querySelector(selector);
            if (element && this.hasSignificantContent(element)) {
                return this.processContent(element.cloneNode(true));
            }
        }
        
        // Fallback to body
        return this.processContent(dom.body.cloneNode(true));
    }

    hasSignificantContent(element) {
        const text = element.textContent.trim();
        return text.length > 200 && !this.isNavigationElement(element);
    }

    isNavigationElement(element) {
        const navClasses = ['nav', 'navigation', 'menu', 'sidebar', 'header', 'footer'];
        const className = element.className.toLowerCase();
        return navClasses.some(cls => className.includes(cls));
    }

    processContent(element) {
        // Apply the same content processing as the extension
        this.removeUnwantedElementsFromContentElement(element);
        util.prepForConvertToXhtml(element);
        util.removeEmptyAttributes(element);
        util.removeSpansWithNoAttributes(element);
        util.removeEmptyDivElements(element);
        util.removeTrailingWhiteSpace(element);
        util.removeLeadingWhiteSpace(element);
        
        return element;
    }

    removeUnwantedElementsFromContentElement(element) {
        // Use extension's cleaning logic
        util.removeScriptableElements(element);
        util.removeComments(element);
        util.removeChildElementsMatchingSelector(element, "noscript, input");
        util.removeUnwantedWordpressElements(element);
        util.removeShareLinkElements(element);
        
        // Remove additional unwanted elements
        const unwanted = element.querySelectorAll(
            'nav, header, footer, aside, .navigation, .nav, .menu, ' +
            '.sidebar, .ads, .advertisement, .social-share, .comments, ' +
            '.comment-section, .related-posts'
        );
        util.removeElements(unwanted);
    }

    extractTitle(dom) {
        // Try various title sources in order of preference
        const titleSources = [
            () => dom.querySelector('meta[property="og:title"]')?.getAttribute('content'),
            () => dom.querySelector('h1')?.textContent,
            () => dom.querySelector('.title')?.textContent,
            () => dom.querySelector('.story-title')?.textContent,
            () => dom.title
        ];

        for (const source of titleSources) {
            try {
                const title = source();
                if (title && title.trim()) {
                    return title.trim();
                }
            } catch (e) {
                continue;
            }
        }
        
        return 'Untitled Story';
    }

    extractAuthor(dom) {
        const authorSources = [
            () => dom.querySelector('meta[name="author"]')?.getAttribute('content'),
            () => dom.querySelector('.author')?.textContent,
            () => dom.querySelector('.story-author')?.textContent,
            () => dom.querySelector('[rel="author"]')?.textContent
        ];

        for (const source of authorSources) {
            try {
                const author = source();
                if (author && author.trim()) {
                    return author.trim();
                }
            } catch (e) {
                continue;
            }
        }
        
        return 'Unknown Author';
    }

    extractLanguage(dom) {
        // Try jetpack tag first
        let locale = dom.querySelector('meta[property="og:locale"]');
        if (locale !== null) {
            return locale.getAttribute('content');
        }

        // Try <html>'s lang attribute
        locale = dom.querySelector('html').getAttribute('lang');
        return (locale === null) ? 'en' : locale;
    }

    findCoverImageUrl(dom) {
        const imageSources = [
            () => dom.querySelector('meta[property="og:image"]')?.getAttribute('content'),
            () => dom.querySelector('.cover-image img')?.src,
            () => dom.querySelector('.story-cover img')?.src,
            () => dom.querySelector('img[alt*="cover" i]')?.src,
            () => dom.querySelector('img')?.src
        ];

        for (const source of imageSources) {
            try {
                const url = source();
                if (url) {
                    return new URL(url, dom.baseURI).href;
                }
            } catch (e) {
                continue;
            }
        }
        
        return null;
    }

    findChapterTitle(dom) {
        // Try to find chapter title
        const titleElements = dom.querySelectorAll('h1, h2, h3, .chapter-title, .title');
        for (const element of titleElements) {
            const text = element.textContent.trim();
            if (text && text.length > 0 && text.length < 200) {
                return text;
            }
        }
        return null;
    }
}

// Site-specific parsers using extension logic
class EnhancedRoyalRoadParser extends EnhancedBaseParser {
    canHandle(url) {
        return url.includes('royalroad.com') || url.includes('royalroadl.com');
    }

    async getChapterUrls(dom) {
        const chapters = [];
        
        // Try table of contents first (same as extension)
        const table = dom.querySelector("table#chapters");
        if (table) {
            return util.hyperlinksToChapterList(table);
        }
        
        // Fallback to any chapter links
        const chapterLinks = dom.querySelectorAll('a[href*="/chapter/"]');
        chapterLinks.forEach(link => {
            const title = link.textContent.trim();
            if (title && !title.toLowerCase().includes('next') && !title.toLowerCase().includes('previous')) {
                chapters.push({
                    sourceUrl: new URL(link.getAttribute('href'), dom.baseURI).href,
                    title: title,
                    isIncludeable: true
                });
            }
        });
        
        return this.deduplicateChapters(chapters);
    }

    deduplicateChapters(chapters) {
        const seen = new Set();
        return chapters.filter(chapter => {
            if (seen.has(chapter.sourceUrl)) return false;
            seen.add(chapter.sourceUrl);
            return true;
        });
    }

    findContent(dom) {
        // Use extension's logic for RoyalRoad
        let content = dom.querySelector('div.portlet-body');
        if (content && content.querySelector('div.chapter-inner')) {
            return this.processContent(content.cloneNode(true));
        }
        
        content = dom.querySelector('.page-content-wrapper');
        if (content) {
            return this.processContent(content.cloneNode(true));
        }
        
        return super.findContent(dom);
    }

    removeUnwantedElementsFromContentElement(content) {
        // Only keep the <div class="chapter-inner" elements of content
        for (let i = content.childElementCount - 1; 0 <= i; --i) {
            let child = content.children[i];
            if (!this.isWantedElement(child)) {
                child.remove();
            }
        }
        
        super.removeUnwantedElementsFromContentElement(content);
    }

    isWantedElement(element) {
        let tagName = element.tagName.toLowerCase();
        let className = element.className;
        return (tagName === "h1") || 
            ((tagName === "div") && 
                (className.startsWith("chapter-inner") ||
                className.includes("author-note-portlet") ||
                className.includes("page-content"))
            );
    }

    extractTitle(dom) {
        return dom.querySelector("div.fic-header div.col h1")?.textContent?.trim() || 
               super.extractTitle(dom);
    }

    extractAuthor(dom) {
        return dom.querySelector("div.fic-header h4 span a")?.textContent?.trim() || 
               super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("img.thumbnail")?.src || super.findCoverImageUrl(dom);
    }
}

class EnhancedArchiveOfOurOwnParser extends EnhancedBaseParser {
    canHandle(url) {
        return url.includes('archiveofourown.org');
    }

    async getChapterUrls(dom) {
        const chapters = [];
        
        // Multi-chapter work
        const chapterSelect = dom.querySelector('#selected_id');
        if (chapterSelect) {
            const options = chapterSelect.querySelectorAll('option');
            options.forEach(option => {
                if (option.value && option.value !== '0') {
                    const workId = this.extractWorkId(dom.baseURI);
                    chapters.push({
                        sourceUrl: `https://archiveofourown.org/works/${workId}/chapters/${option.value}`,
                        title: option.textContent.trim(),
                        isIncludeable: true
                    });
                }
            });
        } else {
            // Single chapter work
            chapters.push({
                sourceUrl: dom.baseURI,
                title: this.extractTitle(dom),
                isIncludeable: true
            });
        }
        
        return chapters;
    }

    extractWorkId(url) {
        const match = url.match(/works\/(\d+)/);
        return match ? match[1] : null;
    }

    findContent(dom) {
        const content = dom.querySelector('#workskin') || dom.querySelector('.userstuff');
        if (content) {
            return this.processContent(content.cloneNode(true));
        }
        return super.findContent(dom);
    }

    extractTitle(dom) {
        return dom.querySelector('h2.title')?.textContent?.trim() || 
               dom.querySelector('.title a')?.textContent?.trim() ||
               super.extractTitle(dom);
    }

    extractAuthor(dom) {
        return dom.querySelector('a[rel="author"]')?.textContent?.trim() || 
               dom.querySelector('.byline a')?.textContent?.trim() ||
               super.extractAuthor(dom);
    }
}

// Default parser for unknown sites
class EnhancedDefaultParser extends EnhancedBaseParser {
    canHandle(url) {
        return true; // Always can handle as fallback
    }

    async getChapterUrls(dom) {
        // Use extension's default logic
        return util.hyperlinksToChapterList(dom.body);
    }

    findContent(dom) {
        // Try to find content using common selectors
        const selectors = [
            'article', '.content', '.post-content', '.entry-content',
            '.chapter-content', '.story-content', 'main', '#content',
            '.main-content', '.text-content'
        ];
        
        for (const selector of selectors) {
            const element = dom.querySelector(selector);
            if (element && this.hasSignificantContent(element)) {
                return this.processContent(element.cloneNode(true));
            }
        }
        
        // Fallback to body with more aggressive filtering
        const body = dom.body.cloneNode(true);
        
        // Remove obvious navigation and non-content elements
        const unwanted = body.querySelectorAll(
            'nav, header, footer, aside, .navigation, .nav, .menu, ' +
            '.sidebar, .ads, .advertisement, .social-share, .comments'
        );
        util.removeElements(unwanted);
        
        return this.processContent(body);
    }
}

// Enhanced Parser Factory
class EnhancedParserFactory {
    constructor() {
        this.parsers = [
            new EnhancedRoyalRoadParser(),
            new EnhancedArchiveOfOurOwnParser()
        ];
        this.defaultParser = new EnhancedDefaultParser();
    }

    getParser(url, dom) {
        for (const parser of this.parsers) {
            if (parser.canHandle && parser.canHandle(url)) {
                return parser;
            }
        }
        return this.defaultParser;
    }
}

// Global instance
window.enhancedParserFactory = new EnhancedParserFactory();
// Production parser system adapted from WebToEpub
class BaseParser {
    constructor() {
        this.minimumThrottle = 2000;
    }

    async getChapterUrls(dom) {
        const links = Array.from(dom.querySelectorAll('a[href]'));
        const chapters = [];
        const baseUrl = dom.baseURI || dom.URL;
        
        for (const link of links) {
            const href = this.resolveUrl(link.getAttribute('href'), baseUrl);
            const text = link.textContent.trim();
            
            if (this.isLikelyChapterLink(href, text)) {
                chapters.push({
                    sourceUrl: href,
                    title: text || `Chapter ${chapters.length + 1}`,
                    isIncludeable: true
                });
            }
        }
        
        return this.deduplicateChapters(chapters);
    }

    resolveUrl(href, baseUrl) {
        try {
            return new URL(href, baseUrl).href;
        } catch {
            return href;
        }
    }

    deduplicateChapters(chapters) {
        const seen = new Set();
        return chapters.filter(chapter => {
            if (seen.has(chapter.sourceUrl)) return false;
            seen.add(chapter.sourceUrl);
            return true;
        });
    }

    isLikelyChapterLink(href, text) {
        const chapterPatterns = [
            /chapter/i,
            /ch\s*\d+/i,
            /episode/i,
            /part/i,
            /\d+/
        ];
        
        const textMatch = chapterPatterns.some(pattern => pattern.test(text));
        const hrefMatch = chapterPatterns.some(pattern => pattern.test(href));
        
        return textMatch || hrefMatch;
    }

    findContent(dom) {
        const selectors = [
            'article', '.content', '.post-content', '.entry-content',
            '.chapter-content', '.story-content', 'main', '#content',
            '.main-content', '.text-content', '.chapter-text',
            '.chapter-body', '.post-body', '.entry-body'
        ];
        
        for (const selector of selectors) {
            const element = dom.querySelector(selector);
            if (element && this.hasSignificantContent(element)) {
                return this.cleanContent(element.cloneNode(true));
            }
        }
        
        return this.cleanContent(dom.body.cloneNode(true));
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

    cleanContent(element) {
        const unwanted = element.querySelectorAll(
            'script, noscript, style, nav, header, footer, aside, ' +
            '.navigation, .nav, .menu, .sidebar, .ads, .advertisement, ' +
            '.social-share, .comments, .comment-section, .related-posts'
        );
        unwanted.forEach(el => el.remove());
        return element;
    }

    extractTitle(dom) {
        // Try various title sources
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
        return dom.documentElement.lang || 'en';
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
}

// Site-specific parsers
class RoyalRoadParser extends BaseParser {
    canHandle(url) {
        return url.includes('royalroad.com');
    }

    async getChapterUrls(dom) {
        const chapters = [];
        
        // Try table of contents first
        const tocLinks = dom.querySelectorAll('tbody tr td a[href*="/chapter/"]');
        if (tocLinks.length > 0) {
            tocLinks.forEach(link => {
                chapters.push({
                    sourceUrl: this.resolveUrl(link.getAttribute('href'), dom.baseURI),
                    title: link.textContent.trim(),
                    isIncludeable: true
                });
            });
        } else {
            // Fallback to any chapter links
            const chapterLinks = dom.querySelectorAll('a[href*="/chapter/"]');
            chapterLinks.forEach(link => {
                const title = link.textContent.trim();
                if (title && !title.toLowerCase().includes('next') && !title.toLowerCase().includes('previous')) {
                    chapters.push({
                        sourceUrl: this.resolveUrl(link.getAttribute('href'), dom.baseURI),
                        title: title,
                        isIncludeable: true
                    });
                }
            });
        }
        
        return this.deduplicateChapters(chapters);
    }

    findContent(dom) {
        const content = dom.querySelector('.chapter-content');
        if (content) {
            return this.cleanContent(content.cloneNode(true));
        }
        return super.findContent(dom);
    }

    extractTitle(dom) {
        return dom.querySelector('h1[property="name"]')?.textContent?.trim() || 
               dom.querySelector('h1.font-white')?.textContent?.trim() ||
               super.extractTitle(dom);
    }

    extractAuthor(dom) {
        return dom.querySelector('h4[property="author"] a')?.textContent?.trim() || 
               dom.querySelector('.author a')?.textContent?.trim() ||
               super.extractAuthor(dom);
    }
}

class ArchiveOfOurOwnParser extends BaseParser {
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
            return this.cleanContent(content.cloneNode(true));
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

// Parser Factory
class ParserFactory {
    constructor() {
        this.parsers = [
            new RoyalRoadParser(),
            new ArchiveOfOurOwnParser()
        ];
        this.defaultParser = new BaseParser();
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
window.parserFactory = new ParserFactory();
// Integration with WebToEpub extension parser system
class ExtensionParserIntegration {
    constructor() {
        this.initializeExtensionParsers();
    }

    initializeExtensionParsers() {
        // Create a mock parser factory that uses the extension's parser system
        this.createParserFactory();
        
        // Load the FreeWebNovel parser specifically
        this.loadFreeWebNovelParser();
    }

    createParserFactory() {
        // Create a simplified version of the extension's ParserFactory
        class WebsiteParserFactory {
            constructor() {
                this.parsers = new Map();
                this.defaultParser = null;
            }

            register(hostName, constructor) {
                const cleanHostName = this.stripLeadingWww(hostName);
                this.parsers.set(cleanHostName, constructor);
            }

            stripLeadingWww(hostName) {
                return hostName.startsWith("www.") ? hostName.substring(4) : hostName;
            }

            extractHostName(url) {
                return new URL(url).hostname;
            }

            fetch(url, dom) {
                const hostName = this.stripLeadingWww(this.extractHostName(url));
                const constructor = this.parsers.get(hostName);
                
                if (constructor) {
                    return constructor();
                }
                
                // Fallback to default parser
                return this.defaultParser || new DefaultWebsiteParser();
            }
        }

        window.parserFactory = new WebsiteParserFactory();
        
        // Set the default parser
        window.parserFactory.defaultParser = new DefaultWebsiteParser();
    }

    loadFreeWebNovelParser() {
        // Create the FreeWebNovel parser class
        class FreeWebNovelParser {
            constructor() {
                this.minimumThrottle = 1000;
            }

            async getChapterUrls(dom) {
                let menu = dom.querySelector("ul#idData");
                if (menu) {
                    return util.hyperlinksToChapterList(menu);
                }
                
                // Fallback to body search
                return util.hyperlinksToChapterList(dom.body);
            }

            extractTitle(dom) {
                const titleElement = dom.querySelector("h1.tit");
                return titleElement ? titleElement.textContent.trim() : null;
            }

            extractAuthor(dom) {
                const authorElement = dom.querySelector("[title=Author]");
                if (authorElement) {
                    const authorLink = authorElement.parentNode.querySelector("a");
                    return authorLink ? authorLink.textContent.trim() : null;
                }
                return null;
            }

            extractSubject(dom) {
                const genreElement = dom.querySelector("[title=Genre]");
                if (genreElement) {
                    const tags = [...genreElement.parentNode.querySelectorAll("a")];
                    return tags.map(e => e.textContent.trim()).join(", ");
                }
                return null;
            }

            findCoverImageUrl(dom) {
                return util.getFirstImgSrc(dom, "div.pic");
            }

            findChapterTitle(dom) {
                const titleElement = dom.querySelector("span.chapter");
                return titleElement ? titleElement.textContent.trim() : null;
            }

            findContent(dom) {
                const content = dom.querySelector("div.txt");
                if (content) {
                    return this.processContent(content.cloneNode(true));
                }
                return null;
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
        }

        // Register the parser
        window.parserFactory.register("freewebnovel.com", () => new FreeWebNovelParser());
        
        // Also register for other domains that use the same parser
        window.parserFactory.register("bednovel.com", () => new FreeWebNovelParser());
        window.parserFactory.register("innnovel.com", () => new FreeWebNovelParser());
        window.parserFactory.register("libread.com", () => new FreeWebNovelParser());
    }
}

// Default parser for unknown sites
class DefaultWebsiteParser {
    constructor() {
        this.minimumThrottle = 2000;
    }

    async getChapterUrls(dom) {
        return util.hyperlinksToChapterList(dom.body);
    }

    extractTitle(dom) {
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

    findChapterTitle(dom) {
        const titleElements = dom.querySelectorAll('h1, h2, h3, .chapter-title, .title');
        for (const element of titleElements) {
            const text = element.textContent.trim();
            if (text && text.length > 0 && text.length < 200) {
                return text;
            }
        }
        return null;
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
                return this.processContent(element.cloneNode(true));
            }
        }
        
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
        util.removeScriptableElements(element);
        util.removeComments(element);
        util.removeChildElementsMatchingSelector(element, "noscript, input");
        util.removeUnwantedWordpressElements(element);
        util.removeShareLinkElements(element);
        
        const unwanted = element.querySelectorAll(
            'nav, header, footer, aside, .navigation, .nav, .menu, ' +
            '.sidebar, .ads, .advertisement, .social-share, .comments, ' +
            '.comment-section, .related-posts'
        );
        util.removeElements(unwanted);
    }
}

// Initialize the integration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.extensionParserIntegration = new ExtensionParserIntegration();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading
} else {
    // DOM is already loaded
    window.extensionParserIntegration = new ExtensionParserIntegration();
}
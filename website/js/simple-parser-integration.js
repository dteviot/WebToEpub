// Simple parser integration for WebToEpub website
class SimpleParserFactory {
    constructor() {
        this.parsers = new Map();
        this.initializeParsers();
    }

    initializeParsers() {
        // FreeWebNovel parser
        this.parsers.set('freewebnovel.com', {
            async getChapterUrls(dom) {
                let menu = dom.querySelector("ul#idData");
                if (menu) {
                    return util.hyperlinksToChapterList(menu);
                }
                return util.hyperlinksToChapterList(dom.body);
            },

            extractTitle(dom) {
                const titleElement = dom.querySelector("h1.tit");
                return titleElement ? titleElement.textContent.trim() : null;
            },

            extractAuthor(dom) {
                const authorElement = dom.querySelector("[title=Author]");
                if (authorElement) {
                    const authorLink = authorElement.parentNode.querySelector("a");
                    return authorLink ? authorLink.textContent.trim() : null;
                }
                return null;
            },

            extractLanguage(dom) {
                let locale = dom.querySelector('meta[property="og:locale"]');
                if (locale !== null) {
                    return locale.getAttribute('content');
                }
                locale = dom.querySelector('html').getAttribute('lang');
                return (locale === null) ? 'en' : locale;
            },

            findCoverImageUrl(dom) {
                return util.getFirstImgSrc(dom, "div.pic");
            },

            findChapterTitle(dom) {
                const titleElement = dom.querySelector("span.chapter");
                return titleElement ? titleElement.textContent.trim() : null;
            },

            findContent(dom) {
                const content = dom.querySelector("div.txt");
                if (content) {
                    return this.processContent(content.cloneNode(true));
                }
                return null;
            },

            processContent(element) {
                // Apply basic content processing
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
                
                util.prepForConvertToXhtml(element);
                util.removeEmptyAttributes(element);
                util.removeSpansWithNoAttributes(element);
                util.removeEmptyDivElements(element);
                util.removeTrailingWhiteSpace(element);
                util.removeLeadingWhiteSpace(element);
                
                return element;
            }
        });

        // Default parser for unknown sites
        this.defaultParser = {
            async getChapterUrls(dom) {
                return util.hyperlinksToChapterList(dom.body);
            },

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
            },

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
            },

            extractLanguage(dom) {
                return dom.documentElement.lang || 'en';
            },

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
            },

            findChapterTitle(dom) {
                const titleElements = dom.querySelectorAll('h1, h2, h3, .chapter-title, .title');
                for (const element of titleElements) {
                    const text = element.textContent.trim();
                    if (text && text.length > 0 && text.length < 200) {
                        return text;
                    }
                }
                return null;
            },

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
            },

            hasSignificantContent(element) {
                const text = element.textContent.trim();
                return text.length > 200 && !this.isNavigationElement(element);
            },

            isNavigationElement(element) {
                const navClasses = ['nav', 'navigation', 'menu', 'sidebar', 'header', 'footer'];
                const className = element.className.toLowerCase();
                return navClasses.some(cls => className.includes(cls));
            },

            processContent(element) {
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
                
                util.prepForConvertToXhtml(element);
                util.removeEmptyAttributes(element);
                util.removeSpansWithNoAttributes(element);
                util.removeEmptyDivElements(element);
                util.removeTrailingWhiteSpace(element);
                util.removeLeadingWhiteSpace(element);
                
                return element;
            }
        };
    }

    getParser(url) {
        try {
            const hostname = new URL(url).hostname.replace(/^www\./, '');
            return this.parsers.get(hostname) || this.defaultParser;
        } catch (error) {
            console.warn('Invalid URL:', url);
            return this.defaultParser;
        }
    }

    // Compatibility method for extension-style fetch
    fetch(url, dom) {
        return this.getParser(url);
    }
}

// Create global parser factory
window.parserFactory = new SimpleParserFactory();

// Export for use
window.SimpleParserFactory = SimpleParserFactory;
/*
  MagicWizardsParser.js v0.72
  
  Parser for Magic the Gathering fiction, found on:
  - mtgstory.com (redirect)
  - https://magic.wizards.com/en/story (2023-2024)
  - https://magic.wizards.com/en/articles/columns/magic-story (2014-2018)
  - Archive.org versions of the above
  - TODO: mtglore.com (redirects & mirrors)
  - TODO: https://magic.wizards.com/en/story (Q4 2018-2022)
  - TODO: Planeswalkers & Planes Databank
  - TODO: Featured story slider Q1 2018
  - UNTESTED: http://www.wizards.com/Magic/Magazine/Article.aspx (2014 and earlier)
  - WONTFIX: hanweirchronicle.com (Tumblr blog, mostly image posts)
*/
"use strict";

// Register the parser for magic.wizards.com (archive.org is implicit)
parserFactory.register("magic.wizards.com", () => new MagicWizardsParser());

class MagicWizardsParser extends Parser {
    constructor() {
        super();
    }

    // Extract the list of chapter URLs
    async getChapterUrls(dom) {
        let chapterLinks = [];
        chapterLinks = [...dom.querySelectorAll("article a, .article-content a, window.location.hostname, #content article a, #content .article-content a, .articles-listing .article-item a, .articles-bloc .article .details a")];
        // Filter out author links using their URL pattern
        chapterLinks = chapterLinks.filter(link => !this.isAuthorLink(link));
        return chapterLinks.map(this.linkToChapter);
    }

    // Helper function to detect if a link is an author link
    isAuthorLink(link) {
        const href = link.href;
        const authorPattern = /\/archive\?author=/;
        
        // Check if the link matches the author URL pattern or CSS selector
        return authorPattern.test(href);
    }

    // Format chapter links into a standardized structure
    linkToChapter(link) {
        const titleSelectors = [
            "h3",                     // First option: <h3> tag
            ".article-item .title",   // Second option: <p class="title">
            ".details .title"         // Third option: <p class="title" inside .details>
        ];
    
        let titleElement = null;
    
        // Iterate through the selectors and find the first matching element
        for (const selector of titleSelectors) {
            titleElement = link.closest("article")?.querySelector(selector) || 
                        link.closest(".article-item")?.querySelector(selector) || 
                        link.closest(".details")?.querySelector(selector);
            
            if (titleElement) {
                break; // Exit the loop if a title element is found
            }
        }
    
        // Fallback to the link text itself if no titleElement found (this handles simpler cases)
        let title = titleElement ? titleElement.textContent.trim() : link.textContent.trim();
    
        return {
            sourceUrl: link.href,
            title: title
        };
    }

    // Extract the content of the chapter
    findContent(dom) {
        return dom.querySelector("#content article, .article_detail #main-content article, #article-body article, #primary-area section, section article, section, .article_detail #main-content");
    }
   
    // Grab cover image
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".swiper-slide img, article img");
    }


}

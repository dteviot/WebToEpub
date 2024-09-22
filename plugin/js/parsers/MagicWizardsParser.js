/*
  parser for mtgstory.com (redirect)
*/
"use strict";

// Register the parser for magic.wizards.com (archive.org is implicit) TODO: mtglore.com
parserFactory.register("magic.wizards.com", () => new MagicWizardsParser());
//parserFactory.register("mtglore.com", () => new MagicWizardsParser());

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
        if (authorPattern.test(href)) {
            return true;
        } else {
            return false;
        }
    }

    // Format chapter links into a standardized structure
    linkToChapter(link) {
        let titleElement;
    
        // Try to find the <h3> tag inside the parent of the link (assuming link is inside <article>)
        titleElement = link.closest("article")?.querySelector("h3");
        
        // Fallback to the <p class="title"> if no <h3> is found
        if (!titleElement) {
            titleElement = link.closest(".article-item")?.querySelector(".title");
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

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
        if (window.location.hostname.includes("web.archive.org")) {
            // For archived versions, select the correct container within #content
            chapterLinks = [...dom.querySelectorAll("#content article a, #content .article-content a")];
        } else {
            // For live pages
            chapterLinks = [...dom.querySelectorAll("article a, .article-content a, window.location.hostname")];
        }
        
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
        titleElement = link.closest("article").querySelector("h3");
    
        // Fallback to the link text itself if no titleElement found (this handles simpler cases)
        let title = titleElement ? titleElement.textContent.trim() : link.textContent.trim();
    
        return {
            sourceUrl: link.href,
            title: title
        };
    }

    // Extract the content of the chapter
    findContent(dom) {
        if (window.location.hostname.includes("web.archive.org")) {
            // For archived pages, the content is often inside #content
            return dom.querySelector("#content article");
        } else {
            // For live pages
            return dom.querySelector("#article-body article, #primary-area section, section article, section");
        }
    }
    
findCoverImageUrl(dom) {
    // Try to find an image inside the '.swiper-slide' or inside an 'article'
    let imgElement = dom.querySelector(".swiper-slide img, article img");

    // If an image is found, return its 'src' attribute
    if (imgElement) {
        return imgElement.getAttribute("src");
    // Check if the URL starts with '//' (protocol-relative URL)
        if (imgSrc && imgSrc.startsWith("//")) {
            // Add 'https:' to the start of the URL
            imgSrc = "https:" + imgSrc;
        }
    }
    // Fallback if no image was found
    return null;
}


}

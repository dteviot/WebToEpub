/*
  Template to use to create a new parser
*/
"use strict";

parserFactory.registerUrlRule(
    url => /^https?:\/\/(www\.)?novelsworld\.org/.test(url),
    () => new NovelsWorldParser()
);


// Use one or more of these to specify when the parser is to be used
/*
// Use this function if site's host name is sufficient.  
// i.e. All pages are on same site, and use same format.
parserFactory.register("template.org", () => new TemplateParser());

// Use this function if site's URL is sufficient
parserFactory.registerUrlRule(
    url => TemplateParser.urlMeetsSelectionCriteria(url), 
    () => new TemplateParser()
);



// Use this if pages are on multiple sites, or host name isn't unique
parserFactory.registerRule(
    function(url, dom) {
        return TemplateParser.urlMeetsSelectionCriteria(url) ||
            TemplateParser.domMeetsSelectionCritera(dom); 
    }, 
    () => new TemplateParser()
);
*/

class NovelsWorldParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // 1. Gather all candidate links targeting the novel structure
        let links = [...dom.querySelectorAll("a[href*='/novel/']")];
        
        let uniqueUrls = new Set();
        let uniqueLinks = links.filter(link => {
            let titleText = link.textContent.trim();
            let lowerText = titleText.toLowerCase();
            
            // 2. Explicitly bypass navigational keywords
            if (lowerText.includes("start reading")) return false;
            if (link.href.endsWith("/novel/") || link.href.endsWith("/novel")) return false;
            
            // 3. TARGET GENUINE CHAPTERS: Ensure the link text contains a time signature 
            let hasTimeSignature = /\d+\s*(mo|d|h|y|m)\s+ago/i.test(titleText);
            
            // Catch Chapter 1 or Prologue even if it lacks a time signature string
            let isFirstChapter = lowerText.includes("chapter 1") || lowerText.includes("prologue") || lowerText.startsWith("ch. 1 ");
            
            if (!hasTimeSignature && !isFirstChapter) return false;

            // 4. Clean out duplicate instances
            if (uniqueUrls.has(link.href)) return false;
            uniqueUrls.add(link.href);
            return true;
        });

        // 5. Convert elements into the object format WebToEpub expects
        let chapterList = uniqueLinks.map(link => {
            let cleanTitle = link.textContent.trim();
            
            // Clean up the trailing time string ("27mo ago") from the final title
            cleanTitle = cleanTitle.replace(/\s*\d+\s*(mo|d|h|y|m)\s+ago$/i, "").trim();

            return {
                sourceUrl: link.href,
                title: cleanTitle
            };
        });

        // 6. REVERSE THE ARRAY: Flips the list so Chapter 1 is index 0 and Chapter 273 is at the end.
        // This perfectly aligns the data sequence with WebToEpub's range selection logic.
        return chapterList.reverse();
    }


    findContent(dom) {
        
        // Standard fallback if Next.js structural payload isn't found
        return dom.querySelector("div.max-w-none") || dom.querySelector("article") || dom.body;
    }

    extractChapterTitleAndContent(dom) {
        // 1. SECURITY / ERROR CHECK: Detect if the website served an error page instead of the chapter
        let pageTitle = dom.title || "";
        let bodyText = dom.body ? dom.body.textContent : "";
        
        if (pageTitle.includes("Chapter Not Found") || bodyText.includes("Chapter Not Found")) {
            // Throwing this specific error text tells WebToEpub to halt and ask the user to verify access
            throw new Error("WebToEpub was blocked by the website's error page or security wall.");
        }

        // 2. Locate the core layout density container
        const contentRoot =
            [...dom.querySelectorAll("div.max-w-none")]
                .sort((a, b) =>
                    b.querySelectorAll("p, div").length - a.querySelectorAll("p, div").length
                )[0] || dom.body;

        let title = "";
        const h1 = dom.querySelector("h1");
        if (h1 && /(chapter|ch\.)/i.test(h1.textContent)) {
            title = h1.textContent.trim();
        }

        let paragraphs = [...contentRoot.querySelectorAll("p")];
        if (paragraphs.length === 0) {
            paragraphs = [...contentRoot.children].filter(child => child.textContent.trim().length > 0);
        }

        if (!title && paragraphs.length && /(chapter|ch\.)/i.test(paragraphs[0].textContent)) {
            title = paragraphs.shift().textContent.trim(); 
        }

        const contentElement = document.createElement("div");
        
        for (const p of paragraphs) {
            const text = p.textContent.trim();
            if (!text || text.length < 2) continue; 
            if (/(previous chapter|next chapter|reading settings)/i.test(text)) continue;

            const clean = document.createElement("p");
            clean.textContent = text;   
            contentElement.appendChild(clean);
        }

        // 3. Fallback net to prevent the "No visible content" warning from popping up blindly
        if (contentElement.children.length === 0) {
            let clean = document.createElement("p");
            // Pull raw text from the root if standard element mapping failed completely
            clean.textContent = contentRoot.textContent.trim().substring(0, 500) + "... [Content extraction failed]";
            contentElement.appendChild(clean);
        }

        return { title: title || "Untitled Chapter", content: contentElement };
    }


}
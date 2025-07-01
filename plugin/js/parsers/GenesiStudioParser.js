/*
  Parses files on https://genesistudio.com
*/
"use strict";

parserFactory.register("genesistudio.com", () => new GenesiStudioParser());

class GenesiStudioParser extends Parser{
    constructor() {
        super();
        this.minimumThrottle = 2000;
    }
    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeChapterNumberRow").hidden = false; 
    }

    async getChapterUrls(dom) {
        let data = (await HttpClient.fetchJson(dom.baseURI + "/__data.json")).json;
        let tmpids = data.nodes[2].data[0].chapters;
        let freeids = data.nodes[2].data[data.nodes[2].data[tmpids].free];
        let paidids = data.nodes[2].data[data.nodes[2].data[tmpids].premium];

        let chapters = freeids.map(a => ({
            sourceUrl:  "https://genesistudio.com/viewer/"+data.nodes[2].data[data.nodes[2].data[a].id],
            title: document.getElementById("removeChapterNumberCheckbox").checked ? data.nodes[2].data[data.nodes[2].data[a].chapter_title]: "Chapter " + data.nodes[2].data[data.nodes[2].data[a].chapter_number]+ ": " + data.nodes[2].data[data.nodes[2].data[a].chapter_title],
            isIncludeable: true    
        }));

        let pchapters = paidids.map(a => ({
            sourceUrl:  "https://genesistudio.com/viewer/"+data.nodes[2].data[data.nodes[2].data[a].id],
            title: document.getElementById("removeChapterNumberCheckbox").checked ? data.nodes[2].data[data.nodes[2].data[a].chapter_title]: "Chapter " + data.nodes[2].data[data.nodes[2].data[a].chapter_number]+ ": " + data.nodes[2].data[data.nodes[2].data[a].chapter_title],
            isIncludeable: false    
        }));

        return chapters.concat(pchapters);
    }
    
    async loadEpubMetaInfo(dom){
        // eslint-disable-next-line
        let data = (await HttpClient.fetchJson(dom.baseURI + "/__data.json")).json;
        let tmpids = data.nodes[2].data[data.nodes[2].data[0].novel];
        this.title = data.nodes[2].data[tmpids.novel_title];
        this.author = data.nodes[2].data[tmpids.author];
        let genre = data.nodes[2].data[tmpids.genres];
        genre = genre.map(a => data.nodes[2].data[a]);
        this.tags = genre;
        this.description = data.nodes[2].data[tmpids.synopsis];
        this.img = data.nodes[2].data[tmpids.cover];
        return;
    }

    extractTitleImpl() {
        return this.title;
    }

    extractAuthor() {
        return this.author;
    }

    extractSubject() {
        let tags = this.tags;
        return tags.join(", ");
    }

    extractDescription() {
        return this.description.trim();
    }

    findCoverImageUrl() {
        return this.img;
    }

    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json = (await HttpClient.fetchJson(restUrl)).json;
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        return url + "/__data.json";
    }

    buildChapter(json, url) {
        // This creates the new document structure for the chapter.
        const newDoc = Parser.makeEmptyDocForContent(url);
        // The document we need to create elements in and import nodes to.
        const targetDocument = newDoc.content.ownerDocument;

        // --- Your working code to append main content ---
        const contentIndex = json.nodes[2].data[0].content;
        const contentHtml = json.nodes[2].data[contentIndex];
        const contentDom = new DOMParser().parseFromString(contentHtml, "text/html");

        for (const node of [...contentDom.body.childNodes]) {
            const importedNode = targetDocument.importNode(node, true);
            newDoc.content.appendChild(importedNode);
        }

        // --- New, Corrected Code to Append and Format Footnotes ---
        const footnoteIndex = json.nodes[2].data[0].footnotes;
        if (footnoteIndex) {
            const footnotesHtml = json.nodes[2].data[footnoteIndex];
            if (footnotesHtml && footnotesHtml.trim()) {
                // Add a horizontal line and a simple text header.
                const hr = targetDocument.createElement("hr");
                newDoc.content.appendChild(hr);
                const footnotesHeader = targetDocument.createElement("p");
                footnotesHeader.innerHTML = "<strong>Footnotes</strong>";
                newDoc.content.appendChild(footnotesHeader);

                // Parse footnotes into a temporary document to modify them.
                const footnotesDom = new DOMParser().parseFromString(footnotesHtml, "text/html");
                const footnotesList = footnotesDom.querySelector("ol");

                if (footnotesList) {
                    // Get all list items from the temporary document.
                    const listItems = footnotesList.querySelectorAll("li");

                    // Iterate through each list item and convert it into a paragraph
                    // to remove the automatic list numbering but keep the content.
                    listItems.forEach(li => {
                        // Create a new paragraph in the target document.
                        const p = targetDocument.createElement("p");
                        
                        // Set the paragraph's content to be the same as the list item's content.
                        // This preserves the <a href="...">...</a> tag and all other text/formatting.
                        p.innerHTML = li.innerHTML;
                        
                        // Append the new paragraph (which now acts as a footnote) to the chapter content.
                        newDoc.content.appendChild(p);
                    });
                }
            }
        }

        return newDoc.dom;
    }

    addTitleToContent(webPage, content) {
        let h2 = webPage.rawDom.createElement("h2");
        h2.innerText = webPage.title.trim();
        content.prepend(h2);
    }
    
    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }
}
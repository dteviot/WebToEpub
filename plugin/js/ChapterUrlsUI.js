"use strict";

/** Class that handles UI for selecting (chapter) URLs to fetch */
class ChapterUrlsUI {
    constructor(parser) {
        this.parser = parser;
    }

    connectButtonHandlers() {
        ChapterUrlsUI.getSelectAllUrlsButton().onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, true);
        ChapterUrlsUI.getUnselectAllUrlsButton().onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, false);
        ChapterUrlsUI.getEditChapterUrlsButton().onclick = this.setEditInputMode.bind(this);
        ChapterUrlsUI.getApplyChangesButton().onclick = this.setTableMode.bind(this);
    }

    populateChapterUrlsTable(chapters, userPreferences) {
        ChapterUrlsUI.clearChapterUrlsTable();
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        chapters.forEach(function (chapter) {
            let row = document.createElement("tr");
            ChapterUrlsUI.appendCheckBoxToRow(row, chapter);
            ChapterUrlsUI.appendInputTextToRow(row, chapter);
            chapter.stateColumn = ChapterUrlsUI.appendColumnDataToRow(row, "No");
            ChapterUrlsUI.appendColumnDataToRow(row, chapter.sourceUrl);
            linksTable.appendChild(row);
        });
        ChapterUrlsUI.resizeTitleColumnToFit(linksTable, userPreferences.alwaysOpenAsTab.value);
    }

    static clearChapterUrlsTable() {
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        while (linksTable.children.length > 1) {
            linksTable.removeChild(linksTable.children[linksTable.children.length - 1])
        }
    }

    /** 
    * @private
    */
    static getChapterUrlsTable() {
        return document.getElementById("chapterUrlsTable");
    }

    /** 
    * @private
    */
    static getSelectAllUrlsButton() {
        return document.getElementById("selectAllUrlsButton");
    }

    /** 
    * @private
    */
    static getUnselectAllUrlsButton() {
        return document.getElementById("unselectAllUrlsButton");
    }

    /** 
    * @private
    */
    static getEditChapterUrlsButton() {
        return document.getElementById("editChaptersUrlsButton");
    }

    /** 
    * @private
    */
    static getApplyChangesButton() {
        return document.getElementById("applyChangesButton");
    }

    /** 
    * @private
    */
    static getEditChaptersUrlsInput() {
        return document.getElementById("editChaptersUrlsInput");
    }

    /** 
    * @private
    */
    static setAllUrlsSelectState(select) {
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        for(let row of linksTable.children) {
            let input = util.getElement(row, "input", i => i.type === "checkbox");
            if ((input !== null) && (input.checked !== select)) {
                input.checked = select;
                input.onclick();
            }
        }
    }

    /** 
    * @private
    */
    static appendCheckBoxToRow(row, chapter) {
        let col = document.createElement("td");
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        chapter.isIncludeable = true;
        checkbox.checked = chapter.isIncludeable;
        checkbox.onclick = function() { chapter.isIncludeable = checkbox.checked; };
        col.appendChild(checkbox);
        row.appendChild(col);
    }

    /** 
    * @private
    */
    static appendInputTextToRow(row, chapter) {
        let col = document.createElement("td");
        let input = document.createElement("input");
        input.type = "text";
        input.value = chapter.title;
        input.className = "fullWidth";
        input.addEventListener("blur", function() { chapter.title = input.value; },  true);
        col.appendChild(input);
        row.appendChild(col);
    }

    /** @private */
    static resizeTitleColumnToFit(linksTable, openAsTab) {
        let inputs = util.getElements(linksTable, "input", i => i.type === "text"); 
        let width = inputs.reduce((acc, element) => Math.max(acc, element.value.length), 0);
        if (!openAsTab) {
            // if open as popup, don't allow column to be more than 1/2 window width
            width = Math.min(width, 40);
        }
        inputs.forEach(i => i.size = width); 
    }

    /** 
    * @private
    */
    static appendColumnDataToRow(row, textData) {
        let col = document.createElement("td");
        col.innerText = textData;
        col.style.whiteSpace = "nowrap";
        row.appendChild(col);
        return col;
    }

    /** 
    * @private
    */
    setVisibileUI(toTable) {
        // toggle mode
        ChapterUrlsUI.getEditChaptersUrlsInput().hidden = toTable;
        ChapterUrlsUI.getChapterUrlsTable().hidden = !toTable;
        document.getElementById("inputSection").hidden = !toTable;
        document.getElementById("coverUrlSection").hidden = !toTable;
        ChapterUrlsUI.getSelectAllUrlsButton().hidden = !toTable;
        ChapterUrlsUI.getUnselectAllUrlsButton().hidden = !toTable;
        ChapterUrlsUI.getEditChapterUrlsButton().hidden = !toTable;
        ChapterUrlsUI.getApplyChangesButton().hidden = toTable;
    }

    /** 
    * @private
    */
    setTableMode() {
        try {
            let chapters = this.htmlToChapters(ChapterUrlsUI.getEditChaptersUrlsInput().value);
            this.parser.chapters = chapters;
            this.populateChapterUrlsTable(chapters, UserPreferences.readFromLocalStorage());
            this.usingTable = true;
            this.setVisibileUI(this.usingTable);
        } catch (err) {
            window.showErrorMessage(err);
        }
    }

    /** 
    * @private
    */
    htmlToChapters(innerHtml) {
        let html = "<html><head><title></title><body>" + innerHtml + "</body></html>";
        let doc = new DOMParser().parseFromString(html, "text/html");
        let body = doc.getElementsByTagName("body")[0];
        return util.hyperlinksToChapterList(body);
    }

    /** 
    * @private
    */
    setEditInputMode() {
        this.usingTable = false;
        this.setVisibileUI(this.usingTable);
        let input = ChapterUrlsUI.getEditChaptersUrlsInput();
        input.rows = Math.max(this.parser.chapters.length, 20);
        input.value = this.chaptersToHTML(this.parser.chapters);
    }

    chaptersToHTML(chapters) {
        let doc = new DOMParser().parseFromString("<html><head><title></title><body></body></html>", "text/html");
        let body = doc.getElementsByTagName("body")[0];
        for(let chapter of chapters.filter(c => c.isIncludeable)) {
            body.appendChild(this.makeLink(doc, chapter));
            body.appendChild(doc.createTextNode("\r"));
        }
        return body.innerHTML;
    }

    makeLink(doc, chapter) {
        let link = doc.createElement("a");
        link.href = chapter.sourceUrl;
        link.appendChild(doc.createTextNode(chapter.title));
        return link;
    }
}

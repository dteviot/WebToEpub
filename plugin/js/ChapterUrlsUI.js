"use strict";

/** Class that handles UI for selecting (chapter) URLs to fetch */
class ChapterUrlsUI {
    constructor(parser) {
        this.parser = parser;
    }

    connectButtonHandlers() {
        ChapterUrlsUI.getSelectAllUrlsButton().onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, true);
        ChapterUrlsUI.getUnselectAllUrlsButton().onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, false);
        ChapterUrlsUI.getReverseChapterUrlsOrderButton().onclick = this.reverseUrls.bind(this);
        ChapterUrlsUI.getEditChapterUrlsButton().onclick = this.setEditInputMode.bind(this);
        ChapterUrlsUI.getApplyChangesButton().onclick = this.setTableMode.bind(this);
    }

    populateChapterUrlsTable(chapters) {
        ChapterUrlsUI.clearChapterUrlsTable();
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        chapters.forEach(function (chapter) {
            let row = document.createElement("tr");
            ChapterUrlsUI.appendCheckBoxToRow(row, chapter);
            ChapterUrlsUI.appendInputTextToRow(row, chapter);
            chapter.row = row;
            ChapterUrlsUI.appendColumnDataToRow(row, chapter.sourceUrl);
            linksTable.appendChild(row);
        });
        ChapterUrlsUI.resizeTitleColumnToFit(linksTable);
    }

    static showDownloadState(row, state) {
        if (row != null) {
            let img = row.querySelector("img");
            img.src = ChapterUrlsUI.ImageForState[state];
        }
    }

    static resetDownloadStateImages() {
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        let imgSrc = ChapterUrlsUI.ImageForState[ChapterUrlsUI.DOWNLOAD_STATE_NONE];
        for(let img of linksTable.querySelectorAll("img")) {
            img.src = imgSrc;
        }
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

    /**  @private */
    static getReverseChapterUrlsOrderButton() {
        return document.getElementById("reverseChapterUrlsOrderButton");
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
        for(let input of [...linksTable.querySelectorAll("input[type='checkbox']")]) {
            if (input.checked !== select) {
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
        ChapterUrlsUI.addImageToCheckBoxColumn(col);
        row.appendChild(col);
    }

    static addImageToCheckBoxColumn(col) {
        let img = document.createElement("img");
        img.className = "downloadState";
        img.src = ChapterUrlsUI.ImageForState[ChapterUrlsUI.DOWNLOAD_STATE_NONE];
        col.appendChild(img);
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
    static resizeTitleColumnToFit(linksTable) {
        let inputs = [...linksTable.querySelectorAll("input[type='text']")];
        let width = inputs.reduce((acc, element) => Math.max(acc, element.value.length), 0);
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
        ChapterUrlsUI.getReverseChapterUrlsOrderButton().hidden = !toTable;
        ChapterUrlsUI.getEditChapterUrlsButton().hidden = !toTable;
        ChapterUrlsUI.getApplyChangesButton().hidden = toTable;
    }

    /** 
    * @private
    */
    setTableMode() {
        try {
            let chapters = this.htmlToChapters(ChapterUrlsUI.getEditChaptersUrlsInput().value);
            this.parser.setPagesToFetch(chapters);
            this.populateChapterUrlsTable(chapters);
            this.usingTable = true;
            this.setVisibileUI(this.usingTable);
        } catch (err) {
            ErrorLog.showErrorMessage(err);
        }
    }

    /** @private */
    reverseUrls() {
        try {
            let chapters = [...this.parser.getPagesToFetch().values()];
            chapters.reverse();
            this.populateChapterUrlsTable(chapters);
            this.parser.setPagesToFetch(chapters);
        } catch (err) {
            ErrorLog.showErrorMessage(err);
        }
    }

    /** 
    * @private
    */
    htmlToChapters(innerHtml) {
        let html = "<html><head><title></title><body>" + innerHtml + "</body></html>";
        let doc = new DOMParser().parseFromString(html, "text/html");
        return util.hyperlinksToChapterList(doc.body);
    }

    /** 
    * @private
    */
    setEditInputMode() {
        this.usingTable = false;
        this.setVisibileUI(this.usingTable);
        let input = ChapterUrlsUI.getEditChaptersUrlsInput();
        input.rows = Math.max(this.parser.getPagesToFetch().size, 20);
        input.value = this.chaptersToHTML([...this.parser.getPagesToFetch().values()]);
    }

    chaptersToHTML(chapters) {
        let doc = new DOMParser().parseFromString("<html><head><title></title><body></body></html>", "text/html");
        for(let chapter of chapters.filter(c => c.isIncludeable)) {
            doc.body.appendChild(this.makeLink(doc, chapter));
            doc.body.appendChild(doc.createTextNode("\r"));
        }
        return doc.body.innerHTML;
    }

    makeLink(doc, chapter) {
        let link = doc.createElement("a");
        link.href = chapter.sourceUrl;
        link.appendChild(doc.createTextNode(chapter.title));
        return link;
    }
}

ChapterUrlsUI.DOWNLOAD_STATE_NONE = 0;
ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING = 1;
ChapterUrlsUI.DOWNLOAD_STATE_LOADED = 2;

ChapterUrlsUI.ImageForState = [
    "images/ChapterStateNone.svg",
    "images/ChapterStateDownloading.svg",
    "images/ChapterStateLoaded.svg"
];

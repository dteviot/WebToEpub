"use strict";

/** Class that handles UI for selecting (chapter) URLs to fetch */
class ChapterUrlsUI {
    constructor(parser) {
        this.parser = parser;
        ChapterUrlsUI.getPleaseWaitMessageRow().hidden = false;
    }

    connectButtonHandlers() {
        document.getElementById("selectAllUrlsButton").onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, true);
        document.getElementById("unselectAllUrlsButton").onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, false);
        document.getElementById("reverseChapterUrlsOrderButton").onclick = this.reverseUrls.bind(this);
        document.getElementById("editChaptersUrlsButton").onclick = this.setEditInputMode.bind(this);
        ChapterUrlsUI.getApplyChangesButton().onclick = this.setTableMode.bind(this);
        ChapterUrlsUI.getChapterUrlsTable().onmousedown = ChapterUrlsUI.onMouseDown;
    }

    populateChapterUrlsTable(chapters) {
        ChapterUrlsUI.getPleaseWaitMessageRow().hidden = true;
        ChapterUrlsUI.clearChapterUrlsTable();
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        let index = 0;
        let rangeStart = ChapterUrlsUI.getRangeStartChapterSelect();
        let rangeEnd = ChapterUrlsUI.getRangeEndChapterSelect();
        chapters.forEach(function (chapter) {
            let row = document.createElement("tr");
            ChapterUrlsUI.appendCheckBoxToRow(row, chapter);
            ChapterUrlsUI.appendInputTextToRow(row, chapter);
            chapter.row = row;
            ChapterUrlsUI.appendColumnDataToRow(row, chapter.sourceUrl);
            linksTable.appendChild(row);
            ChapterUrlsUI.appendOptionToSelect(rangeStart, index, chapter);
            ChapterUrlsUI.appendOptionToSelect(rangeEnd, index, chapter);
            ++index;
        });
        ChapterUrlsUI.setRangeOptionsToFirstAndLastChapters();
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
        util.removeElements(ChapterUrlsUI.getTableRowsWithChapters());
        util.removeElements([...ChapterUrlsUI.getRangeStartChapterSelect().options]);
        util.removeElements([...ChapterUrlsUI.getRangeEndChapterSelect().options]);
    }

    /** @private */
    static setRangeOptionsToFirstAndLastChapters()
    {
        var rangeStart = ChapterUrlsUI.getRangeStartChapterSelect();
        let rangeEnd = ChapterUrlsUI.getRangeEndChapterSelect();

        rangeStart.onchange = null;
        rangeEnd.onchange = null;
        
        rangeStart.selectedIndex = 0;
        rangeEnd.selectedIndex = rangeEnd.length - 1;
        ChapterUrlsUI.setChapterCount(rangeStart.selectedIndex, rangeEnd.selectedIndex);
        
        rangeStart.onchange = ChapterUrlsUI.onRangeChanged;
        rangeEnd.onchange = ChapterUrlsUI.onRangeChanged;
    }
 
    /** @private */
    static onRangeChanged() {
        let startIndex = parseInt(ChapterUrlsUI.getRangeStartChapterSelect().selectedIndex);
        let endIndex = parseInt(ChapterUrlsUI.getRangeEndChapterSelect().selectedIndex);
        let rowInRange = function(row) {
            let index = row.rowIndex;
            return (startIndex <= index) && (index <= endIndex);
        }

        for(let row of ChapterUrlsUI.getTableRowsWithChapters()) {
            let inRange = rowInRange(row);
            ChapterUrlsUI.setRowCheckboxState(row, rowInRange(row));
            row.hidden = !inRange;
        }
        ChapterUrlsUI.setChapterCount(startIndex, endIndex);
    }
    
    /** @private */
    static setChapterCount(startIndex, endIndex) {
        let count = Math.max(0, 1 + endIndex - startIndex);
        document.getElementById("spanChapterCount").textContent = count;
    }
    
    /** 
    * @private
    */
    static getChapterUrlsTable() {
        return document.getElementById("chapterUrlsTable");
    }

    /** @private */
    static getRangeStartChapterSelect() {
        return document.getElementById("selectRangeStartChapter");
    }

    /** @private */
    static getRangeEndChapterSelect() {
        return document.getElementById("selectRangeEndChapter");
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

    /** @private */
    static getPleaseWaitMessageRow() {
        return document.getElementById("findingChapterUrlsMessageRow");
    }

    /** @private */
    static setAllUrlsSelectState(select) {
        for(let row of ChapterUrlsUI.getTableRowsWithChapters()) {
            ChapterUrlsUI.setRowCheckboxState(row, select);
            row.hidden = false;
        }
        ChapterUrlsUI.setRangeOptionsToFirstAndLastChapters()
    }

    /** @private */
    static setRowCheckboxState(row, checked) {
        let input = row.querySelector("input[type='checkbox']");
        if (input.checked !== checked) {
            input.checked = checked;
            input.onclick();
        }
    }

    static getTableRowsWithChapters() {
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        return [...linksTable.querySelectorAll("tr")]
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

    static appendOptionToSelect(select, value, chapter) {
        select.add(new Option(chapter.sourceUrl, value));
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
        document.getElementById("chapterSelectControlsDiv").hidden = !toTable;
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

    /** @private */
    static onMouseDown(event) {
        let row = ChapterUrlsUI.getTargetRow(event.target);
        if (row === null) {
            return;
        }
        ChapterUrlsUI.tellUserAboutShiftClick(event, row);
        let oldState = row.querySelector("input[type='checkbox']").checked;
        if (event.shiftKey && (ChapterUrlsUI.lastSelectedRow !== null)) {
            let newState = !oldState;
            ChapterUrlsUI.updateRange(ChapterUrlsUI.lastSelectedRow, row.rowIndex, newState);
        } else {
            ChapterUrlsUI.lastSelectedRow = row.rowIndex;
        }
    }

    /** @private */
    static updateRange(startRowIndex, endRowIndex, state) {
        let direction = startRowIndex < endRowIndex ? 1 : -1;
        let linkTable = ChapterUrlsUI.getChapterUrlsTable();
        for(let rowIndex = startRowIndex; rowIndex != endRowIndex; rowIndex += direction) {
            let row = linkTable.rows[rowIndex];
            ChapterUrlsUI.setRowCheckboxState(row, state);
        }
    }

    /** @private */
    static getTargetRow(target) {
        while ((target.tagName.toLowerCase() !== "tr") && (target.parentElement !== null)) {
            target = target.parentElement;
        }
        return target;
    }

    /** @private */
    static tellUserAboutShiftClick(event, row) {
        if (event.shiftKey || (ChapterUrlsUI.lastSelectedRow === null)) {
            return;
        }
        let distance = Math.abs(row.rowIndex - ChapterUrlsUI.lastSelectedRow);
        if (distance !== 1) {
            ChapterUrlsUI.ConsecutiveRowClicks = 0;
            return;
        }
        ++ChapterUrlsUI.ConsecutiveRowClicks;
        if (ChapterUrlsUI.ConsecutiveRowClicks == 5) {
            alert(chrome.i18n.getMessage("__MSG_Shift_Click__"));
        }
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

ChapterUrlsUI.lastSelectedRow = null;
ChapterUrlsUI.ConsecutiveRowClicks = 0;

"use strict";

/** Class that handles UI for selecting (chapter) URLs to fetch */
class ChapterUrlsUI {
    constructor(parser) {
        this.parser = parser;
        ChapterUrlsUI.getPleaseWaitMessageRow().hidden = false;
        if (this.parser)
        {
            document.getElementById("spanParserName").textContent = this.parser.constructor.name;
            document.getElementById("spanDelayMs").textContent = `${this.parser.getRateLimit()} ms`;
        }
        document.getElementById("sbFiltersForm").onsubmit = function(event) { event.preventDefault(); };
    }

    connectButtonHandlers() {
        document.getElementById("selectAllUrlsButton").onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, true);
        document.getElementById("unselectAllUrlsButton").onclick = ChapterUrlsUI.setAllUrlsSelectState.bind(null, false);
        document.getElementById("reverseChapterUrlsOrderButton").onclick = this.reverseUrls.bind(this);
        document.getElementById("editChaptersUrlsButton").onclick = this.setEditInputMode.bind(this);
        document.getElementById("copyUrlsToClipboardButton").onclick = this.copyUrlsToClipboard.bind(this);
        document.getElementById("showChapterUrlsCheckbox").onclick = this.toggleShowUrlsForChapterRanges.bind(this);
        ChapterUrlsUI.modifyApplyChangesButtons(button => button.onclick = this.setTableMode.bind(this));
    }

    populateChapterUrlsTable(chapters) {
        ChapterUrlsUI.getPleaseWaitMessageRow().hidden = true;
        ChapterUrlsUI.clearChapterUrlsTable();
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        let index = 0;
        let rangeStart = ChapterUrlsUI.getRangeStartChapterSelect();
        let rangeEnd = ChapterUrlsUI.getRangeEndChapterSelect();
        let memberForTextOption = ChapterUrlsUI.textToShowInRange();
        chapters.forEach(function (chapter) {
            let row = document.createElement("tr");
            ChapterUrlsUI.appendCheckBoxToRow(row, chapter);
            ChapterUrlsUI.appendInputTextToRow(row, chapter);
            chapter.row = row;
            ChapterUrlsUI.appendColumnDataToRow(row, chapter.sourceUrl);
            linksTable.appendChild(row);
            ChapterUrlsUI.appendOptionToSelect(rangeStart, index, chapter, memberForTextOption);
            ChapterUrlsUI.appendOptionToSelect(rangeEnd, index, chapter, memberForTextOption);
            ++index;
        });
        ChapterUrlsUI.setRangeOptionsToFirstAndLastChapters();
        this.showHideChapterUrlsColumn();
        ChapterUrlsUI.resizeTitleColumnToFit(linksTable);
    }

    showTocProgress(chapters) {
        let linksTable = ChapterUrlsUI.getChapterUrlsTable();
        chapters.forEach(function (chapter) {
            let row = document.createElement("tr");
            linksTable.appendChild(row);
            row.appendChild(document.createElement("td"));
            let col = document.createElement("td");
            col.className = "disabled";
            col.appendChild(document.createTextNode(chapter.title));
            row.appendChild(col);
            row.appendChild(document.createElement("td"));
        });
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

    static limitNumOfChapterS(maxChapters) {
        let max = util.isNullOrEmpty(maxChapters) ? 10000 : parseInt(maxChapters.replace(",", ""));
        let selectedRows = [...ChapterUrlsUI.getChapterUrlsTable().querySelectorAll("[type='checkbox'")]
            .filter(c => c.checked)
            .map(c => c.parentElement.parentElement);
        if (max< selectedRows.length ) {
            let message = chrome.i18n.getMessage("__MSG_More_than_max_chapters_selected__", 
                [selectedRows.length, max]);
            if (confirm(message) === false) {
                for(let row of selectedRows.slice(max)) {
                    ChapterUrlsUI.setRowCheckboxState(row, false);
                }
            }
        }
    }

    /** @private */
    static setRangeOptionsToFirstAndLastChapters()
    {
        let rangeStart = ChapterUrlsUI.getRangeStartChapterSelect();
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
        let startIndex = ChapterUrlsUI.selectionToRowIndex(ChapterUrlsUI.getRangeStartChapterSelect());
        let endIndex = ChapterUrlsUI.selectionToRowIndex(ChapterUrlsUI.getRangeEndChapterSelect());
        let rc = new ChapterUrlsUI.RangeCalculator();

        for(let row of ChapterUrlsUI.getTableRowsWithChapters()) {
            let inRange = rc.rowInRange(row);
            ChapterUrlsUI.setRowCheckboxState(row, rc.rowInRange(row));
            row.hidden = !inRange;
        }
        ChapterUrlsUI.setChapterCount(startIndex, endIndex);
    }

    static selectionToRowIndex(selectElement) {
        let selectedIndex = selectElement.selectedIndex;
        return selectedIndex + 1;
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

    /** @private */
    static textToShowInRange() {
        return document.getElementById("showChapterUrlsCheckbox").checked
            ? "sourceUrl"
            : "title";
    }

    /** 
    * @private
    */
    static modifyApplyChangesButtons(mutator) {
        mutator(document.getElementById("applyChangesButton"));
        mutator(document.getElementById("applyChangesButton2"));
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
            .filter(r => r.querySelector("th") === null);
    }

    /** 
    * @private
    */
    static appendCheckBoxToRow(row, chapter) {
        let col = document.createElement("td");
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        if (chapter.isIncludeable === undefined) {
            chapter.isIncludeable = true;
        }
        checkbox.checked = chapter.isIncludeable;
        checkbox.onclick = function(event) { 
            chapter.isIncludeable = checkbox.checked; 
            if (event == undefined || event == null) {
                return;
            }
            ChapterUrlsUI.tellUserAboutShiftClick(event, row);
            if (checkbox !== null)
            {
                let oldState = checkbox.checked;
                if (event.shiftKey && (ChapterUrlsUI.lastSelectedRow !== null)) {
                    let newState = oldState;
                    ChapterUrlsUI.updateRange(ChapterUrlsUI.lastSelectedRow, row.rowIndex, newState);
                } else {
                    ChapterUrlsUI.lastSelectedRow = row.rowIndex;
                }
            }
        };
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

    static appendOptionToSelect(select, value, chapter, memberForTextOption) {
        let option = new Option(chapter[memberForTextOption], value);
        select.add(option);
    }

    /** @private */
    static resizeTitleColumnToFit(linksTable) {
        let inputs = [...linksTable.querySelectorAll("input[type='text']")];
        let width = inputs.reduce((acc, element) => Math.max(acc, element.value.length), 0);
        if (0 < width) {
            inputs.forEach(i => i.size = width); 
        }
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
    * @public
    */
    static setVisibileUI(toTable) {
        // toggle mode
        ChapterUrlsUI.getEditChaptersUrlsInput().hidden = toTable;
        ChapterUrlsUI.getChapterUrlsTable().hidden = !toTable;
        document.getElementById("inputSection").hidden = !toTable;
        document.getElementById("coverUrlSection").hidden = !toTable;
        document.getElementById("chapterSelectControlsDiv").hidden = !toTable;
        ChapterUrlsUI.modifyApplyChangesButtons(button => button.hidden = toTable);
        document.getElementById("editURLsHint").hidden = toTable;
    }

    /** 
    * @private
    */
    setTableMode() {
        try {
            let inputvalue = ChapterUrlsUI.getEditChaptersUrlsInput().value;
            let chapters;
            let lines = inputvalue.split("\n");
            lines = lines.filter(a => a.trim() != "").map(a => a.trim());
            if (URL.canParse(lines[0])) {
                chapters = this.URLsToChapters(lines);
            } else {
                chapters = this.htmlToChapters(inputvalue);
            }
            this.parser.setPagesToFetch(chapters);
            this.populateChapterUrlsTable(chapters);
            this.usingTable = true;
            ChapterUrlsUI.setVisibileUI(this.usingTable);
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
        return [...doc.body.querySelectorAll("a")].map(a => util.hyperLinkToChapter(a));
    }

    /** 
    * @private
    */
    URLsToChapters(URLs) {
        let returnchapters = URLs.map(e => ({
            sourceUrl: e,
            title: "[placeholder]"
        }));
        return returnchapters;
    }

    /** @private */
    copyUrlsToClipboard() {
        let text = this.chaptersToHTML([...this.parser.getPagesToFetch().values()]);
        navigator.clipboard.writeText(text);
    }

    /** @private */
    toggleShowUrlsForChapterRanges() {
        let chapters = [...this.parser.getPagesToFetch().values()];
        this.toggleShowUrlsForChapterRange(ChapterUrlsUI.getRangeStartChapterSelect(), chapters);
        this.toggleShowUrlsForChapterRange(ChapterUrlsUI.getRangeEndChapterSelect(), chapters);
        this.showHideChapterUrlsColumn();
    }
    
    showHideChapterUrlsColumn() {
        let hidden = !document.getElementById("showChapterUrlsCheckbox").checked;
        let table = ChapterUrlsUI.getChapterUrlsTable();
        for(let t of table.querySelectorAll("th:nth-of-type(3), td:nth-of-type(3)")) {
            t.hidden = hidden;
        }
    }

    toggleShowUrlsForChapterRange(select, chapters) {
        
        select.onchange = null;
        let memberForTextOption = ChapterUrlsUI.textToShowInRange();
        for (let o of [...select.querySelectorAll("Option")]) {
            o.text = chapters[o.index][memberForTextOption];
        }
        let selectedIndex = select.selectedIndex;
        select.selectedIndex = selectedIndex;
        select.onchange = ChapterUrlsUI.onRangeChanged;
    }

    /** 
    * @private
    */
    setEditInputMode() {
        this.usingTable = false;
        ChapterUrlsUI.setVisibileUI(this.usingTable);
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
        if (ChapterUrlsUI.ConsecutiveRowClicks == 5) {
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

    static Filters = {
        filterTermsFrequency: {},
        chapterList: {},
        init() {
            let rc = new ChapterUrlsUI.RangeCalculator();
            var filterTermsFrequency = {};
            let constantTerms = false; // To become a collection of all terms used in every link.
            var chapterList = ChapterUrlsUI.getTableRowsWithChapters().filter(item => rc.rowInRange(item)).map(item => {
                let filterObj = 
                { 
                    row: item, 
                    values: Array.from(item.querySelectorAll("td")).map(item => item.innerText).join("/").split("/"),
                    valueString: ""
                };
                filterObj.values.push(item.querySelector("input[type='text']").value);
                filterObj.values = filterObj.values.filter(item => item.length > 3 && !item.startsWith("http"));
                filterObj.valueString = filterObj.values.join(" ");
                
                let recordFilterTerms = filterObj.valueString.toLowerCase().split(" ");
                recordFilterTerms.forEach(item => {
                    filterTermsFrequency[item] = (parseInt(filterTermsFrequency[item]) || 0) + 1;
                });

                if (!constantTerms)
                {
                    constantTerms = recordFilterTerms;
                }
                else
                {
                    constantTerms.filter(item => recordFilterTerms.indexOf(item) == -1).forEach(item =>{
                        constantTerms.splice(constantTerms.indexOf(item), 1);
                    });
                }

                return filterObj;
            });
            let minFilterTermCount = Math.min( 3, chapterList.length * 0.10 );
            filterTermsFrequency = Object.keys(filterTermsFrequency)
                .filter(key => constantTerms.indexOf(key) == -1 && filterTermsFrequency[key] > minFilterTermCount)
                .map(key => ({ key: key, value: filterTermsFrequency[key] } ));

            var calcValue = function (filterTerm) {
                return filterTerm.value * filterTerm.key.length;
            };

            this.filterTermsFrequency = filterTermsFrequency.sort((a, b) => {
                var hasHigherValue = calcValue(a) < calcValue(b);
                var hasEqualValue = calcValue(a) == calcValue(b);
                return hasHigherValue ? 1 : hasEqualValue ? 0 : -1;
            });
            this.chapterList = chapterList;
        },
        Filter() {
            let rc = new ChapterUrlsUI.RangeCalculator();
            let formResults = Object.fromEntries(new FormData(document.getElementById("sbFiltersForm")));
            let formKeys = Object.keys(formResults);
            formResults = formKeys.filter(key => key.indexOf("Hidden") == -1)
                .map(key => {
                    return {
                        key: key,
                        searchType: formResults[key],
                        value: formResults[`${key}Hidden`]
                    };
                });

            let includeChaps = null;
            let excludeChaps = null;
            if (formResults.filter(item => item.searchType == 1).length > 0)
            {
                includeChaps = new RegExp(formResults.filter(item => item.searchType == 1).map(item => item.value).join("|"), "i");
            }
            if (formResults.filter(item => item.searchType == -1).length > 0)
            {
                excludeChaps = new RegExp(formResults.filter(item => item.searchType == -1).map(item => item.value).join("|"), "i");
            }

            ChapterUrlsUI.Filters.chapterList.forEach(item =>{
                let showChapter = rc.rowInRange(item.row);
                if (includeChaps)
                {
                    showChapter = showChapter && includeChaps.test(item.valueString);
                }
                if (excludeChaps)
                {
                    showChapter = showChapter && !excludeChaps.test(item.valueString);
                }
                ChapterUrlsUI.setRowCheckboxState(item.row, showChapter);
                item.row.hidden = !showChapter;
            });
            document.getElementById("spanChapterCount").textContent = ChapterUrlsUI.Filters.chapterList.filter(item => !item.row.hidden).length;
        },
        generateFiltersTable() {
            let retVal = document.createElement("table");

            let onClickEvent = function(event) {
                if (event == undefined || event == null) {
                    return;
                }

                if (event.target.classList.contains("exclude"))
                {
                    event.target.checked = false;
                    event.target.classList.remove("exclude");
                    event.target.value = 1;
                }
                else if (!event.target.indeterminate && !event.target.checked)
                {
                    event.target.value = -1;
                    event.target.checked = true;
                    event.target.indeterminate = true;
                    event.target.classList.add("exclude");
                }

                ChapterUrlsUI.Filters.Filter();
            };

            let row = document.createElement("tr");
            let col = document.createElement("td");
            let checkboxId = "chkFilterText";
            let el = document.createElement("input");
            el.type = "checkbox";
            el.name = checkboxId;
            el.id = checkboxId;
            el.value = 1;
            el.onclick = onClickEvent;
            el.onchange = function(event){
                if (event == undefined || event == null) {
                    return;
                }
                event.target.parentElement.nextElementSibling.firstChild.disabled = !event.target.checked;
                ChapterUrlsUI.Filters.Filter();
            }
            col.appendChild(el);
            row.appendChild(col);
            col = document.createElement("td");
            el = document.createElement("input");
            el.type = "text";
            el.disabled = true;
            el.id = checkboxId + "Text";
            el.onchange = function(event) { event.target.nextElementSibling.value = event.target.value; ChapterUrlsUI.Filters.Filter(); };
            col.appendChild(el);
            el = document.createElement("input");
            el.type = "hidden";
            el.id = checkboxId + "Hidden";
            el.name = checkboxId + "Hidden";
            col.appendChild(el);
            row.appendChild(col);

            retVal.appendChild(row);

            ChapterUrlsUI.Filters.filterTermsFrequency.forEach((value, id) => {
                row = document.createElement("tr");
                col = document.createElement("td");
                col.setAttribute("width", "10px");
                
                checkboxId = "chkFilter" + id;
                let el = document.createElement("input");
                el.type = "checkbox";
                el.name = checkboxId;
                el.id = checkboxId;
                el.value = 1;
                el.onclick = onClickEvent;
                col.appendChild(el);
                
                el = document.createElement("input");
                el.type = "hidden";
                el.name = checkboxId+"Hidden";
                el.value = value.key;
                col.appendChild(el);
                row.appendChild(col);

                col = document.createElement("td");
                el = document.createElement("label");
                el.innerText = value.key;
                el.id = checkboxId + "Label";
                el.setAttribute("for", checkboxId);
                el.setAttribute("width", "100%");
                col.appendChild(el);
                row.appendChild(col);

                retVal.appendChild(row);
            });
            retVal.setAttribute("width", "100%");
            return retVal;
        }
    }
}
ChapterUrlsUI.RangeCalculator = class {
    constructor()
    {
        this.startIndex = ChapterUrlsUI.selectionToRowIndex(ChapterUrlsUI.getRangeStartChapterSelect());
        this.endIndex = ChapterUrlsUI.selectionToRowIndex(ChapterUrlsUI.getRangeEndChapterSelect());
    }
    rowInRange(row) {
        let index = row.rowIndex;
        return (this.startIndex <= index) && (index <= this.endIndex);
    }
}



ChapterUrlsUI.DOWNLOAD_STATE_NONE = 0;
ChapterUrlsUI.DOWNLOAD_STATE_DOWNLOADING = 1;
ChapterUrlsUI.DOWNLOAD_STATE_LOADED = 2;
ChapterUrlsUI.DOWNLOAD_STATE_SLEEPING = 3;
ChapterUrlsUI.ImageForState = [
    "images/ChapterStateNone.svg",
    "images/ChapterStateDownloading.svg",
    "images/ChapterStateLoaded.svg",
    "images/ChapterStateSleeping.svg"
];

ChapterUrlsUI.lastSelectedRow = null;
ChapterUrlsUI.ConsecutiveRowClicks = 0;

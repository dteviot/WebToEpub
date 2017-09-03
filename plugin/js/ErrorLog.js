"use strict";

class ErrorLog {
    constructor() {
    }

    static log(error) {
        ErrorLog.showErrorMessage(error);
    }

    static showErrorMessage(msg) {
        // if already showing an error message, queue the new one to display
        // when currently showing is closed.
        ErrorLog.queue.push(msg);
        if (1 < ErrorLog.queue.length) {
            return;
        };

        let sections = ErrorLog.hideAllSectionsSavingVisibility();
        ErrorLog.getErrorSection().hidden = false;

        ErrorLog.setErrorMessageText(msg);
        ErrorLog.setErrorMessageButtons(msg, sections);
    }

    static onCloseError(sections) {
        ErrorLog.queue.shift();
        if (ErrorLog.queue.length === 0) {
            ErrorLog.restoreSectionVisibility(sections);
        } else {
            ErrorLog.setErrorMessageText(ErrorLog.queue[0]);
            ErrorLog.setErrorMessageButtons(ErrorLog.queue[0], sections);
        };
    }

    static dumpHistory() {
        let errors = ErrorLog.history.join("\r\n\r\n");
        ErrorLog.history = [];
        return errors;
    }

    /** private */
    static getErrorSection() {
        return document.getElementById("errorSection");
    }

    /** private */
    static hideAllSectionsSavingVisibility() {
        let sections = new Map();
        for(let section of document.querySelectorAll("section")) {
            sections.set(section, section.hidden);
            section.hidden = true;
        };
        return sections;
    }

    /** private */
    static setErrorMessageText(msg) {
        let textRow = document.getElementById("errorMessageText");
        if (typeof (msg) === "string") {
            textRow.textContent = msg ;
        } else {
            // assume msg is some sort of error object
            textRow.textContent = msg.message + " " + msg.stack;
        }
        ErrorLog.history.push(textRow.textContent);
    }

    /** private */
    static setErrorMessageButtons(msg, sections) {
        let close = () => ErrorLog.onCloseError(sections);
        let okButton = document.getElementById("errorButtonOk");
        let retryButton = document.getElementById("errorButtonRetry");
        let cancelButton = document.getElementById("errorButtonCancel");
        if (msg.retryAction !== undefined) {
            okButton.hidden = true;
            retryButton.hidden = false;
            retryButton.onclick = function() {
                close();
                msg.retryAction();
            };
            cancelButton.hidden = false;
            cancelButton.onclick = function() {
                close();
                msg.cancelAction();
            };
        } else {
            okButton.hidden = false;
            okButton.onclick = close;
            retryButton.hidden = true;
            cancelButton.hidden = true;
        }
    }

    /** private */
    static restoreSectionVisibility(sections) {
        for(let [key,value] of sections) {
            key.hidden = value;
        };
    }
}

ErrorLog.queue = [];
ErrorLog.history = [];

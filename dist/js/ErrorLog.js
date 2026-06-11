"use strict";

class ErrorLog {
    constructor() {
    }
    static SuppressErrorLog =  false;

    static log(error) {
        ErrorLog.history.push(ErrorLog.getMsgText(error));
    }

    static showErrorMessage(msg) {
        // if already showing an error message, queue the new one to display
        // when currently showing is closed. 
        if (this.SuppressErrorLog && msg.retryAction == null) {
            return;
        }
        ErrorLog.queue.push(msg);
        if (1 < ErrorLog.queue.length) {
            return;
        }

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
        }
    }

    static showLogToUser() {
        let history = ErrorLog.dumpHistory();
        if (!util.isNullOrEmpty(history)) {
            ErrorLog.showErrorMessage(history);
        }
    }

    static clearHistory() {
        ErrorLog.history = [];
    }

    static dumpHistory() {
        let errors = ErrorLog.history.join("\r\n\r\n");
        return errors;
    }

    /** private */
    static getErrorSection() {
        return document.getElementById("errorSection");
    }

    /** private */
    static hideAllSectionsSavingVisibility() {
        let sections = new Map();
        for (let section of document.querySelectorAll("section")) {
            sections.set(section, section.hidden);
            section.hidden = true;
        }
        return sections;
    }

    /** private */
    static setErrorMessageText(msg) {
        let textRow = document.querySelector("#errorMessageText pre");
        textRow.textContent = ErrorLog.getMsgText(msg);
    }

    static getMsgText(msg) {
        if (typeof (msg) === "string") {
            return msg;
        } else {
            // assume msg is some sort of error object
            let retVal = "" + msg.stack;
            if (!retVal.includes(msg.message)) {
                retVal = msg.message + " " + retVal;
            }
            return retVal;
        }
    }

    /** private */
    static setErrorMessageButtons(msg, sections) {
        let close = () => ErrorLog.onCloseError(sections);
        let okButton = document.getElementById("errorButtonOk");
        let retryButton = document.getElementById("errorButtonRetry");
        let cancelButton = document.getElementById("errorButtonCancel");
        let OpenURLButton = document.getElementById("errorButtonOpenURL");
        let BlockURLButton = document.getElementById("errorButtonBlockURL");
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
            cancelButton.textContent = UIText.Common.cancel;
            if (msg.cancelLabel !== undefined) {
                cancelButton.textContent =  msg.cancelLabel;
            }
            if (msg.openurl !== undefined) {
                OpenURLButton.hidden = false;
                OpenURLButton.onclick = function() {
                    //window.open(new URL(msg.openurl), "_blank").focus();
                    //use chrome.tabs.create to prevent auto popup block from browser
                    chrome.tabs.create({ url: msg.openurl});
                };
                BlockURLButton.hidden = false;
                BlockURLButton.onclick = function() {
                    close();
                    BlockedHostNames.add(new URL(msg.blockurl).hostname);
                    msg.cancelAction();
                };
            } else {
                OpenURLButton.hidden = true;
                BlockURLButton.hidden = true;
            }
        } else {
            okButton.hidden = false;
            okButton.onclick = close;
            retryButton.hidden = true;
            cancelButton.hidden = true;
            OpenURLButton.hidden = true;
            BlockURLButton.hidden = true;
        }
    }

    /** private */
    static restoreSectionVisibility(sections) {
        for (let [key,value] of sections) {
            key.hidden = value;
        }
    }
}

ErrorLog.queue = [];
ErrorLog.history = [];

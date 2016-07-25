/*
    User settings for how extension should behave
*/

"use strict";

class UserPreferences {
    constructor() {
        this.removeDuplicateImages = false;
        this.includeImageSourceUrl = true;
        this.higestResolutionImages = true;
        this.styleSheet = EpubMetaInfo.getDefaultStyleSheet();

        this.observers = [];
    };

    static readFromLocalStorage() {
        let newPreferences = new UserPreferences();
        newPreferences.readBooleanFromLocalStorage("removeDuplicateImages");
        newPreferences.readBooleanFromLocalStorage("includeImageSourceUrl");
        newPreferences.readBooleanFromLocalStorage("higestResolutionImages");
        newPreferences.readStringFromLocalStorage("styleSheet");
        return newPreferences;
    }

    writeToLocalStorage(name) {
        let that = this;
        that.writeFieldToLocalStorage("removeDuplicateImages");
        that.writeFieldToLocalStorage("includeImageSourceUrl");
        that.writeFieldToLocalStorage("higestResolutionImages");
        that.writeFieldToLocalStorage("styleSheet");
    }

    addObserver(observer) {
        this.observers.push(observer);
        this.notifyObserversOfChange();
    }

    readFieldFromLocalStorage(name) {
        this.checkNameExists(name);
        return window.localStorage.getItem(name);
    }

    readBooleanFromLocalStorage(name) {
        let test = this.readFieldFromLocalStorage(name);
        if (test !== null) {
            this[name] = (test === "true");
        }
    }

    readStringFromLocalStorage(name) {
        let test = this.readFieldFromLocalStorage(name);
        if (test !== null) {
            this[name] = test;
        }
    }

    checkNameExists(name) {
        if (typeof(this[name]) === "undefined") {
            throw new Error("Field (" + name + ") is not known" );
        }
    }

    writeFieldToLocalStorage(name) {
        let that = this;
        that.checkNameExists(name);
        window.localStorage.setItem(name, that[name]);
    }

    readFromUi() {
        let that = this;
        that.removeDuplicateImages = that.getRemoveDuplicateImagesUiControl().checked;
        that.includeImageSourceUrl = that.getIncludeImageSourceUrlUiControl().checked;
        that.higestResolutionImages = that.getHigestResolutionImagesUiControl().checked;
        that.styleSheet = that.getStylesheetUiControl().value;

        that.writeToLocalStorage();

        that.notifyObserversOfChange();
    }

    notifyObserversOfChange() {
        let that = this;
        for(let observer of that.observers) {
            observer.onUserPreferencesUpdate(that);
        };
    }

    writeToUi() {
        let that = this;
        that.getRemoveDuplicateImagesUiControl().checked = that.removeDuplicateImages;
        that.getIncludeImageSourceUrlUiControl().checked = that.includeImageSourceUrl;
        that.getHigestResolutionImagesUiControl().checked = that.higestResolutionImages;
        that.getStylesheetUiControl().value = that.styleSheet;
    }

    getRemoveDuplicateImagesUiControl() {
        return document.getElementById("removeDuplicateImages");
    }

    getIncludeImageSourceUrlUiControl() {
        return document.getElementById("includeImageSourceUrlCheckboxInput");
    }

    getHigestResolutionImagesUiControl() {
        return document.getElementById("higestResolutionImagesCheckboxInput");
    }

    getStylesheetUiControl() {
        return document.getElementById("stylesheetInput");
    }

    hookupUi() {
        let that = this;
        that.getRemoveDuplicateImagesUiControl().onclick = () => that.readFromUi();
        that.getIncludeImageSourceUrlUiControl().onclick = () => that.readFromUi();
        that.getHigestResolutionImagesUiControl().onclick = () => that.readFromUi();
        that.getStylesheetUiControl().addEventListener('blur', (e) => that.readFromUi(), true);

        that.notifyObserversOfChange();
    }
}

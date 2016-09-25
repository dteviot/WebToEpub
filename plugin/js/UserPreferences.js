/*
    User settings for how extension should behave
*/

"use strict";

class UserPreferences {
    constructor() {
        this.removeDuplicateImages = false;
        this.includeImageSourceUrl = true;
        this.higestResolutionImages = true;
        this.alwaysOpenAsTab = true;
        this.styleSheet = EpubMetaInfo.getDefaultStyleSheet();
        this.useSvgForImages = true;

        this.observers = [];
    };

    static readFromLocalStorage() {
        let newPreferences = new UserPreferences();
        newPreferences.readBooleanFromLocalStorage("removeDuplicateImages");
        newPreferences.readBooleanFromLocalStorage("includeImageSourceUrl");
        newPreferences.readBooleanFromLocalStorage("higestResolutionImages");
        newPreferences.readBooleanFromLocalStorage("alwaysOpenAsTab");
        newPreferences.readStringFromLocalStorage("styleSheet");
        newPreferences.readBooleanFromLocalStorage("useSvgForImages");
        return newPreferences;
    }

    writeToLocalStorage() {
        let that = this;
        that.writeFieldToLocalStorage("removeDuplicateImages");
        that.writeFieldToLocalStorage("includeImageSourceUrl");
        that.writeFieldToLocalStorage("higestResolutionImages");
        that.writeFieldToLocalStorage("alwaysOpenAsTab");
        that.writeFieldToLocalStorage("styleSheet");
        that.writeFieldToLocalStorage("useSvgForImages");
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
        that.alwaysOpenAsTab = that.getAlwaysOpenAsTabUiControl().checked;
        that.styleSheet = that.getStylesheetUiControl().value;
        that.useSvgForImages = that.getUseSvgForImagesUiControl().checked;

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
        that.getAlwaysOpenAsTabUiControl().checked = that.alwaysOpenAsTab;
        that.getStylesheetUiControl().value = that.styleSheet;
        that.getUseSvgForImagesUiControl().checked = that.useSvgForImages;
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

    getAlwaysOpenAsTabUiControl() {
        return document.getElementById("alwaysOpenAsTabInput");
    }

    getStylesheetUiControl() {
        return document.getElementById("stylesheetInput");
    }

    getUseSvgForImagesUiControl() {
        return document.getElementById("useSvgForImagesInput");
    }

    hookupUi() {
        let readFromUi = this.readFromUi.bind(this);
        this.getRemoveDuplicateImagesUiControl().onclick = readFromUi;
        this.getIncludeImageSourceUrlUiControl().onclick = readFromUi;
        this.getHigestResolutionImagesUiControl().onclick = readFromUi;
        this.getAlwaysOpenAsTabUiControl().onclick = readFromUi;
        this.getStylesheetUiControl().addEventListener("blur", readFromUi, true);
        this.getUseSvgForImagesUiControl().onclick = readFromUi;

        this.notifyObserversOfChange();
    }
}

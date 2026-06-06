
"use strict";

/**
   Code to manipulate the Progress Bar on the UI 
*/
class ProgressBar { // eslint-disable-line no-unused-vars
    constructor() {
    }

    static getUiElement() {
        return document.getElementById("fetchProgress");
    }

    static setValue(value) {
        let el = ProgressBar.getUiElement();
        if (el) {
            el.value = value;
            ProgressBar.updateText();
        }
    }

    static updateValue(increment) {
        let el = ProgressBar.getUiElement();
        if (el) {
            el.value += increment;
            ProgressBar.updateText();
        }
    }

    static setMax(max) {
        let el = ProgressBar.getUiElement();
        if (el) {
            el.max = max;
            ProgressBar.updateText();
        }
    }

    static updateText() {
        let element = ProgressBar.getUiElement();
        if (!element) return;
        let text = "";
        if (1 < element.max) {
            text = `${element.value}/${element.max}`;
            ProgressBar.updateTabTitle(element.value, element.max);
        }
        let progressString = document.getElementById("progressString");
        if (progressString) progressString.textContent = text;
    }

    static updateTabTitle(value, max) {
        value = (value*100/max).toFixed(1);
        if (value == "100.0") {
            value = "100";
        }
        document.title = value + "% WebToEpub";
    }
}

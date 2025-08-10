
"use strict";

/**
   Code to manipulate the Progress Bar on the UI 
*/
class ProgressBar {
    constructor() {
    }

    static getUiElement() {
        return document.getElementById("fetchProgress");
    }

    static setValue(value) {
        ProgressBar.getUiElement().value = value;
        ProgressBar.updateText();
    }

    static updateValue(increment) {
        ProgressBar.getUiElement().value += increment;
        ProgressBar.updateText();
    }

    static setMax(max) {
        ProgressBar.getUiElement().max = max;
        ProgressBar.updateText();
    }

    static updateText() {
        let element = ProgressBar.getUiElement();
        let text = "";
        if (1 < element.max) {
            text = `${element.value}/${element.max}`;
            ProgressBar.updateTabTitle(element.value, element.max);
        }
        document.getElementById("progressString").textContent = text;
    }

    static updateTabTitle(value, max) {
        value = (value*100/max).toFixed(1);
        if (value == "100.0") {
            value = "100";
        }
        document.title = value + "% WebToEpub";
    }
}

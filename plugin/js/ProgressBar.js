
"use strict";

/**
   Code to manipulate the Progress Bar on the UI 
*/
class ProgressBar {
    constructor() {
    };

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
        }
        document.getElementById("progressString").textContent = text;
    }
}

"use strict";

/** Class that handles UI for selecting cover image */
class CoverImageUI {
    constructor() {
    }

    static getImageTableElement() {
        return document.getElementById("imagesTable");
    }

    /** remove all images from the table of images to pick from */
    static clearImageTable() {
        let imagesTable = CoverImageUI.getImageTableElement();
        while (imagesTable.children.length > 0) {
            imagesTable.removeChild(imagesTable.children[imagesTable.children.length - 1])
        }
    }

    /** create table of images for user to pick from 
    * @param {array of ImageInfo} images to populate table with
    * @param {imageCollector} to notify of user's chosen image
    */
    static populateImageTable(images, imageCollector) {
        CoverImageUI.clearImageTable();
        let imagesTable = CoverImageUI.getImageTableElement();
        let checkBoxIndex = 0;
        if (0 === images.size) {
            imagesTable.parentElement.appendChild(document.createTextNode("No images found"));
        }
        else {
            images.forEach(function (imageInfo) {
                let row = document.createElement("tr");
        
                // add checkbox
                let checkbox = CoverImageUI.createCheckBoxAndLabel(imageInfo, checkBoxIndex, imageCollector);
                CoverImageUI.appendColumnToRow(row, checkbox);

                // add image
                let img = document.createElement("img");
                img.setAttribute("style", "max-height: 120px; width: auto; ");
                img.src = imageInfo.sourceUrl;
                CoverImageUI.appendColumnToRow(row, img);
                imagesTable.appendChild(row);

                ++checkBoxIndex;
            });
        }
    }

    /** adds row to the images table 
    * @private
    */
    static createCheckBoxAndLabel(imageInfo, checkBoxIndex, imageCollector) {
        let label = document.createElement("label");
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "setCoverCheckBox" + checkBoxIndex;
        checkbox.onclick = function() { CoverImageUI.onImageClicked(checkbox.id, imageInfo, imageCollector); };
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("Set Cover"));

        // default to first image as cover image
        if (checkBoxIndex === 0) {
            imageCollector.setCoverImage(imageInfo);
            checkbox.checked = true;
        }
        return label;
    }

    /** user has selected/unselected an image for cover
    * @private
    */
    static onImageClicked(checkboxId, imageInfo, imageCollector) {
        let checkbox = document.getElementById(checkboxId);
        if (checkbox.checked === true) {
            imageCollector.setCoverImage(imageInfo);

            // uncheck any other checked boxes
            let imagesTable = CoverImageUI.getImageTableElement();
            for(let box of util.getElements(imagesTable, "input")) {
                if (box.id !== checkboxId) {
                    box.checked = false;
                }
            }
        } else {
            imageCollector.setCoverImage(null);
        }
    } 

    static appendColumnToRow(row, element) {
        let col = document.createElement("td");
        col.appendChild(element);
        col.style.whiteSpace = "nowrap";
        row.appendChild(col);
        return col;
    }

    static onCoverFromUrlClick(enable, imageCollector) {
        if (enable) {
            imageCollector.setCoverImage(null);
            CoverImageUI.clearImageTable();
            CoverImageUI.addCoverFromUrlInputRow();
            imageCollector.coverUrlProvider = function () { 
                return document.getElementById("coverImageUrlInput").value 
            };
        } else {
            imageCollector.coverUrlProvider = null;
            imageCollector.populateImageTable();
        }
    }

    static addCoverFromUrlInputRow(urlProvider) {
        let row = document.createElement("tr");
        CoverImageUI.getImageTableElement().appendChild(row);
        CoverImageUI.appendColumnToRow(row, document.createTextNode("Cover Image URL:"));

        let inputUrl = document.createElement("input");
        inputUrl.type = "text";
        inputUrl.id = "coverImageUrlInput";
        inputUrl.size = 60;
        CoverImageUI.appendColumnToRow(row, inputUrl);
    }
}

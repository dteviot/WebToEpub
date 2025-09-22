"use strict";

/** Class that handles UI for selecting cover image */
class CoverImageUI { // eslint-disable-line no-unused-vars
    constructor() {
    }

    static getImageTableElement() {
        return document.getElementById("imagesTable");
    }

    /** return URL of image to use for cover, or NULL if no cover
    */
    static getCoverImageUrl() {
        let url = CoverImageUI.getCoverImageUrlInput().value;
        return util.isNullOrEmpty(url) ? null : url;
    }

    /** toggle visibility of the Cover Image URL input control
     * @param {bool} visible - show/hide control
    */
    static showCoverImageUrlInput(visible) {
        document.getElementById("coverUrlSection").hidden = !visible;
        document.getElementById("imagesTableDiv").hidden = visible;
    }

    /** clear all UI elements associated with selecting the Cover Image */
    static clearUI() {
        CoverImageUI.clearImageTable();
        CoverImageUI.setCoverImageUrl("");
    }

    /** remove all images from the table of images to pick from */
    static clearImageTable() {
        let imagesTable = CoverImageUI.getImageTableElement();
        while (imagesTable.children.length > 0) {
            imagesTable.removeChild(imagesTable.children[imagesTable.children.length - 1]);
        }
    }

    /** create table of images for user to pick from 
    * @param {array of ImageInfo} images to populate table with
    */
    static populateImageTable(images) {
        CoverImageUI.clearImageTable();
        let imagesTable = CoverImageUI.getImageTableElement();
        let checkBoxIndex = 0;
        if (0 === images.length) {
            imagesTable.parentElement.appendChild(document.createTextNode(UIText.CoverImage.noImagesFoundLabel));
        }
        else {
            images.forEach((imageInfo) => {
                let row = document.createElement("tr");
        
                // add checkbox
                let checkbox = CoverImageUI.createCheckBoxAndLabel(imageInfo.sourceUrl, checkBoxIndex);
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
    static createCheckBoxAndLabel(sourceUrl, checkBoxIndex) {
        let label = document.createElement("label");
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "setCoverCheckBox" + checkBoxIndex;
        checkbox.onclick = () => { CoverImageUI.onImageClicked(checkbox.id, sourceUrl); };
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(UIText.CoverImage.setCover));

        // default to first image as cover image
        if (checkBoxIndex === 0) {
            CoverImageUI.setCoverImageUrl(sourceUrl);
            checkbox.checked = true;
        }
        return label;
    }

    /** user has selected/unselected an image for cover
    * @private
    */
    static onImageClicked(checkboxId, sourceUrl) {
        let checkbox = document.getElementById(checkboxId);
        if (checkbox.checked === true) {
            CoverImageUI.setCoverImageUrl(sourceUrl);

            // uncheck any other checked boxes
            let imagesTable = CoverImageUI.getImageTableElement();
            for (let box of imagesTable.querySelectorAll("input")) {
                if (box.id !== checkboxId) {
                    box.checked = false;
                }
            }
        } else {
            CoverImageUI.setCoverImageUrl(null);
        }
    } 

    /**
    * @private
    */
    static appendColumnToRow(row, element) {
        let col = document.createElement("td");
        col.appendChild(element);
        col.style.whiteSpace = "nowrap";
        row.appendChild(col);
        return col;
    }

    /**
    * @private
    * @todo  this should be moved to Baka-Tsuki, this logic is specific to B-T
    */
    static onCoverFromUrlClick(enable, images) {
        if (enable) {
            CoverImageUI.setCoverImageUrl(null);
            CoverImageUI.clearImageTable();
            CoverImageUI.showCoverImageUrlInput(true);
        } else {
            CoverImageUI.showCoverImageUrlInput(false);
            CoverImageUI.populateImageTable(images);
        }
    }

    /** user has selected/unselected an image for cover
    * @private
    */
    static getCoverImageUrlInput() {
        return document.getElementById("coverImageUrlInput");
    }

    /** @private */
    static getSampleCoverImg() {
        return document.getElementById("sampleCoverImg");
    }

    /** set URL of image to use for cover, or NULL if no cover
    * @public
    */
    static setCoverImageUrl(url) {
        let inputUrl = CoverImageUI.getCoverImageUrlInput();
        if (inputUrl.onchange == null) {
            inputUrl.onchange = CoverImageUI.showSampleImg;
        }
        inputUrl.value = url;
        CoverImageUI.getSampleCoverImg().src = url;
    }

    /** @private */
    static showSampleImg() {
        let url = CoverImageUI.getCoverImageUrlInput().value;
        let sampleImg = CoverImageUI.getSampleCoverImg();
        sampleImg.src = url;
    }
}

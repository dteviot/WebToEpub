/*
  parses www.nepustation.com
*/
"use strict";

parserFactory.register("nepustation.com", () => new NepustationParser());

class CryptEngine {
    constructor() {
        this.decryptTable = new Map();
    }

    buildLookup(cypherText, clearText) {
        for (let i = 0; i < clearText.length; ++i) {
            let cy = cypherText.charAt(i);
            let cl = clearText.charAt(i);
            if (this.decryptTable.get(cy) === undefined) {
                this.decryptTable.set(cy, cl);
            } else if (this.decryptTable.get(cy) !== cl) {
                throw new Error("Invalid conversion");
            }
        }
    }

    decryptString(cypherText) {
        return cypherText.split("").map(c => {
            let t = this.decryptTable.get(c);
            return (t === undefined) ? c : t;
        }).join("");
    }

}

CryptEngine.ALPHABET     = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
CryptEngine.NEPUALPHABET = "ḀḂḄḆḈḊḌḎḐḒḔḖḘḚḜḞḠḢḤḦḨḪḬḮḰḲ"+
                           "ḁḃḅḇḉḋḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳ";

class NepustationParser extends WordpressBaseParser {
    constructor() {
        super();
        this.cryptEngine = new CryptEngine();
        this.cryptEngine.buildLookup(CryptEngine.NEPUALPHABET, CryptEngine.ALPHABET);       
    }

    customRawDomToContentStep(chapter, content) {
        let walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        let engine = this.cryptEngine; 
        let node = null;
        while ((node = walker.nextNode())) {
            node.textContent = engine.decryptString(node.textContent);
        }
    }
}

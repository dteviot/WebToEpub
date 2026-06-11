
"use strict";


/** Functions to help debugging.  Not included in release product */
class DebugUtil { // eslint-disable-line no-unused-vars
    constructor() {
    }

    static byteToHex(e) {
        let temp = "0" + e.toString(16);
        return temp.substring(temp.length - 2);
    }

    static bufToHex(buf) {
        return new Uint8Array(buf)
            .reduce((p, c) => p + DebugUtil.byteToHex(c), "");
    }
}


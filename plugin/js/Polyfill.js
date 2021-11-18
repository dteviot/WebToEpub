
"use strict";

// This is required because the setImmediate polyfill used by jszip lib doesn't work correctly.
// Refer https://github.com/dteviot/WebToEpub/issues/603 for more detail
window.setImmediate = (fn) => {fn();};        // eslint-disable-line no-unused-vars

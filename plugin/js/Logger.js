"use strict";

/**
 * Logger - Unified logging utility for WebToEpub.
 * Provides a central point for all logging, allowing for better control
 * over log levels and output destinations.
 */
const Logger = (function() {
    const LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    let currentLevel = LEVELS.INFO;

    return {
        LEVELS: LEVELS,

        setLevel: function(level) {
            currentLevel = level;
        },

        debug: function(...args) {
            if (currentLevel <= LEVELS.DEBUG) {
                console.log("[DEBUG]", ...args);
            }
        },

        info: function(...args) {
            if (currentLevel <= LEVELS.INFO) {
                console.log("[INFO]", ...args);
            }
        },

        warn: function(...args) {
            if (currentLevel <= LEVELS.WARN) {
                console.warn("[WARN]", ...args);
            }
        },

        error: function(...args) {
            if (currentLevel <= LEVELS.ERROR) {
                console.error("[ERROR]", ...args);
            }
        }
    };
})();

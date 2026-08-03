"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(component) {
    return {
        info: (message, meta) => {
            console.log(`[${component}] INFO: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
        },
        error: (message, error) => {
            console.error(`[${component}] ERROR: ${message}`, error);
        },
        warn: (message, meta) => {
            console.warn(`[${component}] WARN: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
        },
        debug: (message, meta) => {
            console.debug(`[${component}] DEBUG: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
        },
    };
}

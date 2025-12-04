"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
function errorHandler(err, _req, res, _next) {
    console.error(err);
    if (res.headersSent)
        return;
    res.status(500).json({ error: "internal_error" });
}
exports.errorHandler = errorHandler;
